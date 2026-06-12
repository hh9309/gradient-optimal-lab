/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useRef, PointerEvent } from "react";
import { FormulaPreset, RunResult, OptimizationStep, OptimizerConfig } from "../types";
import { Play, Pause, RotateCcw, Compass, Layers, Minimize2, Sliders, Activity } from "lucide-react";

interface VisualizerPanelProps {
  preset: FormulaPreset;
  activeResult: RunResult | null;
  allResults: RunResult[];
  selectedStepIndex: number;
  onSelectStep: (index: number) => void;
  isLoading: boolean;
  config: OptimizerConfig;
  isAnimating: boolean;
  setIsAnimating: (animating: boolean) => void;
  onStartOptimization?: () => void;
}

export function VisualizerPanel({
  preset,
  activeResult,
  allResults,
  selectedStepIndex,
  onSelectStep,
  isLoading,
  config,
  isAnimating,
  setIsAnimating,
  onStartOptimization
}: VisualizerPanelProps) {
  const [viewMode, setViewMode] = useState<"2d" | "3d" | "taylor">("2d");
  const [showGradientField, setShowGradientField] = useState(true);
  const [showOptimizerRace, setShowOptimizerRace] = useState(true);
  const [autoRecenter, setAutoRecenter] = useState(true);
  const [rotationTheta, setRotationTheta] = useState(45); // 3D rotation angle
  const [rotationPhi, setRotationPhi] = useState(35); // 3D tilt angle
  const [animationStep, setAnimationStep] = useState<number | null>(null);
  const [hoveredCoords, setHoveredCoords] = useState<{ x: number, y: number, z: number, sx: number, sy: number } | null>(null);
  const [isDragging3D, setIsDragging3D] = useState(false);
  const [playMode, setPlayMode] = useState<"math" | "physics">("math");
  const [taylorViewRadius, setTaylorViewRadius] = useState(1.4); // Zoom size/Radius for Taylor viewer

  const tickRef = useRef<number>(0);
  const physicsXRef = useRef<number>(config.initialX);
  const physicsYRef = useRef<number>(config.initialY);
  const physicsVxRef = useRef<number>(0);
  const physicsVyRef = useRef<number>(0);
  const physicsPathRef = useRef<{ x: number, y: number, loss: number }[]>([]);

  const isDraggingRef = useRef(false);
  const dragStartRef = useRef({ x: 0, y: 0 });
  const dragStartRotRef = useRef({ theta: 45, phi: 35 });
  
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);

  const handlePointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (viewMode === "3d") {
      e.currentTarget.setPointerCapture(e.pointerId);
      isDraggingRef.current = true;
      setIsDragging3D(true);
      dragStartRef.current = { x: e.clientX, y: e.clientY };
      dragStartRotRef.current = { theta: rotationTheta, phi: rotationPhi };
    }
  };

  const handlePointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    
    // Scale standard screen client positions to the internal canvas resolution width (520) & height (420)
    const scaleX = rect.width > 0 ? (canvas.width / rect.width) : 1;
    const scaleY = rect.height > 0 ? (canvas.height / rect.height) : 1;
    const sx = (e.clientX - rect.left) * scaleX;
    const sy = (e.clientY - rect.top) * scaleY;

    const w = canvas.width;
    const h = canvas.height;

    if (viewMode === "3d" && isDraggingRef.current) {
      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;
      
      let nextTheta = (dragStartRotRef.current.theta - dx * 0.6) % 360;
      if (nextTheta < 0) nextTheta += 360;
      const nextPhi = Math.max(10, Math.min(80, dragStartRotRef.current.phi + dy * 0.6));
      
      setRotationTheta(Math.round(nextTheta));
      setRotationPhi(Math.round(nextPhi));
      return;
    }

    if (sx >= 0 && sx <= w && sy >= 0 && sy <= h) {
      let lx = 0;
      let ly = 0;
      if (viewMode === "2d") {
        lx = toLogicalX(sx, w);
        ly = toLogicalY(sy, h);
      } else if (viewMode === "taylor") {
        if (activeResult && activeResult.steps.length > 0) {
          const stepIdx = animationStep !== null ? animationStep : selectedStepIndex;
          const clampedIdx = Math.min(stepIdx, activeResult.steps.length - 1);
          const centerStep = activeResult.steps[clampedIdx];
          if (centerStep) {
            const x0 = centerStep.x;
            const y0 = centerStep.y;
            const viewSize = 1.0;
            lx = (x0 - viewSize) + (sx / w) * (2 * viewSize);
            ly = (y0 - viewSize) + ((h - sy) / h) * (2 * viewSize);
          }
        }
      } else {
        setHoveredCoords(null);
        return;
      }
      
      const lz = preset.f(lx, ly);
      if (!isNaN(lz) && isFinite(lz)) {
        setHoveredCoords({ x: lx, y: ly, z: lz, sx, sy });
      } else {
        setHoveredCoords(null);
      }
    } else {
      setHoveredCoords(null);
    }
  };

  const handlePointerUp = (e: PointerEvent<HTMLCanvasElement>) => {
    if (viewMode === "3d") {
      e.currentTarget.releasePointerCapture(e.pointerId);
      isDraggingRef.current = false;
      setIsDragging3D(false);
    }
  };

  const handlePointerLeave = () => {
    setHoveredCoords(null);
    if (viewMode === "3d" && isDraggingRef.current) {
      isDraggingRef.current = false;
      setIsDragging3D(false);
    }
  };

  // Set ranges based on preset
  // Dynamically compute the viewport boundaries so that the trajectories
  // are beautifully and spaciously centered in the visual canvas!
  let minX = preset.rangeX[0];
  let maxX = preset.rangeX[1];
  let minY = preset.rangeY[0];
  let maxY = preset.rangeY[1];

  let hasValidResults = false;
  const xs: number[] = [];
  const ys: number[] = [];

  const currentStepLimit = animationStep !== null ? animationStep : selectedStepIndex;

  if (allResults && allResults.length > 0) {
    allResults.forEach((run) => {
      if (run.steps.length === 0) return;
      const maxIdx = (autoRecenter && currentStepLimit !== null)
        ? Math.min(currentStepLimit, run.steps.length - 1)
        : run.steps.length - 1;

      for (let idx = 0; idx <= maxIdx; idx++) {
        const step = run.steps[idx];
        if (step && Math.abs(step.x) < 100 && Math.abs(step.y) < 100) {
          xs.push(step.x);
          ys.push(step.y);
          hasValidResults = true;
        }
      }
    });
  }

  // Fallback to activeResult if allResults is not working
  if (!hasValidResults && activeResult && activeResult.steps.length > 0) {
    const maxIdx = (autoRecenter && currentStepLimit !== null)
      ? Math.min(currentStepLimit, activeResult.steps.length - 1)
      : activeResult.steps.length - 1;

    for (let idx = 0; idx <= maxIdx; idx++) {
      const step = activeResult.steps[idx];
      if (step && Math.abs(step.x) < 100 && Math.abs(step.y) < 100) {
        xs.push(step.x);
        ys.push(step.y);
        hasValidResults = true;
      }
    }
  }

  if (hasValidResults && xs.length > 0 && ys.length > 0) {
    // Include global minima of preset for full perspective only if autoRecenter is disabled
    if (!autoRecenter && preset.globalMinima) {
      preset.globalMinima.forEach(([mx, my]) => {
        xs.push(mx);
        ys.push(my);
      });
    }

    let actMinX = Math.min(...xs);
    let actMaxX = Math.max(...xs);
    let actMinY = Math.min(...ys);
    let actMaxY = Math.max(...ys);

    // Padding span to make sure the paths are not cut off at borders
    let spanX = actMaxX - actMinX;
    let spanY = actMaxY - actMinY;
    
    // Ensure we have a sensible minimum span to prevent excessive zooming at start coords
    const minDesiredSpan = 1.5;
    if (spanX < minDesiredSpan) spanX = minDesiredSpan;
    if (spanY < minDesiredSpan) spanY = minDesiredSpan;

    const padding = 0.25; // 25% padding on each side for generous spacing
    actMinX -= spanX * padding;
    actMaxX += spanX * padding;
    actMinY -= spanY * padding;
    actMaxY += spanY * padding;

    // Maintain a 1:1 square aspect ratio so contours display proportionately and don't stretch
    const finalSpanX = actMaxX - actMinX;
    const finalSpanY = actMaxY - actMinY;
    const maxSpan = Math.max(finalSpanX, finalSpanY);

    const centerX = (actMinX + actMaxX) / 2;
    const centerY = (actMinY + actMaxY) / 2;

    minX = centerX - maxSpan / 2;
    maxX = centerX + maxSpan / 2;
    minY = centerY - maxSpan / 2;
    maxY = centerY + maxSpan / 2;
  }

  // Playback Speed config (delay per step in ms)
  const [playSpeed, setPlaySpeed] = useState<number>(100);

  // Dynamic terrain perturbation water-ripple formula
  const fRipple = (lx: number, ly: number, withNoise = true): number => {
    const baseZ = preset.f(lx, ly);
    if (!withNoise || !config.noiseLevel || config.noiseLevel === 0) {
      return baseZ;
    }
    // High-frequency ripples radiating outward from (config.initialX, config.initialY)
    const dx = lx - config.initialX;
    const dy = ly - config.initialY;
    const dDist = Math.sqrt(dx * dx + dy * dy);
    
    // Wave amplitude is proportional to the Gaussian noise standard deviation σ
    const waveAmp = config.noiseLevel * 0.15;
    
    // Ripple function: high-frequency sines with standard phase speed based on tickRef.current
    const rippleSpeed = 0.18;
    const rippleFreq = 15.0;
    const waveValue = Math.sin(rippleFreq * dDist - tickRef.current * rippleSpeed) * Math.cos(20.0 * lx - tickRef.current * 0.1);
    
    return baseZ + waveAmp * waveValue;
  };

  // Synchronize physics ball coordinates with inputs whenever they are modified or reset
  useEffect(() => {
    physicsXRef.current = config.initialX;
    physicsYRef.current = config.initialY;
    physicsVxRef.current = 0;
    physicsVyRef.current = 0;
    physicsPathRef.current = [{
      x: config.initialX,
      y: config.initialY,
      loss: preset.f(config.initialX, config.initialY)
    }];
    draw();
  }, [config.initialX, config.initialY, preset]);

  // Animation controller for discrete step-by-step mathematical progression
  useEffect(() => {
    if (isAnimating && playMode === "math") {
      if (activeResult && activeResult.steps.length > 0) {
        // Start from current selected step, or loop back to 0 if at the end of steps
        const startStep = (selectedStepIndex >= activeResult.steps.length - 1) ? 0 : selectedStepIndex;
        setAnimationStep(startStep);
        onSelectStep(startStep);
      } else {
        setIsAnimating(false);
      }
    } else if (playMode === "math") {
      setAnimationStep(null);
    }
  }, [isAnimating, playMode]);

  useEffect(() => {
    if (isAnimating && playMode === "math" && animationStep !== null && activeResult) {
      const timer = setTimeout(() => {
        if (animationStep < activeResult.steps.length - 1) {
          const nextStep = animationStep + 1;
          setAnimationStep(nextStep);
          onSelectStep(nextStep);
        } else {
          setIsAnimating(false);
        }
      }, playSpeed);
      return () => clearTimeout(timer);
    }
  }, [isAnimating, playMode, animationStep, activeResult, playSpeed]);

  // Unified persistent frame-rate ticker for water waves & high fidelity continuous physical simulations
  useEffect(() => {
    let lastTime = performance.now();
    let isRequestActive = true;
    
    const animationLoopTick = (nowTime: number) => {
      if (!isRequestActive) return;
      
      // Increment ticker
      tickRef.current += 1;
      
      let dt = (nowTime - lastTime) / 1000;
      if (dt > 0.1) dt = 0.1; // clamp lag spike
      lastTime = nowTime;
      
      let triggerDraw = config.noiseLevel > 0 || viewMode === "taylor"; // Water wave ripples or Taylor lens breathe necessitate draw!
      
      if (isAnimating && playMode === "physics") {
        // Continuous Euler integration sliding down the slope
        const curX = physicsXRef.current;
        const curY = physicsYRef.current;
        const curVx = physicsVxRef.current;
        const curVy = physicsVyRef.current;
        
        // Grab local gradient direction
        const [gx, gy] = preset.grad(curX, curY);
        
        // Newtonian ODE parameters: acceleration = gravity down slope - friction damping resistance
        const physicalGravity = 60.0;
        const physicalFriction = 1.4;
        
        let forceX = -gx * physicalGravity - physicalFriction * curVx;
        let forceY = -gy * physicalGravity - physicalFriction * curVy;
        
        // Add random high-frequency thermal fluctuation vibrations under noisy landscapes!
        if (config.noiseLevel > 0) {
          const thermalForceFactor = config.noiseLevel * 350.0;
          forceX += (Math.random() - 0.5) * thermalForceFactor;
          forceY += (Math.random() - 0.5) * thermalForceFactor;
        }
        
        const nextVx = curVx + forceX * dt;
        const nextVy = curVy + forceY * dt;
        
        // Velocity bounding threshold for numerical correctness
        const speedMagnitude = Math.sqrt(nextVx * nextVx + nextVy * nextVy);
        const velocityConstraint = 15.0;
        if (speedMagnitude > velocityConstraint) {
          physicsVxRef.current = (nextVx / speedMagnitude) * velocityConstraint;
          physicsVyRef.current = (nextVy / speedMagnitude) * velocityConstraint;
        } else {
          physicsVxRef.current = nextVx;
          physicsVyRef.current = nextVy;
        }
        
        let targetX = curX + physicsVxRef.current * dt;
        let targetY = curY + physicsVyRef.current * dt;
        
        // Retain ball within soft viewport margins
        const borderPaddingX = (maxX - minX) * 1.5;
        const borderPaddingY = (maxY - minY) * 1.5;
        targetX = Math.max(minX - borderPaddingX, Math.min(maxX + borderPaddingX, targetX));
        targetY = Math.max(minY - borderPaddingY, Math.min(maxY + borderPaddingY, targetY));
        
        physicsXRef.current = targetX;
        physicsYRef.current = targetY;
        
        physicsPathRef.current.push({
          x: targetX,
          y: targetY,
          loss: preset.f(targetX, targetY)
        });
        
        // Keep memory footprint trimmed
        if (physicsPathRef.current.length > 2500) {
          physicsPathRef.current.shift();
        }
        
        triggerDraw = true;
      }
      
      if (triggerDraw) {
        draw();
      }
      
      requestRef.current = requestAnimationFrame(animationLoopTick);
    };
    
    requestRef.current = requestAnimationFrame(animationLoopTick);
    return () => {
      isRequestActive = false;
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isAnimating, playMode, preset, config, viewMode, showGradientField, showOptimizerRace, rotationTheta, rotationPhi, animationStep, autoRecenter, hoveredCoords, minX, maxX, minY, maxY, taylorViewRadius]);

  // Render loop fallback triggered on standard parameters adjustment
  useEffect(() => {
    draw();
  }, [preset, activeResult, allResults, selectedStepIndex, viewMode, showGradientField, showOptimizerRace, rotationTheta, rotationPhi, animationStep, autoRecenter, hoveredCoords, config, playMode, taylorViewRadius]);

  // Color mappings
  const optColors: { [key: string]: string } = {
    sgd: "#3b82f6", // Blue
    momentum: "#f97316", // Orange
    adagrad: "#10b981", // Green
    rmsprop: "#a855f7", // Purple
    adam: "#06b6d4" // Teal
  };

  const optColorsRgb: { [key: string]: string } = {
    sgd: "59, 130, 246",
    momentum: "249, 115, 22",
    adagrad: "16, 185, 129",
    rmsprop: "168, 85, 247",
    adam: "6, 182, 212"
  };

  const getZValueRange = (): [number, number] => {
    let zMin = Infinity;
    let zMax = -Infinity;
    const samples = 20;
    for (let i = 0; i < samples; i++) {
      const x = minX + (maxX - minX) * (i / (samples - 1));
      for (let j = 0; j < samples; j++) {
        const y = minY + (maxY - minY) * (j / (samples - 1));
        const val = preset.f(x, y);
        if (!isNaN(val) && isFinite(val)) {
          if (val < zMin) zMin = val;
          if (val > zMax) zMax = val;
        }
      }
    }
    // Safeguard
    if (zMin === Infinity) zMin = 0;
    if (zMax === -Infinity) zMax = 10;
    return [zMin, zMax];
  };

  const draw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    if (viewMode === "2d") {
      draw2DContour(ctx, width, height);
    } else if (viewMode === "3d") {
      draw3DSurface(ctx, width, height);
    } else if (viewMode === "taylor") {
      drawTaylorViewer(ctx, width, height);
    }
  };

  // Convert logical coordinates parameter space to screen coordinates
  const toScreenX = (x: number, w: number): number => {
    return ((x - minX) / (maxX - minX)) * w;
  };

  const toScreenY = (y: number, h: number): number => {
    return h - ((y - minY) / (maxY - minY)) * h; // flip Y for standard cartesian coordinate system
  };

  // Convert screen coordinates back to logical coordinates
  const toLogicalX = (sx: number, w: number): number => {
    return minX + (sx / w) * (maxX - minX);
  };

  const toLogicalY = (sy: number, h: number): number => {
    return minY + ((h - sy) / h) * (maxY - minY);
  };

  // --- 1. DRAW 2D CONTOUR PLOT ---
  const draw2DContour = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // A. Fill Heat density background
    const [zMin, zMax] = getZValueRange();
    const zRange = Math.max(1e-5, zMax - zMin);

    const gridSize = 4; // block size for pixel-density simulation
    for (let sx = 0; sx < w; sx += gridSize) {
      const lx = toLogicalX(sx + gridSize / 2, w);
      for (let sy = 0; sy < h; sy += gridSize) {
        const ly = toLogicalY(sy + gridSize / 2, h);
        const z = fRipple(lx, ly);
        
        let ratio = (z - zMin) / zRange;
        ratio = Math.max(0, Math.min(1, ratio));

        // Let's create an elegant, elegant off-white / light blue to warm sand gradient style ("淡雅大方" / elegant light mode)
        // Light pastel style: low loss = soft warm creamy gold / cream, high loss = light lavender slate blue
        const hue = 220 - ratio * 140; // 220 (cool light blue/slate) to 80 (soft mint/beige)
        const sat = 45 + ratio * 20; // soft contrast saturation
        const light = 94 - ratio * 12; // light theme background values

        ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;
        ctx.fillRect(sx, sy, gridSize, gridSize);
      }
    }

    // B. Draw Contour Lines (Isolines)
    ctx.lineWidth = 1;
    const numIsolines = 12;
    const isolineLevels: number[] = [];
    for (let i = 1; i <= numIsolines; i++) {
      isolineLevels.push(zMin + (zRange * i) / (numIsolines + 1));
    }

    // Simple Marching Lines approximation: grid check
    const step = 8;
    ctx.strokeStyle = "rgba(100, 116, 139, 0.18)"; // Slate color at low opacity
    for (let level of isolineLevels) {
      ctx.beginPath();
      for (let sx = 0; sx < w; sx += step) {
        const lx = toLogicalX(sx, w);
        for (let sy = 0; sy < h; sy += step) {
          const ly = toLogicalY(sy, h);
          const z00 = fRipple(lx, ly);
          const z10 = fRipple(toLogicalX(sx + step, w), ly);
          const z01 = fRipple(lx, toLogicalY(sy + step, h));

          // Cross-horizontal check
          if ((z00 < level && z10 >= level) || (z00 >= level && z10 < level)) {
            const ratioX = (level - z00) / (z10 - z00);
            ctx.moveTo(sx + ratioX * step, sy);
            ctx.lineTo(sx + ratioX * step, sy + 1);
          }
          // Cross-vertical check
          if ((z00 < level && z01 >= level) || (z00 >= level && z01 < level)) {
            const ratioY = (level - z00) / (z01 - z00);
            ctx.moveTo(sx, sy + ratioY * step);
            ctx.lineTo(sx + 1, sy + ratioY * step);
          }
        }
      }
      ctx.stroke();
    }

    // C. Draw Gradient Vector Field (Arrows)
    if (showGradientField) {
      ctx.strokeStyle = "rgba(71, 85, 105, 0.28)"; 
      ctx.fillStyle = "rgba(71, 85, 105, 0.28)";
      const arrowSpacing = 30;
      for (let sx = arrowSpacing / 2; sx < w; sx += arrowSpacing) {
        const lx = toLogicalX(sx, w);
        for (let sy = arrowSpacing / 2; sy < h; sy += arrowSpacing) {
          const ly = toLogicalY(sy, h);
          const [gx, gy] = preset.grad(lx, ly);
          const gNorm = Math.sqrt(gx * gx + gy * gy);

          if (gNorm > 1e-4) {
            // Normalize & scale arrow
            const arrowLength = 10;
            // Draw descent arrow (pointing OPPOSITE to gradient direction)
            const dx = -gx / gNorm;
            const dy = -gy / gNorm; // logical change path

            // In screen spaces: Y direction is flipped
            const screenGx = dx * arrowLength;
            const screenGy = -dy * arrowLength; // compensate Cartesian Y flip

            ctx.beginPath();
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx + screenGx, sy + screenGy);
            ctx.stroke();

            // Arrow tip
            const angle = Math.atan2(screenGy, screenGx);
            ctx.beginPath();
            ctx.moveTo(sx + screenGx, sy + screenGy);
            ctx.lineTo(
              sx + screenGx - 4 * Math.cos(angle - Math.PI / 6),
              sy + screenGy - 4 * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
              sx + screenGx - 4 * Math.cos(angle + Math.PI / 6),
              sy + screenGy - 4 * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fill();
          }
        }
      }
    }

    // Fog of War Overlay (探索迷雾 - if noiseLevel > 0)
    if (config.noiseLevel && config.noiseLevel > 0) {
      const origComposite = ctx.globalCompositeOperation;
      
      const fogAlpha = Math.min(0.65, 0.15 + config.noiseLevel * 0.25);
      
      // 1. Draw solid overlay
      ctx.fillStyle = `rgba(15, 23, 42, ${fogAlpha * 0.70})`;
      ctx.fillRect(0, 0, w, h);
      
      // 2. Add organic noise cloud puffs using a seeded PRNG for visual continuity
      let fogSeed = 54321;
      const randFog = () => {
        fogSeed = (fogSeed * 1664525 + 1013904223) % 4294967296;
        return fogSeed / 4294967296;
      };
      
      for (let i = 0; i < 18; i++) {
        const cx = randFog() * w;
        const cy = randFog() * h;
        const rPart = (0.5 + randFog() * 0.7) * 90;
        const puffAlpha = (0.05 + randFog() * 0.20) * fogAlpha;
        const gradPuff = ctx.createRadialGradient(cx, cy, rPart * 0.1, cx, cy, rPart);
        gradPuff.addColorStop(0, `rgba(71, 85, 105, ${puffAlpha})`);
        gradPuff.addColorStop(1, "rgba(71, 85, 105, 0.0)");
        
        ctx.fillStyle = gradPuff;
        ctx.beginPath();
        ctx.arc(cx, cy, rPart, 0, 2 * Math.PI);
        ctx.fill();
      }
      
      // 3. Clear fog along the optimization results paths (destination-out)
      ctx.globalCompositeOperation = "destination-out";
      
      const clearAlongSteps = (steps: OptimizationStep[], isFocused: boolean) => {
        const totalSteps = animationStep !== null ? Math.min(animationStep, steps.length - 1) : steps.length - 1;
        for (let idx = 0; idx <= totalSteps; idx++) {
          const stepObj = steps[idx];
          const px = toScreenX(stepObj.x, w);
          const py = toScreenY(stepObj.y, h);
          
          const size = isFocused ? 38 : 26;
          const gradClear = ctx.createRadialGradient(px, py, 2, px, py, size);
          gradClear.addColorStop(0, "rgba(0, 0, 0, 1.0)");
          gradClear.addColorStop(0.3, "rgba(0, 0, 0, 0.75)");
          gradClear.addColorStop(1, "rgba(0, 0, 0, 0.0)");
          
          ctx.fillStyle = gradClear;
          ctx.beginPath();
          ctx.arc(px, py, size, 0, 2 * Math.PI);
          ctx.fill();
        }
      };

      if (showOptimizerRace && allResults.length > 0) {
        allResults.forEach((run) => {
          if (run.steps.length > 0) {
            clearAlongSteps(run.steps, run.optimizerId === activeResult?.optimizerId);
          }
        });
      } else if (activeResult && activeResult.steps.length > 0) {
        clearAlongSteps(activeResult.steps, true);
      }
      
      ctx.globalCompositeOperation = origComposite;
    }

    // D. Comparative Optimizer Race
    if (playMode === "physics") {
      const trailPoints = physicsPathRef.current;
      if (trailPoints.length > 0) {
        // 1. Draw physics track trail as a beautiful glowing gradient (amber -> rose)
        ctx.lineWidth = 4;
        const trailGrad = ctx.createLinearGradient(0, 0, w, h);
        trailGrad.addColorStop(0, "#f59e0b"); // amber
        trailGrad.addColorStop(1, "#f43f5e"); // rose
        ctx.strokeStyle = trailGrad;
        ctx.shadowColor = "rgba(244, 63, 94, 0.45)";
        ctx.shadowBlur = 8;
        ctx.beginPath();
        
        trailPoints.forEach((pt, idx) => {
          const px = toScreenX(pt.x, w);
          const py = toScreenY(pt.y, h);
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();
        
        // Reset shadow effects
        ctx.shadowColor = "transparent";
        ctx.shadowBlur = 0;

        // 2. Draw metallic chrome ball shadowed representing the marble
        const lastPt = trailPoints[trailPoints.length - 1];
        const ballScreenX = toScreenX(lastPt.x, w);
        const ballScreenY = toScreenY(lastPt.y, h);

        // Subtle cast shadow slightly offset down and right
        ctx.fillStyle = "rgba(15, 23, 42, 0.22)";
        ctx.beginPath();
        ctx.arc(ballScreenX + 2, ballScreenY + 2, 7, 0, 2 * Math.PI);
        ctx.fill();

        // Standard steel metallic sphere gradient
        const ballSize = 7.5;
        const specularGrad = ctx.createRadialGradient(
          ballScreenX - ballSize * 0.3, 
          ballScreenY - ballSize * 0.3, 
          ballSize * 0.1, 
          ballScreenX, 
          ballScreenY, 
          ballSize
        );
        specularGrad.addColorStop(0, "#ffffff"); // specular shine
        specularGrad.addColorStop(0.25, "#e2e8f0");
        specularGrad.addColorStop(0.7, "#64748b"); // base steel
        specularGrad.addColorStop(1, "#1e293b"); // deep shadow boundary
        
        ctx.fillStyle = specularGrad;
        ctx.beginPath();
        ctx.arc(ballScreenX, ballScreenY, ballSize, 0, 2 * Math.PI);
        ctx.fill();

        // Fine white rim gloss
        ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.arc(ballScreenX, ballScreenY, ballSize, 0, 2 * Math.PI);
        ctx.stroke();

        // 3. Draw sparkly mist nebula around the physical ball if terrain perturbations > 0
        if (config.noiseLevel > 0) {
          const numParticles = Math.min(15, Math.floor(6 + config.noiseLevel * 25));
          ctx.fillStyle = "rgba(168, 85, 247, 0.75)"; // energetic spark purple
          for (let i = 0; i < numParticles; i++) {
            const angle = (i / numParticles) * Math.PI * 2 + tickRef.current * 0.04;
            const radius = 6.5 + Math.sin(tickRef.current * 0.12 + i) * 11.0 * Math.random();
            const px = ballScreenX + Math.cos(angle) * radius;
            const py = ballScreenY + Math.sin(angle) * radius;
            const pSize = 0.8 + Math.random() * 1.8;
            
            ctx.beginPath();
            ctx.arc(px, py, pSize, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      }
    } else {
      // Standard static math step paths
      if (showOptimizerRace && allResults.length > 0) {
        allResults.forEach((run) => {
          if (run.steps.length === 0) return;
          const col = optColors[run.optimizerId] || "#cbd5e1";
          const rgb = optColorsRgb[run.optimizerId] || "148, 163, 184";
          const isFocused = run.optimizerId === activeResult?.optimizerId;
          const totalSteps = animationStep !== null ? Math.min(animationStep, run.steps.length - 1) : run.steps.length - 1;

          // Draw comet path line segment by segment with decaying opacity and width!
          for (let idx = 1; idx <= totalSteps; idx++) {
            const prevStep = run.steps[idx - 1];
            const currStep = run.steps[idx];
            const pxPrev = toScreenX(prevStep.x, w);
            const pyPrev = toScreenY(prevStep.y, h);
            const pxCurr = toScreenX(currStep.x, w);
            const pyCurr = toScreenY(currStep.y, h);
            
            const ratio = idx / totalSteps;
            
            // Decaying trace particles/lines opacity & width curves
            const alpha = Math.max(0.12, Math.pow(ratio, 1.8));
            const width = (isFocused ? 0.8 : 0.45) + (isFocused ? 3.0 : 1.8) * Math.pow(ratio, 2.0);
            
            ctx.strokeStyle = `rgba(${rgb}, ${alpha})`;
            ctx.lineWidth = width;
            ctx.setLineDash(isFocused ? [] : [3, 2]);
            
            ctx.beginPath();
            ctx.moveTo(pxPrev, pyPrev);
            ctx.lineTo(pxCurr, pyCurr);
            ctx.stroke();
          }
          ctx.setLineDash([]); // Reset path dashes

          // Draw particle trace highlights
          for (let idx = 0; idx <= totalSteps; idx++) {
            const stepObj = run.steps[idx];
            if (idx % 2 === 0 || idx === totalSteps) {
              const px = toScreenX(stepObj.x, w);
              const py = toScreenY(stepObj.y, h);
              const ratio = totalSteps > 0 ? idx / totalSteps : 1.0;
              const pAlpha = Math.max(0.08, Math.pow(ratio, 2.5));
              const pColor = `rgba(${rgb}, ${pAlpha})`;
              const pSize = (isFocused ? 1.0 : 0.6) + (isFocused ? 3.2 : 2.0) * Math.pow(ratio, 3.0);
              
              ctx.fillStyle = pColor;
              ctx.beginPath();
              ctx.arc(px, py, pSize, 0, 2 * Math.PI);
              ctx.fill();
            }
          }

          // Draw current target cursor circle & label
          if (totalSteps >= 0) {
            const runPos = run.steps[totalSteps];
            const cx = toScreenX(runPos.x, w);
            const cy = toScreenY(runPos.y, h);
            ctx.fillStyle = col;
            ctx.beginPath();
            ctx.arc(cx, cy, 3.5, 0, 2 * Math.PI);
            ctx.fill();

            // Highlight indicator for the active solver path
            if (run.optimizerId === activeResult?.optimizerId) {
              ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
              ctx.lineWidth = 1.5;
              ctx.beginPath();
              ctx.arc(cx, cy, 6, 0, 2 * Math.PI);
              ctx.stroke();
            }
          }
        });
      }
    }

    // E. Draw coordinates grid lines
    ctx.strokeStyle = "rgba(148, 163, 184, 0.1)";
    ctx.lineWidth = 1;
    // Draw grid axes
    const axisColor = "rgba(71, 85, 105, 0.35)";
    const originX = toScreenX(0, w);
    const originY = toScreenY(0, h);

    if (minX <= 0 && maxX >= 0) {
      ctx.strokeStyle = axisColor;
      ctx.beginPath();
      ctx.moveTo(originX, 0);
      ctx.lineTo(originX, h);
      ctx.stroke();
    }
    if (minY <= 0 && maxY >= 0) {
      ctx.strokeStyle = axisColor;
      ctx.beginPath();
      ctx.moveTo(0, originY);
      ctx.lineTo(w, originY);
      ctx.stroke();
    }

    // F. Highlight current selected step on ACTIVE optimization path
    if (playMode === "math" && activeResult && activeResult.steps.length > 0) {
      const activeStepCount = activeResult.steps.length;
      const stepIdx = animationStep !== null ? animationStep : selectedStepIndex;
      const clampedIdx = Math.min(stepIdx, activeStepCount - 1);
      const targetStep = activeResult.steps[clampedIdx];

      if (targetStep) {
        const sx = toScreenX(targetStep.x, w);
        const sy = toScreenY(targetStep.y, h);

        // Pulsing cursor
        ctx.strokeStyle = "#4f46e5"; // Deep indigo
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(sx, sy, 8, 0, 2 * Math.PI);
        ctx.stroke();

        ctx.fillStyle = "#4f46e5";
        ctx.beginPath();
        ctx.arc(sx, sy, 4, 0, 2 * Math.PI);
        ctx.fill();

        // Overlay small coordinate tooltip near pointer
        ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
        ctx.font = "10px monospace";
        const stepLabel = `k=${targetStep.step} (${targetStep.x.toFixed(3)}, ${targetStep.y.toFixed(3)})`;
        const textW = ctx.measureText(stepLabel).width;

        ctx.fillRect(sx - textW / 2 - 4, sy - 28, textW + 8, 16);
        ctx.fillStyle = "#ffffff";
        ctx.fillText(stepLabel, sx - textW / 2, sy - 17);
        
        // Sparkle mist under noise for mathematical focus cursor
        if (config.noiseLevel > 0) {
          const numParticles = Math.min(10, Math.floor(4 + config.noiseLevel * 18));
          ctx.fillStyle = "rgba(168, 85, 247, 0.65)";
          for (let i = 0; i < numParticles; i++) {
            const angle = (i / numParticles) * Math.PI * 2 + tickRef.current * 0.04;
            const radius = 6.0 + Math.sin(tickRef.current * 0.1 + i) * 8.0 * Math.random();
            const px = sx + Math.cos(angle) * radius;
            const py = sy + Math.sin(angle) * radius;
            const pSize = 0.6 + Math.random() * 1.5;
            
            ctx.beginPath();
            ctx.arc(px, py, pSize, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      }
    }

    // Draw mouse hover focus crosshair lines & circle for 2D mode
    if (hoveredCoords && viewMode === "2d") {
      ctx.strokeStyle = "rgba(79, 70, 229, 0.45)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      
      // Horizontal crosshair line
      ctx.beginPath();
      ctx.moveTo(0, hoveredCoords.sy);
      ctx.lineTo(w, hoveredCoords.sy);
      ctx.stroke();

      // Vertical crosshair line
      ctx.beginPath();
      ctx.moveTo(hoveredCoords.sx, 0);
      ctx.lineTo(hoveredCoords.sx, h);
      ctx.stroke();

      ctx.setLineDash([]);

      // Center focus rings
      ctx.strokeStyle = "#4f46e5";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hoveredCoords.sx, hoveredCoords.sy, 6, 0, 2 * Math.PI);
      ctx.stroke();
      
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(hoveredCoords.sx, hoveredCoords.sy, 2.5, 0, 2 * Math.PI);
      ctx.fill();
    }
  };

  // --- 2. DRAW 3D PERSPECTIVE WIREFRAME ---
  const draw3DSurface = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // Elegant off-white grid background
    ctx.fillStyle = "#fefefe";
    ctx.fillRect(0, 0, w, h);

    // Calculate projection factor scales:
    const thetaRad = (rotationTheta * Math.PI) / 180;
    const phiRad = (rotationPhi * Math.PI) / 180;

    // Get limits of Z dynamically
    const [zMin, zMax] = getZValueRange();
    const zRange = Math.max(1e-4, zMax - zMin);

    // 3D Point projection function
    const project3D = (lx: number, ly: number, lz: number): [number, number] => {
      // Step 1: Normalize logical coordinates to [-0.5, 0.5] range
      const normX = (lx - minX) / (maxX - minX) - 0.5;
      const normY = (ly - minY) / (maxY - minY) - 0.5;
      const normZ = (lz - zMin) / zRange - 0.3; // elevation offset

      // Step 2: Rotate around Z axis (yaw - rotationTheta)
      const rotX = normX * Math.cos(thetaRad) - normY * Math.sin(thetaRad);
      const rotY = normX * Math.sin(thetaRad) + normY * Math.cos(thetaRad);
      const rotZ = normZ;

      // Step 3: Rotate around X axis (pitch - rotationPhi / tilt)
      const finalX = rotX;
      const finalY = rotY * Math.cos(phiRad) - rotZ * Math.sin(phiRad);
      const finalZ = rotY * Math.sin(phiRad) + rotZ * Math.cos(phiRad);

      // Project onto 2D viewport
      const scaleFactor = Math.min(w, h) * 0.85;
      const screenX = w / 2 + finalX * scaleFactor;
      const screenY = h / 2 - finalY * scaleFactor; // Cartesian map flip

      return [screenX, screenY];
    };

    // A. Draw Surface Mesh wires with depth color-coding
    const meshGrid = 24;
    ctx.lineWidth = 0.5;

    // We can draw polygons with light transparent fill for perfect pseudo-3D representation!
    // Storing points grid enables convenient face-rendering from back to front (Painter's algorithm!)
    const gridPoints: [number, number][][] = [];
    const heights: number[][] = [];

    for (let r = 0; r <= meshGrid; r++) {
      const ly = minY + (maxY - minY) * (r / meshGrid);
      const pointsRow: [number, number][] = [];
      const heightRow: number[] = [];
      for (let c = 0; c <= meshGrid; c++) {
        const lx = minX + (maxX - minX) * (c / meshGrid);
        const lz = fRipple(lx, ly);
        const [sx, sy] = project3D(lx, ly, lz);
        pointsRow.push([sx, sy]);
        heightRow.push(lz);
      }
      gridPoints.push(pointsRow);
      heights.push(heightRow);
    }

    // Draw mesh faces back-to-front
    // Determining ordering based on theta quadrant to simulate painters algorithm correctly
    const quadrant = Math.floor(((rotationTheta % 360) + 360) / 90) % 4;
    
    let rangeRowStart = 0, rangeRowEnd = meshGrid, rowStep = 1;
    let rangeColStart = 0, rangeColEnd = meshGrid, colStep = 1;

    // Rearrange draw orders based on rotate angle quadrant
    if (quadrant === 0) {
      rangeRowStart = meshGrid - 1; rangeRowEnd = -1; rowStep = -1;
      rangeColStart = 0; rangeColEnd = meshGrid; colStep = 1;
    } else if (quadrant === 1) {
      rangeRowStart = 0; rangeRowEnd = meshGrid; rowStep = 1;
      rangeColStart = 0; rangeColEnd = meshGrid; colStep = 1;
    } else if (quadrant === 2) {
      rangeRowStart = 0; rangeRowEnd = meshGrid; rowStep = 1;
      rangeColStart = meshGrid - 1; rangeColEnd = -1; colStep = -1;
    } else {
      rangeRowStart = meshGrid - 1; rangeRowEnd = -1; rowStep = -1;
      rangeColStart = meshGrid - 1; rangeColEnd = -1; colStep = -1;
    }

    for (let r = 0; r < meshGrid; r++) {
      for (let c = 0; c < meshGrid; c++) {
        // Render isometric cell polygon
        const p00 = gridPoints[r][c];
        const p10 = gridPoints[r + 1][c];
        const p11 = gridPoints[r + 1][c + 1];
        const p01 = gridPoints[r][c + 1];

        const avgHeight = (heights[r][c] + heights[r+1][c] + heights[r+1][c+1] + heights[r][c+1]) / 4;
        let pRatio = (avgHeight - zMin) / zRange;
        pRatio = Math.max(0, Math.min(1, pRatio));

        // Elegant light colors matching elegant theme
        const hVal = 210 - pRatio * 110; // HSL colors
        ctx.fillStyle = `hsla(${hVal}, 45%, ${92 - pRatio * 8}%, 0.72)`;
        ctx.strokeStyle = `hsla(${hVal}, 40%, ${78 - pRatio * 10}%, 0.28)`;

        ctx.beginPath();
        ctx.moveTo(p00[0], p00[1]);
        ctx.lineTo(p10[0], p10[1]);
        ctx.lineTo(p11[0], p11[1]);
        ctx.lineTo(p01[0], p01[1]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }

    // B. Draw descent trace onto 3D Surface curves
    if (playMode === "physics") {
      const trailPoints = physicsPathRef.current;
      if (trailPoints.length > 0) {
        // 1. Draw glowing 3D simulated physical track line (gradient amber -> rose)
        ctx.lineWidth = 3;
        const trailGrad = ctx.createLinearGradient(0, 0, w, h);
        trailGrad.addColorStop(0, "#f59e0b"); // amber
        trailGrad.addColorStop(1, "#f43f5e"); // rose
        ctx.strokeStyle = trailGrad;
        ctx.beginPath();
        
        trailPoints.forEach((pt, idx) => {
          const ptZ = fRipple(pt.x, pt.y);
          const [px, py] = project3D(pt.x, pt.y, ptZ);
          if (idx === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        });
        ctx.stroke();

        const lastPt = trailPoints[trailPoints.length - 1];
        const lastZ = fRipple(lastPt.x, lastPt.y);
        const [ballX, ballY] = project3D(lastPt.x, lastPt.y, lastZ);

        // 2. Draw vertical coordinate projection line down to floor anchor
        const [anchorX, anchorY] = project3D(lastPt.x, lastPt.y, zMin);
        ctx.strokeStyle = "rgba(244, 63, 94, 0.55)";
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 3]);
        ctx.beginPath();
        ctx.moveTo(ballX, ballY);
        ctx.lineTo(anchorX, anchorY);
        ctx.stroke();
        ctx.setLineDash([]);

        // Cast shadow on floorspace
        ctx.fillStyle = "rgba(15, 23, 42, 0.2)";
        ctx.beginPath();
        ctx.arc(anchorX, anchorY, 6, 0, 2 * Math.PI);
        ctx.fill();

        // 3. Draw metallic glossy ball representing the chrome marble
        const ballSize = 8.5;
        const specularGrad = ctx.createRadialGradient(
          ballX - ballSize * 0.3, 
          ballY - ballSize * 0.3, 
          ballSize * 0.1, 
          ballX, 
          ballY, 
          ballSize
        );
        specularGrad.addColorStop(0, "#ffffff");
        specularGrad.addColorStop(0.2, "#f8fafc");
        specularGrad.addColorStop(0.65, "#94a3b8");
        specularGrad.addColorStop(1, "#334155");

        ctx.fillStyle = specularGrad;
        ctx.beginPath();
        ctx.arc(ballX, ballY, ballSize, 0, 2 * Math.PI);
        ctx.fill();

        // Shiny outline rim
        ctx.strokeStyle = "rgba(255, 255, 255, 0.45)";
        ctx.lineWidth = 0.75;
        ctx.beginPath();
        ctx.arc(ballX, ballY, ballSize, 0, 2 * Math.PI);
        ctx.stroke();

        // 4. Sparkly mist spray around active ball in 3D under noise
        if (config.noiseLevel > 0) {
          const numParticles = Math.min(15, Math.floor(6 + config.noiseLevel * 25));
          ctx.fillStyle = "rgba(168, 85, 247, 0.75)";
          for (let i = 0; i < numParticles; i++) {
            const angle = (i / numParticles) * Math.PI * 2 + tickRef.current * 0.04;
            const radius = 6.5 + Math.sin(tickRef.current * 0.12 + i) * 11.0 * Math.random();
            const px = ballX + Math.cos(angle) * radius;
            const py = ballY + Math.sin(angle) * radius;
            const pSize = 0.8 + Math.random() * 1.8;
            
            ctx.beginPath();
            ctx.arc(px, py, pSize, 0, 2 * Math.PI);
            ctx.fill();
          }
        }
      }
    } else {
      if (activeResult && activeResult.steps.length > 0) {
        const optColor = optColors[activeResult.optimizerId] || "#4f46e5";
        const totalSteps = animationStep !== null ? Math.min(animationStep, activeResult.steps.length - 1) : activeResult.steps.length - 1;

        // Draw path line ascending/descending
        ctx.lineWidth = 3;
        ctx.strokeStyle = optColor;
        ctx.beginPath();
        
        for (let stepIdx = 0; stepIdx <= totalSteps; stepIdx++) {
          const pObj = activeResult.steps[stepIdx];
          const [projX, projY] = project3D(pObj.x, pObj.y, pObj.loss);
          if (stepIdx === 0) ctx.moveTo(projX, projY);
          else ctx.lineTo(projX, projY);
        }
        ctx.stroke();

        // Show small spheres on vertices
        for (let stepIdx = 0; stepIdx <= totalSteps; stepIdx++) {
          if (stepIdx % Math.max(1, Math.floor(totalSteps / 12)) === 0 || stepIdx === totalSteps) {
            const pObj = activeResult.steps[stepIdx];
            const [projX, projY] = project3D(pObj.x, pObj.y, pObj.loss);
            ctx.fillStyle = stepIdx === totalSteps ? "#ef4444" : optColor;
            ctx.beginPath();
            ctx.arc(projX, projY, stepIdx === totalSteps ? 4.5 : 3, 0, 2 * Math.PI);
            ctx.fill();
            
            if (stepIdx === totalSteps) {
              // Draw a vertical coordinate projection line to anchor location
              const [baseX, baseY] = project3D(pObj.x, pObj.y, zMin);
              ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
              ctx.setLineDash([2, 2]);
              ctx.lineWidth = 1;
              ctx.beginPath();
              ctx.moveTo(projX, projY);
              ctx.lineTo(baseX, baseY);
              ctx.stroke();
              ctx.setLineDash([]);
            }
          }
        }
      }
    }
  };

  // --- 3. DRAW TAYLOR SECOND-ORDER VIEWER ---
  const drawTaylorViewer = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
    // Fill background with light neutral tone
    ctx.fillStyle = "#fafaf9";
    ctx.fillRect(0, 0, w, h);

    if (!activeResult || activeResult.steps.length === 0) {
      ctx.fillStyle = "#64748b";
      ctx.font = "14px Inter, sans-serif";
      ctx.fillText("请先运行优化器，并在计算透视表中选中一个节点：", 20, h / 2);
      return;
    }

    const stepIdx = animationStep !== null ? animationStep : selectedStepIndex;
    const clampedIdx = Math.min(stepIdx, activeResult.steps.length - 1);
    const centerStep = activeResult.steps[clampedIdx];

    if (!centerStep) return;

    // Logical anchor coordinates of expansion: (x0, y0)
    const x0 = centerStep.x;
    const y0 = centerStep.y;
    const f0 = centerStep.loss;
    const gx = centerStep.gradX;
    const gy = centerStep.gradY;
    const [[hxx, hxy], [, hyy]] = centerStep.hessian;

    // Define Local Box range representing local phase space
    const viewSize = taylorViewRadius; // sample radius from state zoom slider
    const localMinX = x0 - viewSize;
    const localMaxX = x0 + viewSize;
    const localMinY = y0 - viewSize;
    const localMaxY = y0 + viewSize;

    // Convert local point to panel coordinates
    const toLocalScreenX = (x: number): number => ((x - localMinX) / (2 * viewSize)) * w;
    const toLocalScreenY = (y: number): number => h - ((y - localMinY) / (2 * viewSize)) * h;

    // A. Render Difference Heat Density: Absolute approximation error |f(x,y) - T2(x,y)|
    const taylorGrid = 3; // high resolution densified grid (crisp, beautiful drawing)
    const hScale = Math.max(0.1, 0.4 * (Math.abs(hxx) + Math.abs(hyy)) + Math.sqrt(gx*gx + gy*gy) + 0.1);
    for (let sx = 0; sx < w; sx += taylorGrid) {
      const lx = localMinX + (sx / w) * (2 * viewSize);
      for (let sy = 0; sy < h; sy += taylorGrid) {
        const ly = localMinY + ((h - sy) / h) * (2 * viewSize);

        // Actual value
        const zActual = preset.f(lx, ly);

        // Taylor 2nd order approximation value
        const dx = lx - x0;
        const dy = ly - y0;
        const zTaylor = f0 + gx * dx + gy * dy + 0.5 * (hxx * dx * dx + 2 * hxy * dx * dy + hyy * dy * dy);

        // Absolute approximation error
        const error = Math.abs(zActual - zTaylor);
        // Map error to green-to-red intensity (green is perfect fit!)
        const errRatio = Math.min(1.0, error / hScale);

        // HSL: 120 (Green) for error = 0, to 0 (Red) for large error
        const hue = 120 - errRatio * 110;
        const sat = 50 + errRatio * 20;
        const lightness = 93 - errRatio * 5;

        ctx.fillStyle = `hsl(${hue}, ${sat}%, ${lightness}%)`;
        ctx.fillRect(sx, sy, taylorGrid, taylorGrid);
      }
    }

    // B. Draw dual contour lines to show local manifold matching
    // Let's sample local values to choose discrete iso-contour values
    let localZMin = Infinity;
    let localZMax = -Infinity;
    for (let sx = 0; sx <= w; sx += w / 8) {
      const lx = localMinX + (sx / w) * (2 * viewSize);
      for (let sy = 0; sy <= h; sy += h / 8) {
        const ly = localMinY + ((h - sy) / h) * (2 * viewSize);
        const z = preset.f(lx, ly);
        if (z < localZMin) localZMin = z;
        if (z > localZMax) localZMax = z;
      }
    }
    const localZRange = Math.max(1e-4, localZMax - localZMin);
    const numLocalLevels = 8;
    const localLevels: number[] = [];
    for (let i = 1; i <= numLocalLevels; i++) {
      localLevels.push(localZMin + (localZRange * i) / (numLocalLevels + 1));
    }

    const step = 6; // Marching squares spacing

    // B1. Draw Actual topographies (Slate dashed curves)
    ctx.strokeStyle = "rgba(71, 85, 105, 0.4)";
    ctx.lineWidth = 1.0;
    ctx.setLineDash([3, 2]);
    for (let level of localLevels) {
      ctx.beginPath();
      for (let sx = 0; sx < w; sx += step) {
        const lx0 = localMinX + (sx / w) * (2 * viewSize);
        const lx1 = localMinX + ((sx + step) / w) * (2 * viewSize);
        for (let sy = 0; sy < h; sy += step) {
          const ly0 = localMinY + ((h - sy) / h) * (2 * viewSize);
          const ly1 = localMinY + ((h - (sy + step)) / h) * (2 * viewSize);

          const z00 = preset.f(lx0, ly0);
          const z10 = preset.f(lx1, ly0);
          const z01 = preset.f(lx0, ly1);

          if ((z00 < level && z10 >= level) || (z00 >= level && z10 < level)) {
            const ratioX = (level - z00) / (z10 - z00 || 1e-5);
            ctx.moveTo(sx + ratioX * step, sy);
            ctx.lineTo(sx + ratioX * step, sy + 1);
          }
          if ((z00 < level && z01 >= level) || (z00 >= level && z01 < level)) {
            const ratioY = (level - z00) / (z01 - z00 || 1e-5);
            ctx.moveTo(sx, sy + ratioY * step);
            ctx.lineTo(sx + 1, sy + ratioY * step);
          }
        }
      }
      ctx.stroke();
    }

    // B2. Draw Taylor Approximation paraboloid contours (Solid Indigo curves)
    ctx.strokeStyle = "rgba(79, 70, 229, 0.75)";
    ctx.lineWidth = 1.6;
    ctx.setLineDash([]);
    for (let level of localLevels) {
      ctx.beginPath();
      for (let sx = 0; sx < w; sx += step) {
        const lx0 = localMinX + (sx / w) * (2 * viewSize);
        const lx1 = localMinX + ((sx + step) / w) * (2 * viewSize);
        for (let sy = 0; sy < h; sy += step) {
          const ly0 = localMinY + ((h - sy) / h) * (2 * viewSize);
          const ly1 = localMinY + ((h - (sy + step)) / h) * (2 * viewSize);

          // T2 eval helper
          const evalT2 = (lx: number, ly: number) => {
            const dx = lx - x0;
            const dy = ly - y0;
            return f0 + gx * dx + gy * dy + 0.5 * (hxx * dx * dx + 2 * hxy * dx * dy + hyy * dy * dy);
          };

          const z00 = evalT2(lx0, ly0);
          const z10 = evalT2(lx1, ly0);
          const z01 = evalT2(lx0, ly1);

          if ((z00 < level && z10 >= level) || (z00 >= level && z10 < level)) {
            const ratioX = (level - z00) / (z10 - z00 || 1e-5);
            ctx.moveTo(sx + ratioX * step, sy);
            ctx.lineTo(sx + ratioX * step, sy + 1);
          }
          if ((z00 < level && z01 >= level) || (z00 >= level && z01 < level)) {
            const ratioY = (level - z00) / (z01 - z00 || 1e-5);
            ctx.moveTo(sx, sy + ratioY * step);
            ctx.lineTo(sx + 1, sy + ratioY * step);
          }
        }
      }
      ctx.stroke();
    }

    // C. Plot expansion center anchor point with responsive radar pulse animations
    const sx0 = toLocalScreenX(x0);
    const sy0 = toLocalScreenY(y0);

    const pulseDuration = 900; // ms
    const pulseFactor = 1 + 0.3 * Math.sin((Date.now() % pulseDuration) * Math.PI * 2 / pulseDuration);

    // Glowing outer halo
    ctx.fillStyle = "rgba(239, 68, 68, 0.15)";
    ctx.beginPath();
    ctx.arc(sx0, sy0, 15 * pulseFactor, 0, 2 * Math.PI);
    ctx.fill();

    ctx.strokeStyle = "rgba(239, 68, 68, 0.4)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(sx0, sy0, 10 * pulseFactor, 0, 2 * Math.PI);
    ctx.stroke();

    // Solid core red point with a thin white outline
    ctx.fillStyle = "#ef4444";
    ctx.beginPath();
    ctx.arc(sx0, sy0, 5, 0, 2 * Math.PI);
    ctx.fill();

    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(sx0, sy0, 5, 0, 2 * Math.PI);
    ctx.stroke();

    // D. Vector arrow pointing opposite gradient at anchor (Descent search direction)
    const norm = Math.sqrt(gx*gx + gy*gy);
    if (norm > 1e-4) {
      const arrLen = 45;
      const adx = (-gx / norm) * arrLen;
      const ady = (-gy / norm) * arrLen;

      // Pulse gradient arrow thickness slightly
      const arrowWidth = 2.5 + 0.5 * Math.sin((Date.now() % 600) * Math.PI * 2 / 600);

      // Draw vector line
      ctx.strokeStyle = "#4f46e5";
      ctx.lineWidth = arrowWidth;
      ctx.beginPath();
      ctx.moveTo(sx0, sy0);
      ctx.lineTo(sx0 + adx, sy0 - ady); // Y flip
      ctx.stroke();

      // Vector head
      const angle = Math.atan2(-ady, adx);
      ctx.fillStyle = "#4f46e5";
      ctx.beginPath();
      ctx.moveTo(sx0 + adx, sy0 - ady);
      ctx.lineTo(
        sx0 + adx - 7 * Math.cos(angle - Math.PI/6),
        sy0 - ady - 7 * Math.sin(angle - Math.PI/6)
      );
      ctx.lineTo(
        sx0 + adx - 7 * Math.cos(angle + Math.PI/6),
        sy0 - ady - 7 * Math.sin(angle + Math.PI/6)
      );
      ctx.closePath();
      ctx.fill();
    }

    // E. Sci-fi HUD overlay card for equations (rounded glass card style)
    ctx.fillStyle = "rgba(15, 23, 42, 0.88)";
    const cardX = 10;
    const cardY = 10;
    const cardW = w - 20;
    const cardH = 75;
    const radius = 12;
    
    ctx.beginPath();
    ctx.moveTo(cardX + radius, cardY);
    ctx.lineTo(cardX + cardW - radius, cardY);
    ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + radius);
    ctx.lineTo(cardX + cardW, cardY + cardH - radius);
    ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - radius, cardY + cardH);
    ctx.lineTo(cardX + radius, cardY + cardH);
    ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - radius);
    ctx.lineTo(cardX, cardY + radius);
    ctx.quadraticCurveTo(cardX, cardY, cardX + radius, cardY);
    ctx.closePath();
    ctx.fill();
    
    // Outline border
    ctx.strokeStyle = "rgba(99, 102, 241, 0.25)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Render title text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 11px Inter, sans-serif";
    ctx.fillText(`步数 k = ${centerStep.step} | 二阶泰勒局部切相抛物面近似镜 (Local Taylor Approximation)`, 18, 28);

    // Equation
    ctx.font = "10.5px JetBrains Mono, monospace";
    ctx.fillStyle = "#93c5fd";
    const eqText = `T₂(x,y) ≈ ${f0.toFixed(3)} + [${gx.toFixed(3)}]Δx + [${gy.toFixed(3)}]Δy + 0.5([${hxx.toFixed(3)}]Δx² + 2*[${hxy.toFixed(3)}]ΔxΔy + [${hyy.toFixed(3)}]Δy²)`;
    ctx.fillText(eqText, 18, 48);

    ctx.font = "10px Inter, sans-serif";
    ctx.fillStyle = "#34d399";
    ctx.fillText(`※ 绿区逼近精度极限(|Error| < 0.05)。 展开中心: (${x0.toFixed(3)}, ${y0.toFixed(3)})  偏离局部梯度 ∥∇f∥ = ${norm.toFixed(3)}`, 18, 68);

    // F. Bottom Legend card
    ctx.fillStyle = "rgba(15, 23, 42, 0.85)";
    const legX = 10;
    const legY = h - 35;
    const legW = 270;
    const legH = 25;
    const legR = 6;
    
    ctx.beginPath();
    ctx.moveTo(legX + legR, legY);
    ctx.lineTo(legX + legW - legR, legY);
    ctx.quadraticCurveTo(legX + legW, legY, legX + legW, legY + legR);
    ctx.lineTo(legX + legW, legY + legH - legR);
    ctx.quadraticCurveTo(legX + legW, legY + legH, legX + legW - legR, legY + legH);
    ctx.lineTo(legX + legR, legY + legH);
    ctx.quadraticCurveTo(legX, legY + legH, legX, legY + legH - legR);
    ctx.lineTo(legX, legY + legR);
    ctx.quadraticCurveTo(legX, legY, legX + legR, legY);
    ctx.closePath();
    ctx.fill();
    
    ctx.font = "9.5px Inter, Helvetica, sans-serif";
    ctx.fillStyle = "#cbd5e1";
    ctx.fillText("╌ ╌  灰虚线: 真实地貌边界", 18, h - 20);
    ctx.fillStyle = "#818cf8";
    ctx.fillText("──  蓝实线: 泰勒二次抛物面", 145, h - 20);

    // Draw mouse hover focus crosshair lines & circle for Taylor mode
    if (hoveredCoords && viewMode === "taylor") {
      ctx.strokeStyle = "rgba(220, 38, 38, 0.45)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);
      
      // Horizontal crosshair line
      ctx.beginPath();
      ctx.moveTo(0, hoveredCoords.sy);
      ctx.lineTo(w, hoveredCoords.sy);
      ctx.stroke();

      // Vertical crosshair line
      ctx.beginPath();
      ctx.moveTo(hoveredCoords.sx, 0);
      ctx.lineTo(hoveredCoords.sx, h);
      ctx.stroke();

      ctx.setLineDash([]);

      // Center focus rings
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(hoveredCoords.sx, hoveredCoords.sy, 6, 0, 2 * Math.PI);
      ctx.stroke();
    }
  };

  return (
    <div className="glass-card bg-white/90 p-5 flex flex-col h-full" id="visualization_card">
      {/* Visualizer header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-1.5">
          <Layers className="w-5 h-5 text-indigo-500" />
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-display">动态轨迹画布 & 地貌透视 / Visualizer</h3>
        </div>

        {/* Tabs switcher */}
        <div className="flex items-center bg-slate-100/80 p-0.5 rounded-lg border border-slate-200/50">
          <button
            onClick={() => setViewMode("2d")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              viewMode === "2d" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            2D 等高线 & 梯度场
          </button>
          <button
            onClick={() => setViewMode("3d")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              viewMode === "3d" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            3D 空间曲面
          </button>
          <button
            onClick={() => setViewMode("taylor")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              viewMode === "taylor" ? "bg-white text-indigo-600 shadow-xs" : "text-slate-600 hover:text-slate-800"
            }`}
          >
            泰勒逼近镜
          </button>
        </div>
      </div>

      {/* Control settings specific to view modes */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100">
        <div className="flex flex-wrap gap-4 text-xs font-medium">
          {viewMode === "2d" && (
            <>
              <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showGradientField}
                  onChange={(e) => setShowGradientField(e.target.checked)}
                  className="rounded border-slate-350 text-indigo-600 checked:bg-indigo-600"
                />
                显示梯度场向量 (Arrows)
              </label>
              <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showOptimizerRace}
                  onChange={(e) => setShowOptimizerRace(e.target.checked)}
                  className="rounded border-slate-350 text-indigo-600 checked:bg-indigo-600"
                />
                对比平行赛跑 (Optimizer Race)
              </label>
            </>
          )}

          <label className="flex items-center gap-1.5 text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={autoRecenter}
              onChange={(e) => setAutoRecenter(e.target.checked)}
              className="rounded border-slate-350 text-indigo-600 checked:bg-indigo-600"
            />
            自动重中心 (Auto-recenter)
          </label>

          {viewMode === "3d" && (
            <div className="flex items-center gap-4 w-full">
              <span className="text-slate-500 shrink-0">鼠标/滑杆可旋转曲面:</span>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">旋转 θ:</span>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={rotationTheta}
                  onChange={(e) => setRotationTheta(Number(e.target.value))}
                  className="w-24 accent-indigo-500 h-1 bg-slate-200 rounded-lg cursor-pointer"
                />
                <span className="text-[11px] text-slate-400 font-mono w-6">{rotationTheta}°</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-400">俯仰 φ:</span>
                <input
                  type="range"
                  min="10"
                  max="80"
                  value={rotationPhi}
                  onChange={(e) => setRotationPhi(Number(e.target.value))}
                  className="w-24 accent-indigo-500 h-1 bg-slate-200 rounded-lg cursor-pointer"
                />
                <span className="text-[11px] text-slate-400 font-mono w-6">{rotationPhi}°</span>
              </div>
            </div>
          )}

          {viewMode === "taylor" && (
            <div className="flex flex-wrap items-center gap-4 bg-indigo-50/50 border border-indigo-100/50 px-3.5 py-1.5 rounded-xl text-xs font-semibold text-indigo-950 pointer-events-auto">
              <span className="flex items-center gap-1 font-bold">🔬 泰勒逼近镜 观测视界 (Radius):</span>
              <input
                type="range"
                min="0.3"
                max="3.0"
                step="0.1"
                value={taylorViewRadius}
                onChange={(e) => setTaylorViewRadius(Number(e.target.value))}
                className="w-28 accent-indigo-600 h-1 bg-indigo-200 rounded-lg cursor-pointer"
              />
              <span className="font-mono text-indigo-700 bg-white border border-indigo-150 px-1.5 py-0.2 rounded font-bold">{taylorViewRadius.toFixed(1)}m</span>
              <span className="text-[11px] text-slate-500 font-normal"> (调节大小可观察不同邻域尺度下的凹凸近似精确度)</span>
            </div>
          )}
        </div>

        {/* Path Descent animation player */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Play mode switcher */}
          <div className="flex items-center bg-slate-100/85 p-0.5 rounded-lg border border-slate-200/50 text-[11px]">
            <button
              onClick={() => {
                setIsAnimating(false);
                setPlayMode("math");
              }}
              className={`px-2 py-1 font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                playMode === "math" ? "bg-white text-indigo-700 shadow-xs font-bold" : "text-slate-600 hover:text-slate-800"
              }`}
              title="数学跳跃迭代步骤（步进离散模式）"
            >
              <Sliders className="w-3 h-3 text-indigo-500" />
              离散数学步
            </button>
            <button
              onClick={() => {
                setIsAnimating(false);
                setPlayMode("physics");
                // Reset physics coordinates to initial value on switch
                physicsXRef.current = config.initialX;
                physicsYRef.current = config.initialY;
                physicsVxRef.current = 0;
                physicsVyRef.current = 0;
                physicsPathRef.current = [{
                  x: config.initialX,
                  y: config.initialY,
                  loss: preset.f(config.initialX, config.initialY)
                }];
              }}
              className={`px-2 py-1 font-semibold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                playMode === "physics" ? "bg-white text-rose-700 shadow-xs font-bold" : "text-slate-600 hover:text-slate-800"
              }`}
              title="重力与动量滚动物理模式（连续微分 ODE 算法）"
            >
              <Activity className="w-3 h-3 text-rose-500" />
              连续物理小球
            </button>
          </div>

          {/* Speed Selector */}
          {playMode === "math" && (
            <div className="flex items-center gap-1 bg-slate-50 border border-slate-150 p-1 rounded-lg text-[11px] font-medium shadow-xs">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px] px-1 mr-0.5">速度</span>
              {[
                { label: "0.5x", value: 250 },
                { label: "1.0x", value: 100 },
                { label: "2.5x", value: 40 },
                { label: "5.0x", value: 16 }
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => setPlaySpeed(opt.value)}
                  className={`px-1.5 py-0.5 rounded-md font-mono font-bold transition-all cursor-pointer ${
                    playSpeed === opt.value
                      ? "bg-indigo-650 text-white shadow-xs font-black"
                      : "text-slate-500 hover:text-slate-800 hover:bg-slate-200/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-1.5">
            {isAnimating ? (
              <button
                onClick={() => setIsAnimating(false)}
                className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-all border border-amber-200 cursor-pointer"
              >
                <Pause className="w-3.5 h-3.5" />
                暂停动画
              </button>
            ) : (
              <button
                onClick={() => {
                  setIsAnimating(true);
                  if (onStartOptimization) onStartOptimization();
                }}
                disabled={playMode === "math" && (!activeResult || activeResult.steps.length === 0)}
                className="flex items-center gap-1 px-3 py-1 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-all border border-indigo-200 cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                滚落仿真
              </button>
            )}

            <button
              onClick={() => {
                setIsAnimating(false);
                setAnimationStep(null);
                if (playMode === "math") {
                  onSelectStep(0);
                } else {
                  // Reset continuous physical states
                  physicsXRef.current = config.initialX;
                  physicsYRef.current = config.initialY;
                  physicsVxRef.current = 0;
                  physicsVyRef.current = 0;
                  physicsPathRef.current = [{
                    x: config.initialX,
                    y: config.initialY,
                    loss: preset.f(config.initialX, config.initialY)
                  }];
                  draw();
                }
              }}
              className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
              title="重置复位"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Drawing container */}
      <div className="flex-1 min-h-[300px] md:min-h-[420px] relative bg-white/40 grid-dot rounded-lg overflow-hidden border border-slate-100 flex items-center justify-center">
        {isLoading && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-xs flex flex-col items-center justify-center gap-2 z-10">
            <div className="w-8 h-8 border-3 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
            <span className="text-xs text-slate-500 font-medium">数学曲面计算重构中...</span>
          </div>
        )}
        <canvas
          ref={canvasRef}
          width={520}
          height={420}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          style={{ cursor: viewMode === "3d" ? (isDragging3D ? "grabbing" : "grab") : "crosshair" }}
          className="max-w-full w-full aspect-[52/42] rounded-md shadow-xs bg-white touch-none select-none"
        />

        {/* 3D attitude HUD gyroscope */}
        {viewMode === "3d" && isDragging3D && (
          <div 
            className="absolute top-3 right-3 bg-slate-900/95 text-white backdrop-blur-md px-3.5 py-2 rounded-lg border border-slate-700/50 shadow-xl text-xs font-mono space-y-1 pointer-events-none z-15 min-w-[150px]"
          >
            <div className="text-[10px] text-indigo-300 font-bold tracking-wider uppercase border-b border-slate-700 pb-1 mb-1 flex items-center justify-between">
              <span>3D 视角陀螺仪</span>
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400">偏航角 θ:</span>
              <span className="font-bold text-amber-400">{rotationTheta}°</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-400">俯仰角 φ:</span>
              <span className="font-bold text-amber-400">{rotationPhi}°</span>
            </div>
          </div>
        )}

        {/* 2D & Taylor real-time numerical coordinates HUD */}
        {hoveredCoords && (viewMode === "2d" || viewMode === "taylor") && (
          <div 
            className="absolute top-3 right-3 bg-slate-900/90 text-white backdrop-blur-md px-3.5 py-2.5 rounded-lg border border-slate-700/50 shadow-xl text-xs font-mono space-y-1.5 pointer-events-none z-15 min-w-[160px]"
          >
            <div className="flex items-center justify-between text-[10px] text-indigo-300 font-bold tracking-wider uppercase border-b border-slate-700 pb-1">
              <span>数值坐标仪 HUD</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">坐标 X:</span>
              <span className="font-bold text-white">{hoveredCoords.x.toFixed(3)}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-slate-400">坐标 Y:</span>
              <span className="font-bold text-white">{hoveredCoords.y.toFixed(3)}</span>
            </div>
            <div className="flex justify-between gap-4 border-t border-slate-800 pt-1">
              <span className="text-indigo-200">f(x, y) / Loss:</span>
              <span className="font-bold text-emerald-400">{hoveredCoords.z.toFixed(3)}</span>
            </div>
          </div>
        )}
        
        {/* Colors bar description legend for 2D mode */}
        {viewMode === "2d" && (
          <div className="absolute bottom-3 left-3 bg-white/90 backdrop-blur-xs px-2.5 py-1.5 rounded border border-slate-100 flex items-center gap-2 shadow-xs text-[10px]">
            <span className="text-slate-600 font-medium">解空间 Loss:</span>
            <div className="w-24 h-2 rounded bg-gradient-to-r from-[hsl(220,55%,85%)] via-[hsl(150,50%,90%)] to-[hsl(80,50%,90%)] border border-slate-200"></div>
            <div className="flex items-center gap-4 text-slate-500 font-mono">
              <span>高 (蓝)</span>
              <span>低 (金/绿)</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom status description indicator line */}
      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-600"></span>
            <span>当前: {activeResult?.optimizerName || "无"}</span>
          </div>
          {preset.globalMinima && preset.globalMinima.length > 0 && (
            <span>已知全局极小点: ({preset.globalMinima[0].map(v => v.toFixed(3)).join(", ")})</span>
          )}
        </div>
        <span className="text-[11px] text-slate-400 italic">2D/3D 画布完全基于物理方程数值直接渲染</span>
      </div>
    </div>
  );
}
