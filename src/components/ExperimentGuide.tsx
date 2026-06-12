/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FlaskConical, PlayCircle } from "lucide-react";
import { FormulaPreset, OptimizerConfig } from "../types";
import { FORMULA_PRESETS } from "../utils/mathEngine";
import { MathRenderer } from "./MathRenderer";

interface ExperimentGuideProps {
  onApplyExperiment: (preset: FormulaPreset, config: OptimizerConfig, activeOptimizer: string) => void;
}

export function ExperimentGuide({ onApplyExperiment }: ExperimentGuideProps) {
  const loadExperimentByKey = (
    presetId: string,
    startX: number,
    startY: number,
    lr: number,
    steps: number,
    optimizer: string
  ) => {
    const foundPreset = FORMULA_PRESETS.find((p) => p.id === presetId);
    if (foundPreset) {
      const config: OptimizerConfig = {
        id: foundPreset.id,
        name: foundPreset.name,
        learningRate: lr,
        maxSteps: steps,
        initialX: startX,
        initialY: startY,
        beta1: 0.9,
        beta2: 0.999,
        epsilon: 1e-8,
        noiseLevel: 0
      };
      onApplyExperiment(foundPreset, config, optimizer);
    }
  };

  return (
    <div className="glass-card bg-white/90 p-5 flex flex-col h-full" id="experiment_guide">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
        <FlaskConical className="w-5 h-5 text-indigo-500 animate-pulse" />
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-display animate-pulse">实验指南 / Experiment Guide</h3>
      </div>

      <div className="space-y-4">
        {/* Experiment 1 */}
        <div className="p-4 rounded-xl border border-slate-100 bg-linear-to-br from-slate-50/50 to-white hover:border-indigo-150 transition-all flex flex-col justify-between">
          <div className="space-y-1.5 flex-1">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 font-sans">
              <PlayCircle className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
              <span>实验一：香蕉峡谷扭转障碍跑 (Rosenbrock)</span>
            </h4>
            <p className="text-[11px] leading-relaxed text-slate-500 font-normal">
              著名的 <strong>Rosenbrock</strong> 香蕉函数。它的极小值位于一个极度狭窄、高度弯曲的弧形峡谷深处 <MathRenderer math="(1, 1)" />。在此处进行求解：
            </p>
            <div className="flex flex-wrap gap-2 text-[10px] font-mono font-semibold py-1">
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">起点: (-1.2, 1.5)</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">步长 <MathRenderer math="\alpha" />: 0.002</span>
              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">推荐: ADAM</span>
            </div>
            <p className="text-[10.5px] leading-relaxed text-slate-400 font-normal border-l-2 border-indigo-200/50 pl-2">
              <span className="font-bold text-slate-500">实验引导：</span>
              一键加载后请注意：纯 1 阶 SGD 会陷入痛苦的锯齿状震荡，需要极多步数才能极缓慢挪动；而双矩估计 <strong>Adam</strong> 与 <strong>Momentum</strong> 能够辨明偏导合速度，利用自适应惯性极速蛇形穿梭到底部极小值。
            </p>
          </div>
          <div className="mt-3.5 flex justify-end">
            <button
              onClick={() => loadExperimentByKey("rosenbrock", -1.2, 1.5, 0.002, 180, "adam")}
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs rounded-lg border border-indigo-200/60 transition-colors cursor-pointer"
            >
              📥 一键配置此实验地形 (Load Layout)
            </button>
          </div>
        </div>

        {/* Experiment 2 */}
        <div className="p-4 rounded-xl border border-slate-100 bg-linear-to-br from-slate-50/50 to-white hover:border-indigo-150 transition-all flex flex-col justify-between">
          <div className="space-y-1.5 flex-1">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 font-sans">
              <PlayCircle className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
              <span>实验二：直面惊险并打破马鞍陷阱 (Saddle Point)</span>
            </h4>
            <p className="text-[11px] leading-relaxed text-slate-500 font-normal">
              在 <strong>经典马鞍面</strong> 地形下测试。起点若恰好选在脊线上 <MathRenderer math="(0.05, 1.8)" />，梯度几乎为 <MathRenderer math="0" />，属于典型的鞍点陷阱：
            </p>
            <div className="flex flex-wrap gap-2 text-[10px] font-mono font-semibold py-1">
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">起点: (0.05, 1.8)</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">步长 <MathRenderer math="\alpha" />: 0.08</span>
              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">推荐: MOMENTUM</span>
            </div>
            <p className="text-[10.5px] leading-relaxed text-slate-400 font-normal border-l-2 border-indigo-200/50 pl-2">
              <span className="font-bold text-slate-500">实验引导：</span>
              一键加载后请注意：因为 <MathRenderer math="x" /> 轴接近 <MathRenderer math="0" />，純一阶 <strong>SGD</strong> 很快陷入停滞、极其迟钝。然而，由于 <strong>Momentum</strong> 或 <strong>Adam</strong> 叠加了历史多步的速度惯性冲击，它们将在鞍点附近积蓄动量，最终优雅地拐过弯道、滑落泄溢口！
            </p>
          </div>
          <div className="mt-3.5 flex justify-end">
            <button
              onClick={() => loadExperimentByKey("saddle", 0.05, 1.8, 0.08, 120, "momentum")}
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs rounded-lg border border-indigo-200/60 transition-colors cursor-pointer"
            >
              📥 一键配置此实验地形 (Load Layout)
            </button>
          </div>
        </div>

        {/* Experiment 3 */}
        <div className="p-4 rounded-xl border border-slate-100 bg-linear-to-br from-slate-50/50 to-white hover:border-indigo-150 transition-all flex flex-col justify-between">
          <div className="space-y-1.5 flex-1">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 font-sans">
              <PlayCircle className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
              <span>实验三：病态刚性峡谷下的梯度爆炸 (Canyon Divergence)</span>
            </h4>
            <p className="text-[11px] leading-relaxed text-slate-500 font-normal">
              利用 <strong>Booth's 函数</strong>，它在横向和纵向具有严重的曲率刚度比例差异（特征值 <MathRenderer math="18" /> 对 <MathRenderer math="2" />，属于典型的刚性峡谷）。
            </p>
            <div className="flex flex-wrap gap-2 text-[10px] font-mono font-semibold py-1">
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">起点: (8.5, -4.0)</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">步长 <MathRenderer math="\alpha" />: 0.22</span>
              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">推荐: SGD</span>
            </div>
            <p className="text-[10.5px] leading-relaxed text-slate-400 font-normal border-l-2 border-indigo-200/50 pl-2">
              <span className="font-bold text-slate-500">实验引导：</span>
              当学习率调高至 <strong>0.22</strong> 时，<strong>SGD</strong> 在峭壁间进行更新时不仅会左右摇摆，反而因为计算步距长于峡谷口，导致坐标步长向外蹦出，产生数值<strong>梯度爆炸（Divergence）</strong>！此时您可以一键拦截，并观察自适应 <strong>RMSprop</strong> 是如何自动将其扼杀在摇篮里的。
            </p>
          </div>
          <div className="mt-3.5 flex justify-end">
            <button
              onClick={() => loadExperimentByKey("booth", 8.5, -4.0, 0.22, 80, "sgd")}
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs rounded-lg border border-indigo-200/60 transition-colors cursor-pointer"
            >
              📥 一键配置此实验地形 (Load Layout)
            </button>
          </div>
        </div>

        {/* Experiment 4: Rastrigin Function Highly Local-Minima */}
        <div className="p-4 rounded-xl border border-slate-100 bg-linear-to-br from-slate-50/50 to-white hover:border-indigo-150 transition-all flex flex-col justify-between">
          <div className="space-y-1.5 flex-1">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 font-sans">
              <PlayCircle className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
              <span>实验四：多极值起伏陷阱 (Rastrigin Local-Minima Trap)</span>
            </h4>
            <p className="text-[11px] leading-relaxed text-slate-500 font-normal">
              使用具有高频、高能量波动的 <strong>Rastrigin 函数</strong> 测试逃逸能力。它在全局最优解 <MathRenderer math="(0, 0)" /> 四周布满了无数个深陷的局部极小值碗穴：
            </p>
            <div className="flex flex-wrap gap-2 text-[10px] font-mono font-semibold py-1">
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">起点: (1.5, 1.2)</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">步长 <MathRenderer math="\alpha" />: 0.05</span>
              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700">推荐: ADAM + SGD 噪声</span>
            </div>
            <p className="text-[10.5px] leading-relaxed text-slate-400 font-normal border-l-2 border-indigo-200/50 pl-2">
              <span className="font-bold text-slate-500">实验引导：</span>
              一键加载后请注意：纯 1 阶 <strong>SGD</strong> 会立即窒息停滞在离起点最近的第一个盆底 local minimum 无法动弹。您可以开启<strong>自适应 Adam</strong>，或者调大<strong>地形噪声（模拟随机梯度 SGD 的温变振荡）</strong>以让小球获得能量抖动，实现跨谷跃迁！
            </p>
          </div>
          <div className="mt-3.5 flex justify-end">
            <button
              onClick={() => loadExperimentByKey("rastrigin", 1.5, 1.2, 0.05, 120, "adam")}
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs rounded-lg border border-indigo-200/60 transition-colors cursor-pointer"
            >
              📥 一键配置此实验地形 (Load Layout)
            </button>
          </div>
        </div>

        {/* Experiment 5: Himmelblau's Multimodal Symmetric Peaks */}
        <div className="p-4 rounded-xl border border-slate-100 bg-linear-to-br from-slate-50/50 to-white hover:border-indigo-150 transition-all flex flex-col justify-between">
          <div className="space-y-1.5 flex-1">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 font-sans">
              <PlayCircle className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
              <span>实验五：完美对称多极解分流赛跑 (Himmelblau Multimodal)</span>
            </h4>
            <p className="text-[11px] leading-relaxed text-slate-500 font-normal">
              著名的 <strong>Himmelblau 函数</strong>，拥有 4 个深度完全一致、数值相等的全局极小值盆地：
            </p>
            <div className="flex flex-wrap gap-2 text-[10px] font-mono font-semibold py-1">
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">起点: (-0.1, -0.2)</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">步长 <MathRenderer math="\alpha" />: 0.015</span>
              <span className="px-2 py-0.2 rounded bg-indigo-50 text-indigo-700">推荐: 自适应竞赛跑 (Race)</span>
            </div>
            <p className="text-[10.5px] leading-relaxed text-slate-400 font-normal border-l-2 border-indigo-200/50 pl-2">
              <span className="font-bold text-slate-500">实验引导：</span>
              一键加载后请注意：由于起点恰好处于四个大盆地交汇的中央鞍背分水岭处，微小的动量差、一阶或二阶梯度偏差将主导最终滑落的胜者去处。点击<strong>“对比竞速”</strong>或<strong>“连续物理小球”</strong>，看看它最后落入的是 4 个底谷的哪一个！
            </p>
          </div>
          <div className="mt-3.5 flex justify-end">
            <button
              onClick={() => loadExperimentByKey("himmelblau", -0.1, -0.2, 0.015, 100, "adam")}
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs rounded-lg border border-indigo-200/60 transition-colors cursor-pointer"
            >
              📥 一键配置此实验地形 (Load Layout)
            </button>
          </div>
        </div>

        {/* Experiment 6: Ackley Complex Ridges */}
        <div className="p-4 rounded-xl border border-slate-100 bg-linear-to-br from-slate-50/50 to-white hover:border-indigo-150 transition-all flex flex-col justify-between">
          <div className="space-y-1.5 flex-1">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 font-sans">
              <PlayCircle className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
              <span>实验六：高频艾克里全局多局部谷地 (Ackley Complex Ridges)</span>
            </h4>
            <p className="text-[11px] leading-relaxed text-slate-500 font-normal">
              经典的 <strong>Ackley 函数</strong>。它将一阶指数衰减的大型碗状表面与无数高频微小的正弦山包、裂谷完全融合，具有极其险峻的复合曲率表面：
            </p>
            <div className="flex flex-wrap gap-2 text-[10px] font-mono font-semibold py-1">
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">起点: (2.8, -2.6)</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">步长 <MathRenderer math="\alpha" />: 0.12</span>
              <span className="px-2 py-0.2 rounded bg-indigo-50 text-indigo-700">推荐: RMSprop / Adam</span>
            </div>
            <p className="text-[10.5px] leading-relaxed text-slate-400 font-normal border-l-2 border-indigo-200/50 pl-2">
              <span className="font-bold text-slate-500">实验引导：</span>
              一键加载后请注意：由于在靠近全局最优解 <MathRenderer math="(0,0)" /> 的平缓区外包覆了大量尖锐狭小的局部陷阱极值，一阶梯度在这些地方的偏导频繁在方向上发生逆转。观察<strong>自适应 RMSprop 与 Adam</strong> 是如何在高阶自学习步长配合下，实现突破局部阻力，冲入全局眼窝！
            </p>
          </div>
          <div className="mt-3.5 flex justify-end">
            <button
              onClick={() => loadExperimentByKey("ackley", 2.8, -2.6, 0.12, 110, "adam")}
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs rounded-lg border border-indigo-200/60 transition-colors cursor-pointer"
            >
              📥 一键配置此实验地形 (Load Layout)
            </button>
          </div>
        </div>

        {/* Experiment 7: Beale Non-Convex Plateaus */}
        <div className="p-4 rounded-xl border border-slate-100 bg-linear-to-br from-slate-50/50 to-white hover:border-indigo-150 transition-all flex flex-col justify-between">
          <div className="space-y-1.5 flex-1">
            <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5 font-sans">
              <PlayCircle className="w-4.5 h-4.5 text-indigo-500 shrink-0" />
              <span>实验七：比尔非凸阶梯脊线平盘 (Beale Flat Plateaus)</span>
            </h4>
            <p className="text-[11px] leading-relaxed text-slate-500 font-normal">
              著名的 <strong>Beale 非凸函数</strong>，具有极其平坦的宽幅平原高原，但在某些角落却突然升起犹如悬崖峭壁的非凸脊线，对寻优步长缩放具有极高的挑战：
            </p>
            <div className="flex flex-wrap gap-2 text-[10px] font-mono font-semibold py-1">
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">起点: (0.5, 3.5)</span>
              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600">步长 <MathRenderer math="\alpha" />: 0.005</span>
              <span className="px-2 py-0.2 rounded bg-indigo-50 text-indigo-700">推荐: Adam / 动量求解器</span>
            </div>
            <p className="text-[10.5px] leading-relaxed text-slate-400 font-normal border-l-2 border-indigo-200/50 pl-2">
              <span className="font-bold text-slate-500">实验引导：</span>
              一键加载后请注意：由于此平原地带在 <MathRenderer math="y" /> 较大时的梯度极其微弱，纯 <strong>SGD</strong> 的更新步长几乎被平盘完全稀释（步长缩减至微乎其微的泥淖漫步状态）。可以通过引入<strong>惯性动量 (Momentum/Adam)</strong> 来帮助小球横渡非凸高原平盘。
            </p>
          </div>
          <div className="mt-3.5 flex justify-end">
            <button
              onClick={() => loadExperimentByKey("beale", 0.5, 3.5, 0.005, 120, "adam")}
              className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 font-bold text-xs rounded-lg border border-indigo-200/60 transition-colors cursor-pointer"
            >
              📥 一键配置此实验地形 (Load Layout)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
