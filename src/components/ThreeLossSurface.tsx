import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Terrain, TrajectoryResult } from '../types';
import { RotateCcw, Eye, Maximize2, Layers } from 'lucide-react';

interface Props {
  terrain: Terrain;
  trajectories: TrajectoryResult[];
  activeStep: number;
  onSelectPoint?: (x: number, y: number) => void;
  selectedPoint: [number, number];
}

export const ThreeLossSurface: React.FC<Props> = ({
  terrain,
  trajectories,
  activeStep,
  onSelectPoint,
  selectedPoint,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);

  const [wireframe, setWireframe] = useState(false);
  const [heightScale, setHeightScale] = useState(0.35);
  const [showMesh, setShowMesh] = useState(true);

  // Mouse interaction state
  const isDragging = useRef(false);
  const previousMousePosition = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight || 450;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf8fafc); // Slate 50 clean backdrop
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(12, 16, 20);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    rendererRef.current = renderer;

    // Clear previous canvas
    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(15, 25, 15);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0x38bdf8, 0.3); // Soft cyan rim light
    backLight.position.set(-15, -10, -15);
    scene.add(backLight);

    // Grid Floor
    const gridHelper = new THREE.GridHelper(16, 16, 0xcb3a2, 0xe2e8f0);
    gridHelper.position.y = -0.05;
    scene.add(gridHelper);

    // Render loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    // Resize observer
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight || 450;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.current);

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (rendererRef.current && rendererRef.current.domElement) {
        rendererRef.current.dispose();
      }
    };
  }, []);

  // Update Surface Mesh when Terrain, heightScale, or wireframe changes
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove existing surface meshes
    const existingMesh = scene.getObjectByName('surfaceMesh');
    if (existingMesh) scene.remove(existingMesh);

    if (!showMesh) return;

    const bounds = terrain.bounds;
    const range = bounds[1] - bounds[0];
    const segs = 70;

    const geometry = new THREE.PlaneGeometry(12, 12, segs, segs);
    geometry.rotateX(-Math.PI / 2);

    const posAttr = geometry.attributes.position;
    const colors: number[] = [];

    // Find max / min loss for color normalization
    let maxL = -Infinity;
    let minL = Infinity;
    const lossValues: number[] = [];

    for (let i = 0; i < posAttr.count; i++) {
      const xPlane = posAttr.getX(i);
      const zPlane = posAttr.getZ(i);

      // Map plane coordinates (-6 to +6) to function bounds
      const x = bounds[0] + ((xPlane + 6) / 12) * range;
      const y = bounds[0] + ((zPlane + 6) / 12) * range;

      let loss = terrain.fn(x, y);
      if (isNaN(loss) || !isFinite(loss)) loss = 100;

      // Cap extreme loss values for visual balance
      loss = Math.min(loss, 150);

      lossValues.push(loss);
      if (loss > maxL) maxL = loss;
      if (loss < minL) minL = loss;
    }

    const lossSpan = maxL - minL || 1;

    for (let i = 0; i < posAttr.count; i++) {
      const loss = lossValues[i];
      const normLoss = Math.min(1, Math.max(0, (loss - minL) / lossSpan));

      // Elevate Y coordinate according to height scale
      const yElev = Math.min(10, normLoss * 8 * heightScale);
      posAttr.setY(i, yElev);

      // Height Color gradient: Deep Cyan/Blue -> Teal -> Emerald -> Gold -> Rose Red
      const color = new THREE.Color();
      if (normLoss < 0.25) {
        color.setHSL(0.6 - normLoss * 0.4, 0.8, 0.45);
      } else if (normLoss < 0.6) {
        color.setHSL(0.5 - (normLoss - 0.25) * 0.8, 0.85, 0.5);
      } else {
        color.setHSL(0.12 - (normLoss - 0.6) * 0.3, 0.9, 0.55);
      }

      colors.push(color.r, color.g, color.b);
    }

    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      wireframe: wireframe,
      side: THREE.DoubleSide,
      roughness: 0.3,
      metalness: 0.1,
      transparent: true,
      opacity: 0.92,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'surfaceMesh';
    mesh.receiveShadow = true;
    mesh.castShadow = true;
    scene.add(mesh);
  }, [terrain, heightScale, wireframe, showMesh]);

  // Update Trajectory Paths & Markers in 3D
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove old trajectory objects
    const oldGroup = scene.getObjectByName('trajectoryGroup');
    if (oldGroup) scene.remove(oldGroup);

    const trajGroup = new THREE.Group();
    trajGroup.name = 'trajectoryGroup';

    const bounds = terrain.bounds;
    const range = bounds[1] - bounds[0];

    // Map 2D world coord (x, y) to 3D Plane coord (x3d, y3d, z3d)
    const mapTo3D = (wx: number, wy: number) => {
      const x3d = ((wx - bounds[0]) / range) * 12 - 6;
      const z3d = ((wy - bounds[0]) / range) * 12 - 6;

      let loss = terrain.fn(wx, wy);
      if (isNaN(loss) || !isFinite(loss)) loss = 100;
      loss = Math.min(loss, 150);

      // Approximate min/max loss height scaling
      const y3d = Math.min(10, (loss / 20) * 8 * heightScale) + 0.12; // slight float offset
      return new THREE.Vector3(x3d, y3d, z3d);
    };

    // Render Starting Point Marker
    if (selectedPoint) {
      const startPos = mapTo3D(selectedPoint[0], selectedPoint[1]);
      const startGeo = new THREE.SphereGeometry(0.25, 16, 16);
      const startMat = new THREE.MeshBasicMaterial({ color: 0x0284c7 }); // Bright sky blue
      const startMesh = new THREE.Mesh(startGeo, startMat);
      startMesh.position.copy(startPos);

      // Pulsing ring around start point
      const ringGeo = new THREE.RingGeometry(0.35, 0.45, 32);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x38bdf8,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.8,
      });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      ringMesh.position.copy(startPos);

      trajGroup.add(startMesh);
      trajGroup.add(ringMesh);
    }

    // Render trajectories
    trajectories.forEach((traj) => {
      const visibleHistory = traj.history.slice(0, activeStep + 1);
      if (visibleHistory.length === 0) return;

      const points3D = visibleHistory.map((pt) => mapTo3D(pt.x, pt.y));

      if (points3D.length > 1) {
        // Curve Line
        const curve = new THREE.CatmullRomCurve3(points3D);
        const tubeGeo = new THREE.TubeGeometry(curve, points3D.length * 4, 0.08, 8, false);
        const tubeMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(traj.color),
          roughness: 0.2,
          metalness: 0.5,
          emissive: new THREE.Color(traj.color),
          emissiveIntensity: 0.3,
        });
        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        trajGroup.add(tubeMesh);
      }

      // Step Sphere Markers
      visibleHistory.forEach((pt, idx) => {
        const isCurrent = idx === visibleHistory.length - 1;
        const radius = isCurrent ? 0.22 : 0.09;
        const sphereGeo = new THREE.SphereGeometry(radius, 12, 12);
        const sphereMat = new THREE.MeshStandardMaterial({
          color: new THREE.Color(traj.color),
          emissive: new THREE.Color(traj.color),
          emissiveIntensity: isCurrent ? 0.6 : 0.1,
        });
        const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
        sphereMesh.position.copy(points3D[idx]);
        trajGroup.add(sphereMesh);
      });
    });

    scene.add(trajGroup);
  }, [trajectories, activeStep, terrain, heightScale, selectedPoint]);

  // Orbit camera drag handling
  const handleMouseDown = (e: React.MouseEvent) => {
    isDragging.current = true;
    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging.current || !cameraRef.current) return;

    const deltaX = e.clientX - previousMousePosition.current.x;
    const deltaY = e.clientY - previousMousePosition.current.y;

    const camera = cameraRef.current;
    const spherical = new THREE.Spherical();
    spherical.setFromVector3(camera.position);

    spherical.theta -= deltaX * 0.008;
    spherical.phi -= deltaY * 0.008;

    // Clamp phi to prevent flip over
    spherical.phi = Math.max(0.1, Math.min(Math.PI / 2 - 0.05, spherical.phi));

    camera.position.setFromSpherical(spherical);
    camera.lookAt(0, 0, 0);

    previousMousePosition.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseUp = () => {
    isDragging.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (!cameraRef.current) return;
    const camera = cameraRef.current;
    const spherical = new THREE.Spherical();
    spherical.setFromVector3(camera.position);

    spherical.radius += e.deltaY * 0.02;
    spherical.radius = Math.max(5, Math.min(50, spherical.radius));

    camera.position.setFromSpherical(spherical);
    camera.lookAt(0, 0, 0);
  };

  const resetCamera = () => {
    if (!cameraRef.current) return;
    cameraRef.current.position.set(12, 16, 20);
    cameraRef.current.lookAt(0, 0, 0);
  };

  return (
    <div className="relative w-full h-full min-h-[420px] bg-slate-50 rounded-xl overflow-hidden border border-slate-200/80 shadow-sm flex flex-col">
      {/* 3D Canvas Top Control Overlay */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm text-xs font-medium text-slate-700">
        <Layers className="w-3.5 h-3.5 text-indigo-600" />
        <span>3D 损失曲面 (3D Loss Surface)</span>
      </div>

      <div className="absolute top-3 right-3 z-10 flex items-center gap-2 bg-white/90 backdrop-blur-md px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-sm text-xs">
        <button
          onClick={() => setWireframe(!wireframe)}
          className={`px-2 py-1 rounded transition ${
            wireframe ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="切换网格线"
        >
          网格线
        </button>
        <button
          onClick={() => setShowMesh(!showMesh)}
          className={`px-2 py-1 rounded transition ${
            showMesh ? 'bg-indigo-100 text-indigo-700 font-semibold' : 'text-slate-600 hover:bg-slate-100'
          }`}
          title="显示/隐藏曲面"
        >
          <Eye className="w-3.5 h-3.5 inline mr-1" />
          曲面
        </button>
        <button
          onClick={resetCamera}
          className="p-1 text-slate-600 hover:bg-slate-100 rounded transition"
          title="重置视角"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main WebGL Container */}
      <div
        ref={containerRef}
        className="w-full flex-1 cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      />

      {/* Height Scale Floating Controller */}
      <div className="absolute bottom-3 left-3 z-10 bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm flex items-center gap-3 text-xs text-slate-600">
        <span className="font-medium text-slate-700">山体坡度:</span>
        <input
          type="range"
          min="0.1"
          max="0.8"
          step="0.05"
          value={heightScale}
          onChange={(e) => setHeightScale(parseFloat(e.target.value))}
          className="w-24 accent-indigo-600 cursor-pointer"
        />
        <span className="w-8 text-right font-mono text-[11px]">{(heightScale * 100).toFixed(0)}%</span>
      </div>

      {/* Interactive Drag Hint */}
      <div className="absolute bottom-3 right-3 z-10 bg-white/80 backdrop-blur-sm px-2.5 py-1 rounded text-[11px] text-slate-500 pointer-events-none">
        按住鼠标拖拽旋转 • 滚轮缩放视角
      </div>
    </div>
  );
};
