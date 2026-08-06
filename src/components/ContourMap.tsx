import React, { useRef, useEffect, useState } from 'react';
import { Terrain, TrajectoryResult } from '../types';
import { MousePointer, Crosshair, MapPin, Compass, Sliders, Sparkles, Eye, ShieldAlert } from 'lucide-react';

interface Props {
  terrain: Terrain;
  trajectories: TrajectoryResult[];
  activeStep: number;
  onSelectStartPoint: (x: number, y: number) => void;
  selectedStartPoint: [number, number];
  smoothness?: number; // Smoothness factor 0 ~ 5
  onSmoothnessChange?: (val: number) => void;
}

export const ContourMap: React.FC<Props> = ({
  terrain,
  trajectories,
  activeStep,
  onSelectStartPoint,
  selectedStartPoint,
  smoothness: externalSmoothness,
  onSmoothnessChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Internal smoothness state if not controlled externally
  const [localSmoothness, setLocalSmoothness] = useState<number>(2.0);
  const smoothness = externalSmoothness !== undefined ? externalSmoothness : localSmoothness;

  const handleSmoothnessUpdate = (val: number) => {
    setLocalSmoothness(val);
    if (onSmoothnessChange) {
      onSmoothnessChange(val);
    }
  };

  // Hover state for interactive inspection
  const [hoverInfo, setHoverInfo] = useState<{
    worldX: number;
    worldY: number;
    canvasX: number;
    canvasY: number;
    loss: number;
    gradX: number;
    gradY: number;
    gradNorm: number;
  } | null>(null);

  const [showGradField, setShowGradField] = useState(true);
  const [numContourLines, setNumContourLines] = useState<number>(20);

  // Canvas dimensions
  const bounds = terrain.bounds;
  const range = bounds[1] - bounds[0];

  // Helper coordinate transforms
  const worldToCanvas = (wx: number, wy: number, size: number) => {
    const cx = ((wx - bounds[0]) / range) * size;
    const cy = size - ((wy - bounds[0]) / range) * size; // flip y for canvas
    return [cx, cy];
  };

  const canvasToWorld = (cx: number, cy: number, size: number) => {
    const wx = bounds[0] + (cx / size) * range;
    const wy = bounds[0] + ((size - cy) / size) * range;
    return [wx, wy];
  };

  // Optimized Draw 2D Contour Map with Gaussian Blur Filtering
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = canvas.width;
    ctx.clearRect(0, 0, size, size);

    // Resolution step size (2px for ultra-fine grid)
    const step = 2;
    const cols = Math.floor(size / step) + 1;
    const rows = Math.floor(size / step) + 1;

    // 1. Precalculate raw loss sampling grid
    const rawGrid: number[][] = new Array(rows);
    for (let r = 0; r < rows; r++) {
      rawGrid[r] = new Array(cols);
      const py = r * step;
      const wy = bounds[0] + ((size - py) / size) * range;
      for (let c = 0; c < cols; c++) {
        const px = c * step;
        const wx = bounds[0] + (px / size) * range;
        let l = terrain.fn(wx, wy);
        if (isNaN(l) || !isFinite(l)) l = 200;
        l = Math.min(l, 250);
        rawGrid[r][c] = l;
      }
    }

    // 2. Perform Separable 2D Gaussian Blur Pass if smoothness > 0
    let grid = rawGrid;
    if (smoothness > 0) {
      const kernelRadius = Math.min(5, Math.max(1, Math.round(smoothness * 1.5)));
      const sigma = Math.max(0.3, smoothness * 0.9);

      // Create 1D Gaussian Kernel
      const kernelSize = kernelRadius * 2 + 1;
      const kernel = new Float32Array(kernelSize);
      let kernelSum = 0;
      for (let i = -kernelRadius; i <= kernelRadius; i++) {
        const w = Math.exp(-(i * i) / (2 * sigma * sigma));
        kernel[i + kernelRadius] = w;
        kernelSum += w;
      }
      for (let i = 0; i < kernelSize; i++) {
        kernel[i] /= kernelSum;
      }

      // Horizontal Pass
      const tempGrid: number[][] = new Array(rows);
      for (let r = 0; r < rows; r++) {
        tempGrid[r] = new Array(cols);
        for (let c = 0; c < cols; c++) {
          let sum = 0;
          for (let k = -kernelRadius; k <= kernelRadius; k++) {
            const sc = Math.max(0, Math.min(cols - 1, c + k));
            sum += rawGrid[r][sc] * kernel[k + kernelRadius];
          }
          tempGrid[r][c] = sum;
        }
      }

      // Vertical Pass
      grid = new Array(rows);
      for (let r = 0; r < rows; r++) {
        grid[r] = new Array(cols);
        for (let c = 0; c < cols; c++) {
          let sum = 0;
          for (let k = -kernelRadius; k <= kernelRadius; k++) {
            const sr = Math.max(0, Math.min(rows - 1, r + k));
            sum += tempGrid[sr][c] * kernel[k + kernelRadius];
          }
          grid[r][c] = sum;
        }
      }
    }

    // Find min and max loss on smoothed grid for accurate color mapping
    let minLoss = Infinity;
    let maxLoss = -Infinity;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const val = grid[r][c];
        if (val < minLoss) minLoss = val;
        if (val > maxLoss) maxLoss = val;
      }
    }
    const lossSpan = maxLoss - minLoss || 1;

    // 3. Render Pixel Color Heatmap
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    for (let py = 0; py < size; py++) {
      const r = Math.min(rows - 1, Math.floor(py / step));
      for (let px = 0; px < size; px++) {
        const c = Math.min(cols - 1, Math.floor(px / step));
        const loss = grid[r][c];
        const norm = Math.min(1, Math.max(0, (loss - minLoss) / lossSpan));

        // Refined Color palette: Deep Indigo/Teal (Low Loss) -> Emerald -> Warm Amber -> Crimson Pink (High Loss)
        let red = 0, green = 0, blue = 0;
        if (norm < 0.25) {
          const t = norm / 0.25;
          red = Math.floor(215 + t * 25);
          green = Math.floor(238 + t * 10);
          blue = Math.floor(250 - t * 30); // Cool Ice Blue
        } else if (norm < 0.55) {
          const t = (norm - 0.25) / 0.3;
          red = Math.floor(180 + t * 40);
          green = Math.floor(225 - t * 30);
          blue = Math.floor(210 - t * 70); // Mint Green
        } else if (norm < 0.8) {
          const t = (norm - 0.55) / 0.25;
          red = Math.floor(250 - t * 10);
          green = Math.floor(210 - t * 60);
          blue = Math.floor(160 - t * 80); // Gold Amber
        } else {
          const t = (norm - 0.8) / 0.2;
          red = Math.floor(244 + t * 10);
          green = Math.floor(140 - t * 40);
          blue = Math.floor(140 - t * 40); // Soft Crimson
        }

        const idx = (py * size + px) * 4;
        data[idx] = red;
        data[idx + 1] = green;
        data[idx + 2] = blue;
        data[idx + 3] = 240;
      }
    }

    ctx.putImageData(imgData, 0, 0);

    // 4. Render Smooth Isoline Contour Curves
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(51, 65, 85, 0.3)'; // slate-700 isoline

    for (let i = 1; i <= numContourLines; i++) {
      const targetLoss = minLoss + (i / numContourLines) * lossSpan;
      ctx.beginPath();

      for (let r = 0; r < rows - 1; r++) {
        const py = r * step;
        for (let c = 0; c < cols - 1; c++) {
          const px = c * step;
          const val00 = grid[r][c];
          const val10 = grid[r][c + 1];
          const val01 = grid[r + 1][c];

          // Check if targetLoss crosses horizontal or vertical cell boundary
          if (
            (val00 <= targetLoss && val10 >= targetLoss) ||
            (val00 >= targetLoss && val10 <= targetLoss) ||
            (val00 <= targetLoss && val01 >= targetLoss) ||
            (val00 >= targetLoss && val01 <= targetLoss)
          ) {
            ctx.rect(px, py, step, step);
          }
        }
      }
      ctx.stroke();
    }

    // 5. Draw Grid Coordinate Axes
    const [originX, originY] = worldToCanvas(0, 0, size);
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.45)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 4]);

    // X axis
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(size, originY);
    ctx.stroke();

    // Y axis
    ctx.beginPath();
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, size);
    ctx.stroke();

    ctx.setLineDash([]); // Reset dash

    // 6. Global Minimum Marker ⭐
    const [minCx, minCy] = worldToCanvas(terrain.minPoint[0], terrain.minPoint[1], size);
    ctx.fillStyle = '#10b981'; // Emerald
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;

    ctx.beginPath();
    ctx.arc(minCx, minCy, 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#065f46';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('★ 极小值', minCx + 10, minCy + 4);

    // 7. Vector Field Downhill Arrows
    if (showGradField) {
      const arrowGrid = 12;
      ctx.strokeStyle = 'rgba(71, 85, 105, 0.4)';
      ctx.lineWidth = 1;

      for (let i = 1; i < arrowGrid; i++) {
        for (let j = 1; j < arrowGrid; j++) {
          const cx = (i / arrowGrid) * size;
          const cy = (j / arrowGrid) * size;
          const [wx, wy] = canvasToWorld(cx, cy, size);
          const [gx, gy] = terrain.grad(wx, wy);

          const mag = Math.hypot(gx, gy);
          if (mag > 1e-4) {
            const dirX = -gx / mag;
            const dirY = -gy / mag;

            const arrowLen = 10;
            const endCx = cx + dirX * arrowLen;
            const endCy = cy - dirY * arrowLen;

            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.lineTo(endCx, endCy);
            ctx.stroke();

            // Arrowhead
            const angle = Math.atan2(-dirY, dirX);
            ctx.beginPath();
            ctx.moveTo(endCx, endCy);
            ctx.lineTo(
              endCx - 3 * Math.cos(angle - Math.PI / 6),
              endCy - 3 * Math.sin(angle - Math.PI / 6)
            );
            ctx.lineTo(
              endCx - 3 * Math.cos(angle + Math.PI / 6),
              endCy - 3 * Math.sin(angle + Math.PI / 6)
            );
            ctx.closePath();
            ctx.fillStyle = 'rgba(71, 85, 105, 0.5)';
            ctx.fill();
          }
        }
      }
    }

    // 8. Draw Selected Starting Birth Point 🎯
    if (selectedStartPoint) {
      const [stCx, stCy] = worldToCanvas(selectedStartPoint[0], selectedStartPoint[1], size);

      ctx.strokeStyle = '#0284c7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(stCx, stCy, 10, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#0284c7';
      ctx.beginPath();
      ctx.arc(stCx, stCy, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#0369a1';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(
        `起点 (${selectedStartPoint[0].toFixed(2)}, ${selectedStartPoint[1].toFixed(2)})`,
        stCx + 12,
        stCy - 8
      );
    }

    // 9. Draw Trajectory Paths & Step Dots
    trajectories.forEach((traj) => {
      const history = traj.history.slice(0, activeStep + 1);
      if (history.length === 0) return;

      ctx.strokeStyle = traj.color;
      ctx.lineWidth = 2.5;
      ctx.beginPath();

      history.forEach((pt, idx) => {
        const [cx, cy] = worldToCanvas(pt.x, pt.y, size);
        if (idx === 0) {
          ctx.moveTo(cx, cy);
        } else {
          ctx.lineTo(cx, cy);
        }
      });
      ctx.stroke();

      history.forEach((pt, idx) => {
        const [cx, cy] = worldToCanvas(pt.x, pt.y, size);
        const isLatest = idx === history.length - 1;

        ctx.fillStyle = isLatest ? traj.color : '#ffffff';
        ctx.strokeStyle = traj.color;
        ctx.lineWidth = isLatest ? 2.5 : 1.5;

        ctx.beginPath();
        ctx.arc(cx, cy, isLatest ? 6 : 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        if (isLatest) {
          ctx.fillStyle = traj.color;
          ctx.font = 'bold 10px monospace';
          ctx.fillText(`Step ${pt.step}`, cx + 8, cy + 12);
        }
      });
    });
  }, [terrain, trajectories, activeStep, selectedStartPoint, showGradField, smoothness, numContourLines]);

  // Handle Canvas Click
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const [wx, wy] = canvasToWorld(cx, cy, canvas.width);
    onSelectStartPoint(
      Math.max(bounds[0], Math.min(bounds[1], parseFloat(wx.toFixed(2)))),
      Math.max(bounds[0], Math.min(bounds[1], parseFloat(wy.toFixed(2))))
    );
  };

  // Handle Hover Inspector
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;

    const [wx, wy] = canvasToWorld(cx, cy, canvas.width);
    const loss = terrain.fn(wx, wy);
    const [gx, gy] = terrain.grad(wx, wy);

    setHoverInfo({
      worldX: wx,
      worldY: wy,
      canvasX: cx,
      canvasY: cy,
      loss,
      gradX: gx,
      gradY: gy,
      gradNorm: Math.hypot(gx, gy),
    });
  };

  return (
    <div className="relative w-full h-full min-h-[420px] bg-slate-50 rounded-xl overflow-hidden border border-slate-200/80 shadow-sm flex flex-col items-center justify-between p-3">
      {/* Top Banner with Smoothness Controls */}
      <div className="w-full flex flex-wrap items-center justify-between pb-2 mb-2 border-b border-slate-200/80 text-xs text-slate-700 gap-2">
        <div className="flex items-center gap-2 font-medium">
          <Compass className="w-3.5 h-3.5 text-indigo-600" />
          <span>2D 俯瞰等高线 (Contour Map)</span>
          {smoothness > 0 ? (
            <span className="text-[10px] bg-indigo-50 text-indigo-700 font-mono px-2 py-0.5 rounded-full border border-indigo-200 flex items-center gap-1 font-semibold">
              <Sparkles className="w-3 h-3 text-indigo-500" />
              高斯平滑 {smoothness.toFixed(1)}px
            </span>
          ) : (
            <span className="text-[10px] bg-slate-100 text-slate-500 font-mono px-2 py-0.5 rounded-full">
              无滤波 (原始地形)
            </span>
          )}
        </div>

        {/* Inline Smoothness Slider & Vector Toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-white px-2 py-1 rounded-lg border border-slate-200 text-[11px]">
            <Sliders className="w-3 h-3 text-slate-500" />
            <span className="text-slate-600 font-medium">平滑度:</span>
            <input
              type="range"
              min="0"
              max="5"
              step="0.5"
              value={smoothness}
              onChange={(e) => handleSmoothnessUpdate(parseFloat(e.target.value))}
              className="w-16 accent-indigo-600 h-1.5 cursor-pointer"
            />
            <span className="font-mono text-indigo-600 font-bold w-6 text-right">
              {smoothness.toFixed(1)}
            </span>
          </div>

          <button
            onClick={() => setShowGradField(!showGradField)}
            className={`px-2 py-1 rounded transition text-[11px] font-medium ${
              showGradField ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'
            }`}
          >
            {showGradField ? '隐藏下山场' : '显示下山场'}
          </button>
        </div>
      </div>

      {/* Main Interactive Canvas */}
      <div className="relative cursor-crosshair group flex-1 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={450}
          height={450}
          onClick={handleCanvasClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setHoverInfo(null)}
          className="rounded-lg border border-slate-300 shadow-inner bg-white max-w-full h-auto"
        />

        {/* Hover Inspector Tooltip Overlay */}
        {hoverInfo && (
          <div
            className="absolute z-20 pointer-events-none bg-slate-900/90 text-white text-[11px] p-2.5 rounded-lg shadow-lg backdrop-blur-md border border-slate-700 space-y-1 w-48"
            style={{
              left: Math.min(240, Math.max(10, hoverInfo.canvasX + 15)),
              top: Math.min(240, Math.max(10, hoverInfo.canvasY - 70)),
            }}
          >
            <div className="font-mono text-emerald-400 font-semibold border-b border-slate-700 pb-1 flex justify-between">
              <span>坐标 (x, y)</span>
              <span>
                ({hoverInfo.worldX.toFixed(2)}, {hoverInfo.worldY.toFixed(2)})
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>损失 Loss f:</span>
              <span className="font-mono text-amber-300">{hoverInfo.loss.toFixed(4)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>梯度 ∇f:</span>
              <span className="font-mono text-cyan-300">
                ({hoverInfo.gradX.toFixed(2)}, {hoverInfo.gradY.toFixed(2)})
              </span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>梯度模长 ||∇f||:</span>
              <span className="font-mono text-indigo-300">{hoverInfo.gradNorm.toFixed(4)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Hint */}
      <div className="mt-2 text-center text-[11px] text-slate-500 flex items-center justify-center gap-1.5">
        <MapPin className="w-3.5 h-3.5 text-sky-600" />
        <span>点击地图任意位置可直接设定出生点 (Click to set start point)</span>
      </div>
    </div>
  );
};

