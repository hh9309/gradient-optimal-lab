import React, { useState, useEffect, useMemo, useRef } from 'react';
import * as math from 'mathjs';
import {
  Calculator,
  Play,
  RotateCcw,
  Sparkles,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Compass,
  Layers,
  ArrowRight,
  Code2,
  Sliders,
  TrendingDown,
  Activity,
  Zap,
} from 'lucide-react';

interface CustomStep {
  step: number;
  x: number;
  y: number;
  loss: number;
  gradX: number;
  gradY: number;
  gradNorm: number;
}

export const FunctionGradientSandbox: React.FC = () => {
  // Preset Math Formulas
  const PRESETS = [
    {
      name: '标准二次碗 (Bowl)',
      formula: 'x^2 + 2 * y^2',
      start: [-3, 3] as [number, number],
      desc: '正定凸二次曲面，梯度匀速指向原点',
    },
    {
      name: 'Rosenbrock 香蕉函数',
      formula: '100 * (y - x^2)^2 + (1 - x)^2',
      start: [-1.2, 1] as [number, number],
      desc: '非凸病态平坦狭长山谷，考验梯度优化曲率自适应',
    },
    {
      name: '鞍点函数 (Saddle Point)',
      formula: 'x^2 - y^2',
      start: [0.1, 2] as [number, number],
      desc: '经典一正一负曲率鞍点，一阶梯度在零点处消失',
    },
    {
      name: 'Himmelblau 多峰函数',
      formula: '(x^2 + y - 11)^2 + (x + y^2 - 7)^2',
      start: [-0.5, -0.5] as [number, number],
      desc: '具有 4 个局部极小值的经典非凸多极值函数',
    },
    {
      name: 'Rastrigin 波浪函数',
      formula: '20 + x^2 + y^2 - 10 * (cos(2 * pi * x) + cos(2 * pi * y))',
      start: [2.5, 2.5] as [number, number],
      desc: '高度高频震荡多峰曲面，极易陷入局部陷阱',
    },
    {
      name: '包含交叉项 (Cross Term)',
      formula: 'x^2 + 3 * x * y + 3 * y^2',
      start: [-2.5, 2] as [number, number],
      desc: 'Hessian 矩阵非对角线分量不为零的斜山谷',
    },
  ];

  const [formulaInput, setFormulaInput] = useState('x^2 + 2 * y^2');
  const [probePoint, setProbePoint] = useState<[number, number]>([-2.5, 2.5]);
  const [learningRate, setLearningRate] = useState(0.05);
  const [momentum, setMomentum] = useState(0.8);
  const [maxSteps, setMaxSteps] = useState(50);
  const [optimAlgo, setOptimAlgo] = useState<'sgd' | 'momentum' | 'adam'>('adam');

  // Trajectory State
  const [trajectory, setTrajectory] = useState<CustomStep[]>([]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Compile mathjs expression safely
  const parsedData = useMemo(() => {
    try {
      const compiled = math.compile(formulaInput);

      // Evaluate helper
      const evalFn = (xVal: number, yVal: number): number => {
        const val = compiled.evaluate({ x: xVal, y: yVal });
        return typeof val === 'number' && !isNaN(val) && isFinite(val) ? val : 0;
      };

      // Symbolic derivatives
      let symGradXStr = '无法自动符号求导';
      let symGradYStr = '无法自动符号求导';
      try {
        symGradXStr = math.derivative(formulaInput, 'x').toString();
        symGradYStr = math.derivative(formulaInput, 'y').toString();
      } catch {
        // Fallback if symbolic derivative fails for complex functions
      }

      // Finite Difference Numerical Gradient
      const numGradFn = (xVal: number, yVal: number, h = 1e-5): [number, number] => {
        const gx = (evalFn(xVal + h, yVal) - evalFn(xVal - h, yVal)) / (2 * h);
        const gy = (evalFn(xVal, yVal + h) - evalFn(xVal, yVal - h)) / (2 * h);
        return [gx, gy];
      };

      // Finite Difference Hessian Matrix
      const hessianFn = (
        xVal: number,
        yVal: number,
        h = 1e-4
      ): [[number, number], [number, number]] => {
        const f0 = evalFn(xVal, yVal);
        const fxx = (evalFn(xVal + h, yVal) - 2 * f0 + evalFn(xVal - h, yVal)) / (h * h);
        const fyy = (evalFn(xVal, yVal + h) - 2 * f0 + evalFn(xVal, yVal - h)) / (h * h);
        const fxy =
          (evalFn(xVal + h, yVal + h) -
            evalFn(xVal + h, yVal - h) -
            evalFn(xVal - h, yVal + h) +
            evalFn(xVal - h, yVal - h)) /
          (4 * h * h);
        return [
          [fxx, fxy],
          [fxy, fyy],
        ];
      };

      setParseError(null);
      return {
        valid: true,
        evalFn,
        numGradFn,
        hessianFn,
        symGradXStr,
        symGradYStr,
      };
    } catch (err: any) {
      setParseError(err?.message || '公式语法错误，请检查括号与运算符');
      return {
        valid: false,
        evalFn: () => 0,
        numGradFn: () => [0, 0],
        hessianFn: () => [
          [0, 0],
          [0, 0],
        ],
        symGradXStr: 'Err',
        symGradYStr: 'Err',
      };
    }
  }, [formulaInput]);

  // Current probe point calculations
  const probeMetrics = useMemo(() => {
    if (!parsedData.valid) return null;
    const [x, y] = probePoint;
    const loss = parsedData.evalFn(x, y);
    const [gx, gy] = parsedData.numGradFn(x, y);
    const gradNorm = Math.hypot(gx, gy);
    const hess = parsedData.hessianFn(x, y);

    // Eigenvalues of 2x2 Hessian
    const a = hess[0][0];
    const b = hess[0][1];
    const d = hess[1][1];
    const trace = a + d;
    const det = a * d - b * b;
    const disc = Math.sqrt(Math.max(0, trace * trace - 4 * det));
    const eig1 = (trace + disc) / 2;
    const eig2 = (trace - disc) / 2;

    let curvatureType = '正定凸结构 (局部极小)';
    if (eig1 > 0 && eig2 > 0) curvatureType = '正定凸结构 (局部极小点/谷底)';
    else if (eig1 < 0 && eig2 < 0) curvatureType = '负定凹结构 (局部极大点)';
    else if (eig1 * eig2 < 0) curvatureType = '不定结构 (鞍点 Saddle Point)';

    return {
      loss,
      gx,
      gy,
      gradNorm,
      hess,
      det,
      trace,
      eig1,
      eig2,
      curvatureType,
    };
  }, [parsedData, probePoint]);

  // Run Custom Optimization Trajectory Simulation
  const runOptimization = () => {
    if (!parsedData.valid) return;

    setIsSimulating(true);
    let curX = probePoint[0];
    let curY = probePoint[1];
    let vx = 0;
    let vy = 0;
    let mX = 0,
      mY = 0;
    let vX = 0,
      vY = 0;

    const history: CustomStep[] = [];
    const alpha = learningRate;
    const beta = momentum;

    for (let step = 0; step <= maxSteps; step++) {
      const loss = parsedData.evalFn(curX, curY);
      const [gx, gy] = parsedData.numGradFn(curX, curY);
      const gradNorm = Math.hypot(gx, gy);

      history.push({
        step,
        x: curX,
        y: curY,
        loss,
        gradX: gx,
        gradY: gy,
        gradNorm,
      });

      if (gradNorm < 1e-4 || isNaN(curX) || isNaN(curY) || Math.abs(curX) > 20) break;

      // Update rule
      if (optimAlgo === 'sgd') {
        curX -= alpha * gx;
        curY -= alpha * gy;
      } else if (optimAlgo === 'momentum') {
        vx = beta * vx + alpha * gx;
        vy = beta * vy + alpha * gy;
        curX -= vx;
        curY -= vy;
      } else if (optimAlgo === 'adam') {
        const b1 = 0.9;
        const b2 = 0.999;
        const eps = 1e-8;
        mX = b1 * mX + (1 - b1) * gx;
        mY = b1 * mY + (1 - b1) * gy;
        vX = b2 * vX + (1 - b2) * gx * gx;
        vY = b2 * vY + (1 - b2) * gy * gy;

        const mXHat = mX / (1 - Math.pow(b1, step + 1));
        const mYHat = mY / (1 - Math.pow(b1, step + 1));
        const vXHat = vX / (1 - Math.pow(b2, step + 1));
        const vYHat = vY / (1 - Math.pow(b2, step + 1));

        curX -= (alpha * mXHat) / (Math.sqrt(vXHat) + eps);
        curY -= (alpha * mYHat) / (Math.sqrt(vYHat) + eps);
      }
    }

    setTrajectory(history);
    setIsSimulating(false);
  };

  // Auto-trigger simulation when parsed formula or parameters change
  useEffect(() => {
    if (parsedData.valid) {
      runOptimization();
    }
  }, [parsedData, probePoint, learningRate, momentum, maxSteps, optimAlgo]);

  // Render 2D Canvas Contour Heatmap & Trajectory
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !parsedData.valid) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const bounds = 4; // -4 to 4
    const toCanvasX = (x: number) => ((x + bounds) / (2 * bounds)) * width;
    const toCanvasY = (y: number) => ((bounds - y) / (2 * bounds)) * height;

    // 1. Draw Background Heatmap
    const imgData = ctx.createImageData(width, height);
    const data = imgData.data;

    // Compute range for normalization
    let minZ = Infinity;
    let maxZ = -Infinity;
    const sampleStep = 8;

    for (let py = 0; py < height; py += sampleStep) {
      const y = bounds - (py / height) * (2 * bounds);
      for (let px = 0; px < width; px += sampleStep) {
        const x = (px / width) * (2 * bounds) - bounds;
        const z = parsedData.evalFn(x, y);
        if (z < minZ) minZ = z;
        if (z > maxZ) maxZ = z;
      }
    }

    const zRange = Math.max(1e-5, maxZ - minZ);

    for (let py = 0; py < height; py += 2) {
      const y = bounds - (py / height) * (2 * bounds);
      for (let px = 0; px < width; px += 2) {
        const x = (px / width) * (2 * bounds) - bounds;
        const z = parsedData.evalFn(x, y);
        const normZ = Math.min(1, Math.max(0, (z - minZ) / zRange));

        // Color gradient from dark navy to indigo to light cyan
        const r = Math.floor(15 + normZ * 120);
        const g = Math.floor(23 + normZ * 180);
        const b = Math.floor(42 + normZ * 210);

        const idx = (py * width + px) * 4;
        data[idx] = r;
        data[idx + 1] = g;
        data[idx + 2] = b;
        data[idx + 3] = 230;

        // Fill 2x2 block
        const idxNext = ((py + 1) * width + px) * 4;
        if (py + 1 < height) {
          data[idxNext] = r;
          data[idxNext + 1] = g;
          data[idxNext + 2] = b;
          data[idxNext + 3] = 230;
        }
      }
    }
    ctx.putImageData(imgData, 0, 0);

    // 2. Draw Grid Axes
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, toCanvasY(0));
    ctx.lineTo(width, toCanvasY(0));
    ctx.moveTo(toCanvasX(0), 0);
    ctx.lineTo(toCanvasX(0), height);
    ctx.stroke();

    // 3. Draw Gradient Field Arrows (Sample 12x12)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 1;

    for (let gx = -3.5; gx <= 3.5; gx += 0.7) {
      for (let gy = -3.5; gy <= 3.5; gy += 0.7) {
        const [dfx, dfy] = parsedData.numGradFn(gx, gy);
        const norm = Math.hypot(dfx, dfy);
        if (norm > 1e-4) {
          const arrowLen = 14;
          const uX = (dfx / norm) * arrowLen;
          const uY = (dfy / norm) * arrowLen;

          const cx = toCanvasX(gx);
          const cy = toCanvasY(gy);

          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + uX, cy - uY);
          ctx.stroke();
        }
      }
    }

    // 4. Draw Trajectory Trail
    if (trajectory.length > 1) {
      ctx.strokeStyle = '#38bdf8'; // Cyan line
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      trajectory.forEach((pt, i) => {
        const cx = toCanvasX(pt.x);
        const cy = toCanvasY(pt.y);
        if (i === 0) ctx.moveTo(cx, cy);
        else ctx.lineTo(cx, cy);
      });
      ctx.stroke();

      // Draw trajectory points
      trajectory.forEach((pt, i) => {
        const cx = toCanvasX(pt.x);
        const cy = toCanvasY(pt.y);
        ctx.fillStyle = i === 0 ? '#38bdf8' : i === trajectory.length - 1 ? '#10b981' : '#f59e0b';
        ctx.beginPath();
        ctx.arc(cx, cy, i === 0 || i === trajectory.length - 1 ? 5 : 2.5, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    // 5. Draw Probe Point Target
    const px = toCanvasX(probePoint[0]);
    const py = toCanvasY(probePoint[1]);
    ctx.strokeStyle = '#ec4899';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(px, py, 7, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#ec4899';
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fill();
  }, [parsedData, probePoint, trajectory]);

  // Handle canvas click to set probe point
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const bounds = 4;
    const realX = (clickX / canvas.width) * (2 * bounds) - bounds;
    const realY = bounds - (clickY / canvas.height) * (2 * bounds);

    setProbePoint([parseFloat(realX.toFixed(2)), parseFloat(realY.toFixed(2))]);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-md border border-slate-800">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3 border border-indigo-500/30">
          <Calculator className="w-3.5 h-3.5" />
          <span>自由函数梯度解析与 MathJS 运算引擎 (Custom Math Expression Parser)</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-white">
          任意二维函数公式解析与梯度求导实验室
        </h1>
        <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
          依托 `mathjs` 解析器，支持自主输入任意复杂的二维数学函数表达式，实时进行符号导数推导、数值差分梯度计算、Hessian 矩阵曲率检验与梯度下降追踪。
        </p>
      </div>

      {/* Preset Quick Selectors & Math Formula Input */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm">
                一键加载经典测试函数 / 自定义公式输入
              </h2>
              <p className="text-[11px] text-slate-500">
                支持 `x`, `y` 变量与 `sin`, `cos`, `exp`, `pi`, `abs`, `sqrt` 等常用运算符
              </p>
            </div>
          </div>

          {parseError ? (
            <div className="flex items-center gap-1.5 text-xs text-rose-600 font-medium bg-rose-50 px-3 py-1 rounded-lg border border-rose-200">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{parseError}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-emerald-700 font-medium bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span>MathJS 解析器验证成功</span>
            </div>
          )}
        </div>

        {/* Preset Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <span className="text-xs font-semibold text-slate-500 shrink-0">预设模板:</span>
          {PRESETS.map((p) => (
            <button
              key={p.name}
              onClick={() => {
                setFormulaInput(p.formula);
                setProbePoint(p.start);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium transition shrink-0 ${
                formulaInput === p.formula
                  ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              {p.name}
            </button>
          ))}
        </div>

        {/* Formula Text Input Box */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
            <span>目标函数公式 $f(x, y) = $</span>
            <span className="text-slate-400 font-normal text-[11px]">
              示例: `x^2 + 3 * x * y + sin(y)` 或 `100 * (y - x^2)^2 + (1 - x)^2`
            </span>
          </label>
          <div className="relative">
            <input
              type="text"
              value={formulaInput}
              onChange={(e) => setFormulaInput(e.target.value)}
              placeholder="请输入数学公式，例如: x^2 + y^2"
              className={`w-full px-4 py-3 rounded-xl border text-sm font-mono focus:ring-2 outline-none transition shadow-inner ${
                parseError
                  ? 'border-rose-400 focus:ring-rose-400 bg-rose-50/20'
                  : 'border-slate-300 focus:ring-indigo-500 bg-slate-900 text-emerald-400 font-semibold'
              }`}
            />
          </div>
        </div>
      </div>

      {/* Main Grid Layout: Interactive Canvas & Math Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: 2D Contour Map with Canvas Click (7 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
                <Compass className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  自定义函数等高线 & 梯度流分布图
                </h3>
                <p className="text-[11px] text-slate-500">
                  点击画布任意位置设置探针采样点，实线为梯度下降优化轨迹
                </p>
              </div>
            </div>

            <div className="text-[11px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100">
              P_probe: ({probePoint[0].toFixed(2)}, {probePoint[1].toFixed(2)})
            </div>
          </div>

          {/* Interactive Canvas */}
          <div className="relative aspect-square w-full rounded-xl overflow-hidden border border-slate-300 bg-slate-950 flex items-center justify-center">
            <canvas
              ref={canvasRef}
              width={500}
              height={500}
              onClick={handleCanvasClick}
              className="w-full h-full cursor-crosshair object-cover"
            />
            <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-xs text-white text-[10px] px-2.5 py-1 rounded-md border border-slate-700/80 font-mono">
              点击画布重置起点 P_0
            </div>
          </div>

          {/* Optimization Algorithm Controls */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-indigo-600" />
                梯度下降算法与超参数设置
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                Steps: {trajectory.length > 0 ? trajectory.length - 1 : 0}/{maxSteps}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-slate-600 font-medium mb-1 block">优化算法</label>
                <select
                  value={optimAlgo}
                  onChange={(e) => setOptimAlgo(e.target.value as any)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white font-semibold text-slate-800"
                >
                  <option value="sgd">Standard SGD</option>
                  <option value="momentum">Momentum (动量)</option>
                  <option value="adam">Adam (自适应矩)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-600 font-medium mb-1 block">
                  学习率 $\alpha$: {learningRate}
                </label>
                <input
                  type="range"
                  min="0.001"
                  max="0.2"
                  step="0.005"
                  value={learningRate}
                  onChange={(e) => setLearningRate(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>

              <div>
                <label className="text-slate-600 font-medium mb-1 block">
                  动量/最大步数: β={momentum}
                </label>
                <input
                  type="range"
                  min="0.1"
                  max="0.95"
                  step="0.05"
                  value={momentum}
                  onChange={(e) => setMomentum(parseFloat(e.target.value))}
                  className="w-full accent-indigo-600"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Math Metrics & Derivative Analysis (5 cols) */}
        <div className="lg:col-span-5 space-y-5">
          {/* Symbolic vs Numerical Derivatives Panel */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Sparkles className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">符号求导与数值梯度对比</h3>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono space-y-1">
                <div className="text-indigo-400 text-[10px] font-bold uppercase">
                  Symbolic ∂f/∂x (x 偏导)
                </div>
                <div className="text-emerald-400 font-bold truncate">
                  {parsedData.symGradXStr}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900 text-slate-100 font-mono space-y-1">
                <div className="text-indigo-400 text-[10px] font-bold uppercase">
                  Symbolic ∂f/∂y (y 偏导)
                </div>
                <div className="text-emerald-400 font-bold truncate">
                  {parsedData.symGradYStr}
                </div>
              </div>

              {probeMetrics && (
                <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1">
                  <div className="text-indigo-900 font-bold text-[11px] flex justify-between">
                    <span>探针采样点 P_probe 梯度计算</span>
                    <span className="font-mono">({probePoint[0]}, {probePoint[1]})</span>
                  </div>
                  <div className="font-mono text-slate-800 text-[11px] space-y-0.5">
                    <div>f(x, y) = {probeMetrics.loss.toFixed(6)}</div>
                    <div>
                      ∇f = [{probeMetrics.gx.toFixed(5)}, {probeMetrics.gy.toFixed(5)}]
                    </div>
                    <div className="text-amber-700 font-bold">
                      ||∇f|| = {probeMetrics.gradNorm.toFixed(6)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Hessian Matrix & Local Curvature Analysis */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-slate-200 pb-2.5">
              <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                <Layers className="w-4 h-4" />
              </div>
              <h3 className="font-bold text-slate-900 text-sm">Hessian 海森矩阵与二次曲率</h3>
            </div>

            {probeMetrics ? (
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 font-mono space-y-1">
                  <div className="text-slate-500 text-[10px] font-bold">
                    Hessian Matrix H = [ [∂²f/∂x², ∂²f/∂x∂y], [∂²f/∂y∂x, ∂²f/∂y²] ]
                  </div>
                  <div className="text-slate-900 font-bold">
                    [ [{probeMetrics.hess[0][0].toFixed(3)}, {probeMetrics.hess[0][1].toFixed(3)}],
                    [{probeMetrics.hess[1][0].toFixed(3)}, {probeMetrics.hess[1][1].toFixed(3)}] ]
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-slate-500 text-[10px]">特征值 λ1</div>
                    <div className="font-mono font-bold text-indigo-600">
                      {probeMetrics.eig1.toFixed(4)}
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="text-slate-500 text-[10px]">特征值 λ2</div>
                    <div className="font-mono font-bold text-indigo-600">
                      {probeMetrics.eig2.toFixed(4)}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl font-medium text-[11px] flex items-center gap-2">
                  <Zap className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>
                    <strong>曲率诊断:</strong> {probeMetrics.curvatureType}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-xs py-4 text-center">请输入有效公式</div>
            )}
          </div>

          {/* Optimization Trajectory Metrics */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
                  <Activity className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-slate-900 text-sm">自定义函数优化迭代结果</h3>
              </div>
              <span className="text-xs font-mono font-bold text-indigo-600 uppercase">
                {optimAlgo}
              </span>
            </div>

            {trajectory.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 text-[10px]">起始 Loss</div>
                  <div className="font-mono font-bold text-slate-900">
                    {trajectory[0].loss.toFixed(6)}
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 text-[10px]">最终 Loss</div>
                  <div className="font-mono font-bold text-amber-600">
                    {trajectory[trajectory.length - 1].loss.toFixed(6)}
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 text-[10px]">最终收敛坐标</div>
                  <div className="font-mono font-bold text-slate-900 truncate">
                    ({trajectory[trajectory.length - 1].x.toFixed(3)},{' '}
                    {trajectory[trajectory.length - 1].y.toFixed(3)})
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <div className="text-slate-500 text-[10px]">最终梯度范数</div>
                  <div className="font-mono font-bold text-emerald-600">
                    {trajectory[trajectory.length - 1].gradNorm.toFixed(6)}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
