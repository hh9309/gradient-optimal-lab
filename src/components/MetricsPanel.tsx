/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { RunResult } from "../types";
import { AreaChart, TrendingDown, Target, Info, Zap } from "lucide-react";

interface MetricsPanelProps {
  activeResult: RunResult | null;
  selectedStepIndex: number;
  hasStartedOptimization: boolean;
}

export function MetricsPanel({ activeResult, selectedStepIndex, hasStartedOptimization }: MetricsPanelProps) {
  if (!activeResult || activeResult.steps.length === 0 || !hasStartedOptimization) {
    return (
      <div className="glass-card bg-white/90 p-8 flex flex-col items-center justify-center text-center h-full min-h-[350px]" id="metrics_curves_panel">
        <div className="relative mb-3 flex items-center justify-center">
          <div className="absolute inset-x-0 w-12 h-12 bg-indigo-100 rounded-full animate-ping opacity-20"></div>
          <AreaChart className="w-12 h-12 text-slate-300 relative z-10" />
        </div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-display mb-1">指标收敛仪表盘 / Metrics</h3>
        <p className="text-xs text-indigo-600 font-semibold mt-1">
          🔓 待触发作图 (Awaiting trigger)
        </p>
        <p className="text-[11px] text-slate-400 mt-2 max-w-sm leading-relaxed">
          请点击左上侧面板下方<strong>“开始优化任务 (Solve Map)”</strong>按钮启动计算。本面板将开启高动态仿真作图，同步绘制 Loss 曲线与梯度收敛趋势。
        </p>
      </div>
    );
  }

  const steps = activeResult.steps;
  const numSteps = steps.length;
  const activeStep = steps[Math.min(selectedStepIndex, numSteps - 1)] || steps[0];

  // Slice steps up to the current selected step to simulate dynamic real-time progress drawing
  const visibleSteps = steps.slice(0, selectedStepIndex + 1);

  // Helper to generate SVG paths for curves
  const renderSVGCurve = (
    data: number[],
    totalSteps: number,
    width: number,
    height: number,
    strokeColor: string,
    fillColor: string,
    fullData: number[]
  ) => {
    if (data.length === 0) return null;
    const maxVal = Math.max(...fullData, 1e-5);
    const minVal = Math.min(...fullData, 0);
    const range = maxVal - minVal || 1;

    const points = data.map((val, idx) => {
      const x = (idx / Math.max(1, totalSteps - 1)) * (width - 24) + 12;
      const y = height - 12 - ((val - minVal) / range) * (height - 24);
      return { x, y };
    });

    const pathData = points
      .map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x.toFixed(3)} ${p.y.toFixed(3)}`)
      .join(" ");

    const areaPath = points.length > 0
      ? `${pathData} L ${points[points.length - 1].x.toFixed(3)} ${height - 12} L ${points[0].x.toFixed(3)} ${height - 12} Z`
      : "";

    // Coordinate of the active step dot representation (always the latest step in our visible sliced data)
    const activeDot = points[points.length - 1];

    return (
      <svg className="w-full h-full" overflow="visible">
        {/* Background grids */}
        <line x1={12} y1={12} x2={width - 12} y2={12} stroke="rgba(148,163,184,0.08)" />
        <line x1={12} y1={height / 2} x2={width - 12} y2={height / 2} stroke="rgba(148,163,184,0.08)" />
        <line x1={12} y1={height - 12} x2={width - 12} y2={height - 12} stroke="rgba(148,163,184,0.15)" strokeWidth={1} />

        {/* Shaded Area fill */}
        <path d={areaPath} fill={fillColor} />
        {/* Line Stroke */}
        <path d={pathData} fill="none" stroke={strokeColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {/* Selected target dot focus */}
        {activeDot && (
          <>
            <line x1={activeDot.x} y1={12} x2={activeDot.x} y2={height - 12} stroke="#6366f1" strokeDasharray="3,3" strokeWidth={1} />
            <circle cx={activeDot.x} cy={activeDot.y} r={6} fill={strokeColor} stroke="#ffffff" strokeWidth={2} className="animate-pulse" />
          </>
        )}
      </svg>
    );
  };

  const lossData = visibleSteps.map((s) => s.loss);
  const gradNorms = visibleSteps.map((s) => s.gradNorm);
  
  const fullLossData = steps.map((s) => s.loss);
  const fullGradNorms = steps.map((s) => s.gradNorm);

  // Analyze eigenvalues to describe current terrain status
  const [l1, l2] = activeStep.eigenvalues;
  const conditionNumber = Math.abs(l2) > 1e-4 ? Math.abs(l1 / l2) : Infinity;

  const getHessianTerrainDescription = () => {
    if (l1 > 1e-4 && l2 > 1e-4) {
      if (conditionNumber > 15) {
        return {
          title: "强病态狭长谷地 (Convex Ill-conditioned Ravine)",
          desc: "两个特征值均为正，但比例极大。这代表此处为极端狭窄峡谷地形！梯度下降极易在两侧峭壁间剧烈 zig-zag 震荡摇摆，阻碍下行，Adam 比 SGD 更适合此类刚性地形。",
          color: "text-amber-600 bg-amber-50 border-amber-200",
          barColor: "bg-emerald-500"
        };
      }
      return {
        title: "正定局域凸碗形 (Convex Bowl Basin)",
        desc: "两个特征值均显著为正，为完美局部凸二次碗形底。梯度方向可精准指示极小值核心，大部分优化器均能极速、顺滑地收敛。",
        color: "text-emerald-700 bg-emerald-50 border-emerald-200",
        barColor: "bg-emerald-500"
      };
    }
    if (l1 < -1e-4 && l2 < -1e-4) {
      return {
        title: "负定局域极高峰 (Concave Local Hilltop)",
        desc: "两个特征值均显著为负，说明身处局域能量最高极值点。属于不稳定性顶部，梯度下降将自动沿极陡坡线向两侧滚落。",
        color: "text-rose-700 bg-rose-50 border-rose-200",
        barColor: "bg-rose-500"
      };
    }
    if (l1 * l2 < -1e-4) {
      return {
        title: "双向分列马鞍形点 (Saddle Point Hyperboloid)",
        desc: "一正一负（λ₁ > 0, λ₂ < 0）。这说明身处马鞍部的平横点！在一个方向是山谷凹下，在另一个方向是山脊凸起。一阶梯度在此极其微弱，传统一阶 SGD 极大概率停滞锁死在鞍点，而带有冲量的 Momentum 或 Adam 能够打破这一均势冲出重围。",
        color: "text-orange-700 bg-orange-50 border-orange-200",
        barColor: "bg-orange-500"
      };
    }
    return {
      title: "零特征简并平台 (Degenerate Plateau)",
      desc: "至少有一个特征值极为接近零，表明该方向平坦如明镜。没有梯度指路，容易导致步长大范围空转或爬行。",
      color: "text-slate-600 bg-slate-50 border-slate-200",
      barColor: "bg-slate-400"
    };
  };

  const terrainInfo = getHessianTerrainDescription();

  return (
    <div className="glass-card bg-white/90 p-5 flex flex-col h-full" id="metrics_curves_panel">
      {/* Metrics head */}
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
        <TrendingDown className="w-5 h-5 text-indigo-500" />
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-display">指标收敛仪表盘 / Convergence</h3>
      </div>

      {/* Main grids curves */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5 mb-5">
        {/* Loss curves */}
        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150 flex flex-col">
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-xs font-semibold text-slate-500">Loss 下降轨迹 f(x, y)</span>
            <span className="text-[10px] font-mono font-bold text-slate-400">目前选定第 {selectedStepIndex} 步</span>
          </div>
          <div className="flex-1 h-[110px] relative">
            {renderSVGCurve(lossData, numSteps, 240, 110, "#10b981", "rgba(16,185,129,0.05)", fullLossData)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>初始 Loss: {fullLossData[0]?.toFixed(3)}</span>
            <span>当前: {activeStep.loss.toFixed(3)}</span>
          </div>
        </div>

        {/* Grad norms curves */}
        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-150 flex flex-col">
          <div className="flex items-center justify-between gap-1 mb-2">
            <span className="text-xs font-semibold text-slate-500">梯度模长收敛趋势 ∥∇f∥</span>
            <span className="text-[10px] font-mono font-bold text-slate-400">Target Level: 1e-5</span>
          </div>
          <div className="flex-1 h-[110px] relative">
            {renderSVGCurve(gradNorms, numSteps, 240, 110, "#f59e0b", "rgba(245,158,11,0.04)", fullGradNorms)}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
            <span>初始 ∥∇f∥: {fullGradNorms[0]?.toFixed(3)}</span>
            <span>当前: {activeStep.gradNorm.toFixed(3)}</span>
          </div>
        </div>
      </div>

      {/* Hessian matrix eigenvalue spectrum visualization board */}
      <div className="border-t border-slate-100 pt-4 flex-1 flex flex-col">
        <div className="flex items-center gap-1.5 mb-3">
          <Zap className="w-4 h-4 text-orange-500 animate-pulse" />
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hessian 特征值谱 (Hessian Eigenvalue Spectrum)</h4>
        </div>

        {/* Dynamic visual representation */}
        <div className="bg-slate-50 p-4 rounded-xl border border-slate-150 mb-3">
          <div className="grid grid-cols-2 gap-4 text-center">
            {/* Eigenvalue 1 */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-mono">极大主曲率特征值 (λ₁)</span>
              <div className="h-6 flex items-center bg-white border border-slate-200 rounded-lg px-3 justify-between">
                <span className="text-xs font-bold font-mono text-indigo-700">{l1.toFixed(3)}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${l1 > 1e-4 ? "bg-emerald-500" : l1 < -1e-4 ? "bg-rose-500" : "bg-slate-400"}`}></span>
              </div>
            </div>

            {/* Eigenvalue 2 */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-mono">微小次曲率特征值 (λ₂)</span>
              <div className="h-6 flex items-center bg-white border border-slate-200 rounded-lg px-3 justify-between">
                <span className="text-xs font-bold font-mono text-indigo-700">{l2.toFixed(3)}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${l2 > 1e-4 ? "bg-emerald-500" : l2 < -1e-4 ? "bg-rose-500" : "bg-slate-400"}`}></span>
              </div>
            </div>
          </div>

          {/* Ratio details / Condition number */}
          <div className="mt-3 flex items-center justify-between text-[11px] text-slate-500 border-t border-slate-200/60 pt-2.5 font-mono">
            <span>曲率条件数 (Condition Number κ):</span>
            <span className="font-bold text-indigo-600">
              {conditionNumber === Infinity ? "∞" : conditionNumber.toFixed(3)}
            </span>
          </div>
        </div>

        {/* Topography explanation box */}
        <div className={`p-4.5 rounded-xl border flex-1 text-xs transition-colors duration-250 ${terrainInfo.color}`}>
          <div className="flex items-center gap-1.5 font-bold mb-1.5 font-sans">
            <Info className="w-4 h-4 shrink-0" />
            <span>检测地形：{terrainInfo.title}</span>
          </div>
          <p className="leading-relaxed opacity-95 text-slate-700 font-normal">
            {terrainInfo.desc}
          </p>
        </div>
      </div>
    </div>
  );
}
