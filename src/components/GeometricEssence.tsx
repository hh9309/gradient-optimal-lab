import React, { useState, useEffect, useRef } from 'react';
import { Compass, Mountain, Activity, Grid, Play, Pause, RotateCcw, Sparkles, Lightbulb, Zap } from 'lucide-react';

export const GeometricEssence: React.FC = () => {
  // Directional Derivative Interactive Sandbox State
  const [gradX, setGradX] = useState(3.0);
  const [gradY, setGradY] = useState(4.0);
  const [angleDeg, setAngleDeg] = useState(0); // Angle in degrees relative to x axis

  // Auto-demo animation state
  const [isPlaying, setIsPlaying] = useState(false);
  const [animMode, setAnimMode] = useState<'sweep' | 'pulse_grad' | 'seek_steepest'>('sweep');
  const [animSpeed, setAnimSpeed] = useState<number>(1.0);

  const animFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const angleRad = (angleDeg * Math.PI) / 180;
  const vX = Math.cos(angleRad);
  const vY = Math.sin(angleRad);

  const gradNorm = Math.hypot(gradX, gradY);
  const gradAngleRad = Math.atan2(gradY, gradX);
  const gradAngleDeg = ((gradAngleRad * 180) / Math.PI + 360) % 360;

  // Directional derivative D_v f = ∇f · v
  const directionalDeriv = gradX * vX + gradY * vY;

  // Angle theta between ∇f and v
  const dotProd = gradNorm > 1e-6 ? (gradX * vX + gradY * vY) / gradNorm : 0;
  const cosTheta = Math.max(-1, Math.min(1, dotProd));
  const thetaDeg = (Math.acos(cosTheta) * 180) / Math.PI;

  // Animation Loop Effect
  useEffect(() => {
    if (!isPlaying) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    const animate = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const deltaTime = (timestamp - lastTimeRef.current) / 1000; // seconds
      lastTimeRef.current = timestamp;

      if (animMode === 'sweep') {
        // Continuous 360° rotation sweep of directional vector v
        setAngleDeg((prev) => (prev + 60 * deltaTime * animSpeed) % 360);
      } else if (animMode === 'pulse_grad') {
        // Oscillate gradient vector and rotate v simultaneously
        setAngleDeg((prev) => (prev + 45 * deltaTime * animSpeed) % 360);
        const timeSec = timestamp / 1000;
        setGradX(3.0 + 1.5 * Math.sin(timeSec * 2 * animSpeed));
        setGradY(3.0 + 1.5 * Math.cos(timeSec * 1.5 * animSpeed));
      } else if (animMode === 'seek_steepest') {
        // Smoothly target gradient angle + 180° (steepest descent direction)
        const targetAngle = (gradAngleDeg + 180) % 360;
        setAngleDeg((prev) => {
          let diff = targetAngle - prev;
          while (diff < -180) diff += 360;
          while (diff > 180) diff -= 360;
          if (Math.abs(diff) < 0.5) {
            setIsPlaying(false);
            return targetAngle;
          }
          return (prev + Math.sign(diff) * Math.min(Math.abs(diff), 90 * deltaTime * animSpeed) + 360) % 360;
        });
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, animMode, animSpeed, gradAngleDeg]);

  // Quick preset jumpers
  const jumpToTheta = (targetThetaDeg: number) => {
    setIsPlaying(false);
    // Align direction angle v such that angle with gradAngle is targetThetaDeg
    const newAngle = (gradAngleDeg + targetThetaDeg) % 360;
    setAngleDeg(newAngle < 0 ? newAngle + 360 : newAngle);
  };

  const resetAll = () => {
    setIsPlaying(false);
    setGradX(3.0);
    setGradY(4.0);
    setAngleDeg(0);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-2xl shadow-md border border-slate-800">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3 border border-indigo-500/30">
          <Compass className="w-3.5 h-3.5" /> 模块 1：几何本质与导数拓展
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-white">
          梯度的几何直观与 Hessian 曲率矩阵
        </h1>
        <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
          为什么梯度向量 ∇f(x) 是“大雾山谷中下山最陡的方向”？为什么它必然正交垂直于 2D 等高线？Hessian 矩阵又是如何决定曲面的弯曲特性与病态程度？
        </p>
      </div>

      {/* Slice Card Grid 1: Core Physical & Geometric Concepts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Slice 1: Mountain Fog Analogy */}
        <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm hover:border-indigo-200 transition space-y-3">
          <div className="w-10 h-10 rounded-lg bg-amber-50 border border-amber-200/80 flex items-center justify-center text-amber-600 font-bold">
            <Mountain className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-slate-800 text-base">1. 物理直观：大雾山谷下山</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            想象你站在浓雾弥漫的山峰上，视野为零。你无法看到远处山谷底部的全貌，但可以用双脚感受脚下斜坡在各个方向上的倾斜程度。**梯度**就是你脚下最陡峭的上坡方向，而**负梯度**就是你此刻下山最陡的方向。
          </p>
        </div>

        {/* Slice 2: Orthogonal to Contour Lines */}
        <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm hover:border-indigo-200 transition space-y-3">
          <div className="w-10 h-10 rounded-lg bg-sky-50 border border-sky-200/80 flex items-center justify-center text-sky-600 font-bold">
            <Grid className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-slate-800 text-base">2. 垂直等高线 (Orthogonality)</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            等高线上任何一点的函数值 f(x,y) = C 完全相同，因此沿等高线切线方向切向导数为 0。根据全微分 df = ∇f · dr = 0，梯度向量 ∇f 必定与等高线切线垂直！
          </p>
        </div>

        {/* Slice 3: Hessian & Curvature */}
        <div className="bg-white rounded-xl p-6 border border-slate-200/80 shadow-sm hover:border-indigo-200 transition space-y-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-600 font-bold">
            <Activity className="w-5 h-5" />
          </div>
          <h3 className="font-semibold text-slate-800 text-base">3. Hessian 矩阵与极值</h3>
          <p className="text-xs text-slate-600 leading-relaxed">
            梯度是一阶导数（描述陡峭程度），Hessian 矩阵是二阶偏导数矩阵 H = ∇²f（描述曲率弯曲度）。特征值 λ₁, λ₂ 决定了曲面是正定（极小值）、负定（极大值）还是不定（马鞍点）。
          </p>
        </div>
      </div>

      {/* Interactive Slice Section: Directional Derivative Simulator */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                交互式实验室
              </span>
              {isPlaying && (
                <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 flex items-center gap-1.5 animate-pulse">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  自动演示中 ({animMode === 'sweep' ? '360°旋转' : animMode === 'pulse_grad' ? '动态变频' : '寻最陡下降'})
                </span>
              )}
            </div>
            <h2 className="text-lg font-bold text-slate-800 mt-1">
              方向导数与向量内积演示 (Directional Derivative Sandbox)
            </h2>
          </div>

          {/* Auto Animation Control Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition shadow-xs ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white'
              }`}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isPlaying ? '暂停演示' : '播放演示'}</span>
            </button>

            {/* Anim Mode Selector */}
            <div className="inline-flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
              <button
                onClick={() => {
                  setAnimMode('sweep');
                  if (!isPlaying) setIsPlaying(true);
                }}
                className={`px-2.5 py-1 rounded font-medium transition ${
                  animMode === 'sweep' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="全视角旋转扫描方向向量"
              >
                360°扫描
              </button>
              <button
                onClick={() => {
                  setAnimMode('pulse_grad');
                  if (!isPlaying) setIsPlaying(true);
                }}
                className={`px-2.5 py-1 rounded font-medium transition ${
                  animMode === 'pulse_grad' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="动态波动梯度场"
              >
                梯度场脉冲
              </button>
              <button
                onClick={() => {
                  setAnimMode('seek_steepest');
                  if (!isPlaying) setIsPlaying(true);
                }}
                className={`px-2.5 py-1 rounded font-medium transition ${
                  animMode === 'seek_steepest' ? 'bg-white text-indigo-700 shadow-2xs font-bold' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="自动导航寻最陡下山方向"
              >
                寻负梯度
              </button>
            </div>

            {/* Speed Toggle */}
            <button
              onClick={() => setAnimSpeed((prev) => (prev === 1.0 ? 2.0 : prev === 2.0 ? 0.5 : 1.0))}
              className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg text-xs font-mono font-semibold transition"
              title="切换演示播放倍速"
            >
              {animSpeed}x
            </button>

            {/* Reset */}
            <button
              onClick={resetAll}
              className="p-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-600 rounded-lg text-xs transition"
              title="重置"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Quick Jump State Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
          <span className="text-slate-400 font-medium shrink-0 flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-500" /> 特征视角一键跳转:
          </span>
          <button
            onClick={() => jumpToTheta(0)}
            className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full font-medium transition shrink-0"
          >
            最陡上升 (θ = 0°)
          </button>
          <button
            onClick={() => jumpToTheta(90)}
            className="px-2.5 py-1 bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 rounded-full font-medium transition shrink-0"
          >
            正交等高线 (θ = 90°)
          </button>
          <button
            onClick={() => jumpToTheta(180)}
            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-full font-medium transition shrink-0"
          >
            最陡下降 (θ = 180°)
          </button>
          <button
            onClick={() => jumpToTheta(270)}
            className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-full font-medium transition shrink-0"
          >
            正交切线 (θ = 270°)
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-5 bg-slate-50/80 p-5 rounded-xl border border-slate-200/80 text-xs">
            <div className="space-y-2">
              <div className="flex justify-between font-medium text-slate-700">
                <span>梯度向量 ∇f_x:</span>
                <span className="font-mono font-bold text-indigo-600">{gradX.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="-5"
                max="5"
                step="0.5"
                value={gradX}
                onChange={(e) => {
                  setIsPlaying(false);
                  setGradX(parseFloat(e.target.value));
                }}
                className="w-full accent-indigo-600"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between font-medium text-slate-700">
                <span>梯度向量 ∇f_y:</span>
                <span className="font-mono font-bold text-indigo-600">{gradY.toFixed(1)}</span>
              </div>
              <input
                type="range"
                min="-5"
                max="5"
                step="0.5"
                value={gradY}
                onChange={(e) => {
                  setIsPlaying(false);
                  setGradY(parseFloat(e.target.value));
                }}
                className="w-full accent-indigo-600"
              />
            </div>

            <div className="pt-2 border-t border-slate-200 space-y-2">
              <div className="flex justify-between font-medium text-slate-700">
                <span>方向向量 v 角度 (Angle θ):</span>
                <span className="font-mono font-bold text-emerald-600">{Math.round(angleDeg)}°</span>
              </div>
              <input
                type="range"
                min="0"
                max="360"
                step="1"
                value={angleDeg}
                onChange={(e) => {
                  setIsPlaying(false);
                  setAngleDeg(parseFloat(e.target.value));
                }}
                className="w-full accent-emerald-600"
              />
            </div>

            {/* Calculated Values Table */}
            <div className="pt-3 border-t border-slate-200 space-y-2 text-[12px]">
              <div className="flex justify-between">
                <span className="text-slate-600">梯度模长 ||∇f||:</span>
                <span className="font-mono font-semibold text-slate-800">{gradNorm.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">梯度方向角 θ_∇f:</span>
                <span className="font-mono font-semibold text-indigo-600">{gradAngleDeg.toFixed(1)}°</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">夹角 θ = ∠(∇f, v):</span>
                <span className="font-mono font-semibold text-amber-600">{thetaDeg.toFixed(1)}°</span>
              </div>
              <div className="flex justify-between pt-2 border-t border-slate-200 font-bold text-sm">
                <span className="text-slate-800">方向导数 D_v f:</span>
                <span
                  className={`font-mono transition-colors ${
                    directionalDeriv > 0.05
                      ? 'text-emerald-600'
                      : directionalDeriv < -0.05
                      ? 'text-rose-600'
                      : 'text-slate-600'
                  }`}
                >
                  {directionalDeriv > 0 ? `+${directionalDeriv.toFixed(2)}` : directionalDeriv.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Canvas Vector Visualization Column */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center bg-slate-900 text-white p-6 rounded-xl border border-slate-800 shadow-inner relative overflow-hidden">
            <svg width={320} height={320} className="max-w-full h-auto overflow-visible">
              {/* Background Grid */}
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="1" />
                </pattern>
              </defs>
              <rect width="320" height="320" fill="url(#grid)" rx="8" />

              {/* Axes */}
              <line x1="160" y1="0" x2="160" y2="320" stroke="#334155" strokeWidth="1.5" />
              <line x1="0" y1="160" x2="320" y2="160" stroke="#334155" strokeWidth="1.5" />

              {/* Contour Circle Representation */}
              <circle cx="160" cy="160" r="100" fill="none" stroke="#0284c7" strokeWidth="1.5" strokeDasharray="4 4" />

              {/* Tangent Line to Contour at point */}
              {gradNorm > 1e-3 && (
                <line
                  x1={160 - (-gradY / gradNorm) * 130}
                  y1={160 - (gradX / gradNorm) * 130}
                  x2={160 + (-gradY / gradNorm) * 130}
                  y2={160 + (gradX / gradNorm) * 130}
                  stroke="#94a3b8"
                  strokeWidth="1.2"
                  strokeDasharray="3 3"
                />
              )}

              {/* Gradient Vector ∇f Arrow (Indigo) */}
              <line
                x1="160"
                y1="160"
                x2={160 + gradX * 22}
                y2={160 - gradY * 22}
                stroke="#6366f1"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
              <circle cx={160 + gradX * 22} cy={160 - gradY * 22} r="5" fill="#6366f1" />

              {/* Direction Unit Vector v Arrow (Emerald) */}
              <line
                x1="160"
                y1="160"
                x2={160 + vX * 70}
                y2={160 - vY * 70}
                stroke="#10b981"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx={160 + vX * 70} cy={160 - vY * 70} r="4" fill="#10b981" />

              {/* Angle Arc */}
              <path
                d={`M ${160 + 35 * Math.cos(gradAngleRad)} ${160 - 35 * Math.sin(gradAngleRad)} A 35 35 0 0 ${
                  angleRad < gradAngleRad ? 1 : 0
                } ${160 + 35 * Math.cos(angleRad)} ${160 - 35 * Math.sin(angleRad)}`}
                fill="none"
                stroke="#f59e0b"
                strokeWidth="2"
              />

              {/* Labels */}
              <text x={165 + gradX * 22} y={155 - gradY * 22} fill="#818cf8" fontSize="12" fontWeight="bold">
                ∇f (梯度)
              </text>
              <text x={165 + vX * 70} y={155 - vY * 70} fill="#34d399" fontSize="12" fontWeight="bold">
                v (方向)
              </text>
              <text x="165" y="155" fill="#facc15" fontSize="11">
                θ={thetaDeg.toFixed(0)}°
              </text>
            </svg>

            {/* Interactive Result Insight */}
            <div className="mt-4 p-3 bg-slate-800/80 rounded-lg text-xs space-y-1 text-center w-full max-w-sm border border-slate-700/60">
              <span className="text-amber-300 font-semibold flex items-center justify-center gap-1">
                <Lightbulb className="w-3.5 h-3.5" /> 几何推导结论：
              </span>
              <p className="text-slate-300 leading-relaxed">
                {thetaDeg < 15 ? (
                  <span className="text-emerald-400 font-bold">θ ≈ 0°：方向与梯度重合，方向导数达到最大正值 (+||∇f||)，即最陡上升方向！</span>
                ) : Math.abs(thetaDeg - 180) < 15 ? (
                  <span className="text-rose-400 font-bold">θ ≈ 180°：方向与负梯度重合，方向导数达到最大负值 (-||∇f||)，即最陡下山方向！</span>
                ) : Math.abs(thetaDeg - 90) < 15 ? (
                  <span className="text-sky-400 font-bold">θ ≈ 90°：方向正交于梯度，沿等高线切线移动，方向导数 = 0 (高度不变)！</span>
                ) : (
                  <span>
                    当 θ = 0° (v 同向于 ∇f) 时最大上升；当 θ = 180° 时最陡下降；当 θ = 90° 时沿着等高线方向导数为 0。
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

