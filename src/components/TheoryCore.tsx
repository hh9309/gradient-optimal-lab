import React, { useState, useEffect, useRef } from 'react';
import { BookOpen, Layers, GitCommit, Check, HelpCircle, ArrowRight, ShieldCheck, Play, Pause, RotateCcw, Sparkles } from 'lucide-react';

export const TheoryCore: React.FC = () => {
  // KKT Interactive Geometry Demo state: Constraint constraint C
  const [constraintVal, setConstraintVal] = useState(2.0); // g(x,y) = x + y - C <= 0
  const [isPlaying, setIsPlaying] = useState(false);
  const animDirectionRef = useRef<number>(1);

  const optX = constraintVal / 2;
  const optY = constraintVal / 2;
  const optLoss = optX * optX + optY * optY;
  const lambdaVal = constraintVal; // multiplier

  // Smooth continuous auto demonstration loop without pausing
  useEffect(() => {
    if (!isPlaying) return;

    let animId: number;
    let lastTime = performance.now();

    const loop = (currentTime: number) => {
      const dt = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      setConstraintVal((prevC) => {
        const speed = 0.9; // units per second
        let dir = animDirectionRef.current;
        let nextC = prevC + dir * speed * dt;

        if (nextC >= 4.0) {
          nextC = 4.0;
          animDirectionRef.current = -1;
        } else if (nextC <= 0.5) {
          nextC = 0.5;
          animDirectionRef.current = 1;
        }

        return nextC;
      });

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isPlaying]);

  // Computation Graph Backprop Interactive Demo state
  const [w, setW] = useState(2.0);
  const [x, setX] = useState(3.0);
  const [b, setB] = useState(1.0);
  const [targetY, setTargetY] = useState(10.0);

  // Forward
  const z = w * x + b;
  const predY = z; // identity activation for simplicity
  const loss = 0.5 * Math.pow(predY - targetY, 2);

  // Backward
  const dLoss_dPredY = predY - targetY;
  const dPredY_dZ = 1.0;
  const dZ_dW = x;
  const dZ_dB = 1.0;

  const dLoss_dW = dLoss_dPredY * dPredY_dZ * dZ_dW;
  const dLoss_dB = dLoss_dPredY * dPredY_dZ * dZ_dB;

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-2xl shadow-md border border-slate-800">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3 border border-indigo-500/30">
          <BookOpen className="w-3.5 h-3.5" /> 模块 5：最优化理论与反向传播
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-white">
          最优化理论数学基石：拉格朗日乘子、KKT 与反向传播
        </h1>
        <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
          深入探究无约束极值条件、含等式与不等式约束的拉格朗日乘子法、KKT 对偶条件，以及神经网络计算图 (Computation Graph) 的链式求导法则。
        </p>
      </div>

      {/* Slice 1: Unconstrained Optimization Conditions */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <ShieldCheck className="w-4 h-4 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-800">
            1. 无约束极值的一阶与二阶条件 (Unconstrained Optimality)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-indigo-900 text-sm">一阶必要条件 (1st Order Necessary)</span>
            <div className="p-2 bg-slate-900 text-indigo-300 font-mono rounded border border-slate-800">
              ∇f(x*) = 0
            </div>
            <p className="text-slate-600 leading-relaxed">
              若 x* 为连续可微函数 f(x) 的局部极值点，则在该点处的梯度向量必须为零（驻点/平稳点 Stationary Point）。
            </p>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2">
            <span className="font-bold text-emerald-900 text-sm">二阶充分条件 (2nd Order Sufficient)</span>
            <div className="p-2 bg-slate-900 text-emerald-300 font-mono rounded border border-slate-800">
              H(x*) = ∇²f(x*) &gt; 0  (正定矩阵)
            </div>
            <p className="text-slate-600 leading-relaxed">
              在驻点 ∇f(x*) = 0 处，若 Hessian 矩阵所有特征值均为正 λ_i &gt; 0，则 x* 必为严格局部极小值点。
            </p>
          </div>
        </div>
      </div>

      {/* Slice 2: Lagrange Multipliers & KKT Conditions */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-500" />
            <h2 className="text-base font-bold text-slate-800">
              2. 约束最优化与 KKT 条件 (Lagrange & KKT Conditions)
            </h2>
          </div>
          <span className="text-xs text-amber-600 font-mono bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            Karush-Kuhn-Tucker
          </span>
        </div>

        {/* KKT 4 Conditions Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200/80 space-y-2 text-xs">
            <span className="font-bold text-amber-900">① 平稳性 (Stationarity)</span>
            <div className="p-2 bg-slate-900 text-amber-300 font-mono rounded text-[11px]">
              ∇f + Σ λ_i ∇g_i = 0
            </div>
            <p className="text-slate-600">目标函数梯度与约束梯度的线性组合平衡抵消。</p>
          </div>

          <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-200/80 space-y-2 text-xs">
            <span className="font-bold text-indigo-900">② 原始可行性 (Primal)</span>
            <div className="p-2 bg-slate-900 text-indigo-300 font-mono rounded text-[11px]">
              g_i(x) ≤ 0, h_j(x) = 0
            </div>
            <p className="text-slate-600">最优解点必位于可行域（Feasible Region）内部或边界上。</p>
          </div>

          <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/80 space-y-2 text-xs">
            <span className="font-bold text-emerald-900">③ 对偶可行性 (Dual)</span>
            <div className="p-2 bg-slate-900 text-emerald-300 font-mono rounded text-[11px]">
              λ_i ≥ 0
            </div>
            <p className="text-slate-600">不等式约束拉格朗日乘子非负（梯度阻挡方向正向）。</p>
          </div>

          <div className="bg-rose-50/50 p-4 rounded-xl border border-rose-200/80 space-y-2 text-xs">
            <span className="font-bold text-rose-900">④ 互补松弛性 (Slackness)</span>
            <div className="p-2 bg-slate-900 text-rose-300 font-mono rounded text-[11px]">
              λ_i · g_i(x) = 0
            </div>
            <p className="text-slate-600">若约束未激活 (g_i &lt; 0) 则乘子必为 0 (λ_i = 0)。</p>
          </div>
        </div>

        {/* Interactive KKT Geometry Demonstration */}
        <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-3 gap-3">
            <div className="space-y-1">
              <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
                几何相切交互演示: 目标 $\min (x^2 + y^2)$ 约束在 $g(x,y) = x + y - C \le 0$
              </span>
              <p className="text-[11px] text-slate-500">
                拖动滑块或开启自动演示，直观观测相切处目标等高线与约束直线的几何重合与梯度共线
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Auto Play / Pause Button */}
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold shadow-sm transition flex items-center gap-1.5 ${
                  isPlaying
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {isPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isPlaying ? '暂停演示' : '自动演示动画'}</span>
              </button>

              <div className="flex items-center gap-2">
                <span className="text-slate-600">约束 C:</span>
                <input
                  type="range"
                  min="0.5"
                  max="4.0"
                  step="0.05"
                  value={constraintVal}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setConstraintVal(parseFloat(e.target.value));
                  }}
                  className="w-24 accent-indigo-600"
                />
                <span className="font-mono font-bold text-indigo-600 w-10">{constraintVal.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Status Banner when animating */}
          {isPlaying && (
            <div className="p-2.5 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-between text-xs transition">
              <div className="flex items-center gap-2 text-indigo-900 font-medium">
                <Sparkles className="w-4 h-4 text-indigo-600 animate-spin" />
                <span>
                  <strong>🎯 平滑自动扫掠演示中...</strong> 正在连续变幻约束边界 $C$，实时观测相切与梯度方向重合
                </span>
              </div>
              <span className="text-[10px] bg-indigo-600 text-white px-2 py-0.5 rounded font-mono font-bold">
                SWEEPING
              </span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            {/* SVG Geometry */}
            <div className="flex justify-center bg-slate-900 p-4 rounded-lg">
              <svg width="240" height="240" className="overflow-visible">
                <rect width="240" height="240" fill="#0f172a" rx="6" />
                {/* Target Contours */}
                <circle cx="120" cy="120" r={optLoss * 25} fill="none" stroke="#38bdf8" strokeWidth="2" />
                <circle cx="120" cy="120" r={optLoss * 15} fill="none" stroke="#0284c7" strokeWidth="1" strokeDasharray="3 3" />

                {/* Constraint Line x + y = C */}
                <line
                  x1="20"
                  y1={120 + (constraintVal - 1) * 35}
                  x2={120 + (constraintVal - 1) * 35}
                  y2="20"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                />

                {/* Optimal Point (optX, optY) */}
                <circle
                  cx={120 + optX * 30}
                  cy={120 - optY * 30}
                  r="6"
                  fill="#10b981"
                  stroke="#ffffff"
                  strokeWidth="2"
                />

                {/* Target Gradient ∇f */}
                <line
                  x1={120 + optX * 30}
                  y1={120 - optY * 30}
                  x2={120 + optX * 30 + 30}
                  y2={120 - optY * 30 - 30}
                  stroke="#38bdf8"
                  strokeWidth="2"
                />

                <text x={120 + optX * 30 + 5} y={120 - optY * 30 + 15} fill="#34d399" fontSize="11" fontWeight="bold">
                  KKT 相切解 ({optX.toFixed(2)}, {optY.toFixed(2)})
                </text>
              </svg>
            </div>

            {/* Calculated Values */}
            <div className="space-y-3 font-mono text-slate-700 bg-white p-4 rounded-lg border border-slate-200">
              <div className="flex justify-between border-b pb-1">
                <span>最优切点 x*, y*:</span>
                <span className="font-bold text-emerald-600">({optX.toFixed(2)}, {optY.toFixed(2)})</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span>最小目标 Loss f(x*,y*):</span>
                <span className="font-bold text-indigo-600">{optLoss.toFixed(4)}</span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span>拉格朗日乘子 λ*:</span>
                <span className="font-bold text-amber-600">{lambdaVal.toFixed(2)} (&gt; 0)</span>
              </div>
              <p className="text-[11px] font-sans text-slate-500 pt-1 leading-relaxed">
                相切原理：在最优解点，目标函数的等高线切线与约束直线 x+y=C 完全重合，此时目标梯度 ∇f = (2x, 2y)^T 与约束梯度 ∇g = (1, 1)^T 共线反向，即 ∇f + λ ∇g = 0！
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Slice 3: Backpropagation & Computation Graph */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <GitCommit className="w-4 h-4 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-800">
            3. 深度学习神经网络反向传播链式法则 (Backpropagation)
          </h2>
        </div>

        <div className="p-5 bg-slate-50 rounded-xl border border-slate-200 space-y-4 text-xs">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-2">
            <span className="font-bold text-slate-800">
              单层神经元计算图 (Computation Graph): y_pred = w·x + b, Loss = 0.5·(y_pred - y)²
            </span>
            <span className="text-indigo-600 font-mono font-medium">前向正向计算 • 反向梯度传递</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-800">输入与权重控制</span>
              <div className="space-y-2 pt-1">
                <div className="flex justify-between">
                  <span>权重 w:</span>
                  <input
                    type="number"
                    step="0.5"
                    value={w}
                    onChange={(e) => setW(parseFloat(e.target.value) || 0)}
                    className="w-16 px-1.5 py-0.5 rounded border border-slate-200 font-mono"
                  />
                </div>
                <div className="flex justify-between">
                  <span>输入 x:</span>
                  <input
                    type="number"
                    step="0.5"
                    value={x}
                    onChange={(e) => setX(parseFloat(e.target.value) || 0)}
                    className="w-16 px-1.5 py-0.5 rounded border border-slate-200 font-mono"
                  />
                </div>
                <div className="flex justify-between">
                  <span>偏置 b:</span>
                  <input
                    type="number"
                    step="0.5"
                    value={b}
                    onChange={(e) => setB(parseFloat(e.target.value) || 0)}
                    className="w-16 px-1.5 py-0.5 rounded border border-slate-200 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-800">1. 前向传播 (Forward Pass)</span>
              <div className="space-y-1 font-mono pt-1 text-slate-700">
                <div>z = w·x + b = {z.toFixed(2)}</div>
                <div>y_pred = {predY.toFixed(2)}</div>
                <div className="text-amber-600 font-bold">Loss = {loss.toFixed(4)}</div>
              </div>
            </div>

            <div className="space-y-2 bg-slate-900 text-white p-3 rounded-lg border border-slate-800 font-mono">
              <span className="font-semibold text-emerald-400">2. 反向传播 (Backward Grad)</span>
              <div className="space-y-1 pt-1 text-slate-300">
                <div>∂L/∂y_pred = {dLoss_dPredY.toFixed(2)}</div>
                <div>∂L/∂w = (∂L/∂y_pred)·x = <strong className="text-indigo-400">{dLoss_dW.toFixed(2)}</strong></div>
                <div>∂L/∂b = (∂L/∂y_pred)·1 = <strong className="text-emerald-400">{dLoss_dB.toFixed(2)}</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
