/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from "react";
import { 
  BookOpen, 
  Compass, 
  Award, 
  HelpCircle, 
  X, 
  Play, 
  Pause, 
  RotateCcw, 
  Sliders, 
  Sparkles, 
  Info 
} from "lucide-react";
import { MathRenderer } from "./MathRenderer";
import { motion, AnimatePresence } from "motion/react";

interface InteractiveSymbolProps {
  math: string;
  id: "alpha" | "beta1" | "beta2" | "epsilon" | "kappa";
  activeId: string | null;
  onClick: (id: "alpha" | "beta1" | "beta2" | "epsilon" | "kappa") => void;
}

function InteractiveSymbol({ math, id, activeId, onClick }: InteractiveSymbolProps) {
  const isActive = activeId === id;
  return (
    <button
      onClick={() => onClick(id)}
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded-md font-mono font-bold text-[12px] border transition-all duration-300 cursor-pointer ${
        isActive
          ? "bg-indigo-650 text-white border-indigo-700 shadow-md scale-105"
          : "bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200 hover:border-indigo-300"
      }`}
      type="button"
      title={`点击探索 ${math} 的交互几何解释`}
    >
      <MathRenderer math={math} />
      <span className="text-[10px] text-indigo-400">⚡</span>
    </button>
  );
}

export function KnowledgeGuide() {
  const [activeSymbol, setActiveSymbol] = useState<"alpha" | "beta1" | "beta2" | "epsilon" | "kappa" | null>(null);

  // States for interactive simulations
  const [alphaVal, setAlphaVal] = useState<number>(0.4);
  const [beta1Val, setBeta1Val] = useState<number>(0.9);
  const [beta2Val, setBeta2Val] = useState<number>(0.99);
  const [epsilonVal, setEpsilonVal] = useState<number>(0.05);
  const [kappaVal, setKappaVal] = useState<number>(15);

  const [simStep, setSimStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [simKey, setSimKey] = useState<number>(0);

  // Restart steps on symbol switch or slider adjustments
  useEffect(() => {
    setSimStep(0);
  }, [activeSymbol, alphaVal, beta1Val, beta2Val, epsilonVal, kappaVal, simKey]);

  // Handle Playback Loop
  useEffect(() => {
    if (!isPlaying || !activeSymbol) return;
    const interval = setInterval(() => {
      setSimStep((prev) => {
        // Find total matching steps for current active simulation
        let limit = 20;
        if (activeSymbol === "beta1") limit = 30;
        if (activeSymbol === "beta2") limit = 35;
        if (activeSymbol === "epsilon") limit = 25;
        if (activeSymbol === "kappa") limit = 32;

        if (prev >= limit - 1) return 0; // loop back to start
        return prev + 1;
      });
    }, 150);
    return () => clearInterval(interval);
  }, [isPlaying, activeSymbol, alphaVal, beta1Val, beta2Val, epsilonVal, kappaVal, simKey]);

  // Math models for individual parameters
  const alphaTraj = useMemo(() => {
    const traj: { x: number; y: number }[] = [];
    let cx = 50;
    for (let i = 0; i < 20; i++) {
      const cy = 35 + 0.0075 * Math.pow(cx - 150, 2);
      traj.push({ x: cx, y: cy });
      const grad = 0.015 * (cx - 150);
      cx = cx - alphaVal * grad * 125;
      if (cx < 20 || cx > 280) break;
    }
    return traj;
  }, [alphaVal]);

  const beta1Traj = useMemo(() => {
    const traj: { x: number; y: number }[] = [];
    const getY = (x: number) => 100 + Math.pow(x - 150, 2) / 190 - 20 * Math.sin((x - 100) / 14);
    const getGrad = (x: number) => (x - 150) / 95 - (20 / 14) * Math.cos((x - 100) / 14);
    
    let cx = 53;
    let vel = 0;
    const lr = 7.5;
    for (let t = 0; t < 30; t++) {
      const cy = getY(cx);
      traj.push({ x: cx, y: cy });
      const grad = getGrad(cx);
      vel = beta1Val * vel - lr * grad;
      cx = cx + vel;
      if (cx < 30 || cx > 270) break;
    }
    return traj;
  }, [beta1Val]);

  const beta2Traj = useMemo(() => {
    const trajAdaptive: { x: number; y: number }[] = [];
    const trajStandard: { x: number; y: number }[] = [];
    
    const getY = (x: number) => {
      if (x < 110) return 45 + Math.pow(x - 110, 2) / 45;
      if (x < 150) return 130 - Math.pow(x - 150, 2) / 30;
      return 130 - (x - 150) * 0.08;
    };
    const getGrad = (x: number) => {
      if (x < 110) return (x - 110) / 22.5;
      if (x < 150) return -(x - 150) / 15;
      return -0.08;
    };

    // Calculate Adaptive Path
    let cx = 65;
    let vVal = 0;
    const lrAda = 7.0;
    for (let t = 0; t < 35; t++) {
      const cy = getY(cx);
      trajAdaptive.push({ x: cx, y: cy });
      const grad = getGrad(cx);
      vVal = beta2Val * vVal + (1 - beta2Val) * (grad * grad);
      const ratio = grad / (Math.sqrt(vVal) + 0.005);
      cx = cx - lrAda * ratio;
      if (cx < 30 || cx > 270) break;
    }

    // Calculate Standard Path (Unscaled)
    cx = 65;
    const lrStd = 1.6;
    for (let t = 0; t < 35; t++) {
      const cy = getY(cx);
      trajStandard.push({ x: cx, y: cy });
      const grad = getGrad(cx);
      cx = cx - lrStd * grad * 12;
      if (cx < 30 || cx > 270) break;
    }

    return { adaptive: trajAdaptive, standard: trajStandard };
  }, [beta2Val]);

  const epsilonTraj = useMemo(() => {
    const traj: { x: number; y: number }[] = [];
    let cx = 150;
    let vVal = 0;
    for (let t = 0; t < 25; t++) {
      const cy = 110 + 0.002 * Math.pow(cx - 150, 2);
      traj.push({ x: cx, y: cy });
      
      const baseGrad = 0.004 * (cx - 150);
      // Fixed deterministic multi-frequency noise to simulate optimizer perturbation
      const noise = Math.sin(t * 2.8) * 0.28 + Math.cos(t * 5.3) * 0.16;
      const grad = baseGrad + noise;
      
      vVal = 0.9 * vVal + 0.1 * (grad * grad);
      const step = (grad / (Math.sqrt(vVal) + epsilonVal)) * 14;
      cx = cx - step;
      if (cx < 30 || cx > 270) break;
    }
    return traj;
  }, [epsilonVal]);

  const kappaTraj = useMemo(() => {
    const traj: { x: number; y: number }[] = [];
    let cx = 65;
    let cy = 45;
    const targetX = 150;
    const targetY = 90;
    const lr = 0.05 + 0.015 * Math.min(10 / kappaVal, 1);
    
    for (let t = 0; t < 32; t++) {
      traj.push({ x: cx, y: cy });
      const dx = cx - targetX;
      const dy = cy - targetY;
      
      const nextDx = dx - lr * dx;
      const nextDy = dy - lr * kappaVal * 0.9 * dy;
      
      cx = targetX + nextDx;
      cy = targetY + nextDy;
    }
    return traj;
  }, [kappaVal]);

  return (
    <div className="glass-card bg-white/90 p-5 flex flex-col h-full relative" id="knowledge_guide">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
        <BookOpen className="w-5 h-5 text-indigo-500" />
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-display">
          知识导引 & 参数互动工坊 / Knowledge & Parameter Guide
        </h3>
      </div>

      <div className="flex flex-col gap-4 text-xs text-slate-600 font-medium leading-relaxed">
        
        {/* Concept 1 */}
        <div className="space-y-2.5 p-4 bg-slate-50/50 rounded-xl border border-slate-150 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[13px] mb-2">
              <Compass className="w-4.5 h-4.5 text-indigo-500" />
              <span>梯度下降的几何美学</span>
            </div>
            <p className="font-normal text-[11.5px] leading-relaxed text-slate-600 mb-2">
              在多维空间中，标量函数 <MathRenderer math="f(X)" /> 在某点的梯度向量 <MathRenderer math="\nabla f" /> 指向该处最速上升方向。极小值寻找需逆流沿着梯度的反方向（沿 <MathRenderer math="-\nabla f" />）迭代。
            </p>
            <p className="font-normal text-[11.5px] leading-relaxed text-slate-600">
              下降路径完全正交于等高线的切线。其中最核心的每步跨度参数称为
              <InteractiveSymbol math="\alpha" id="alpha" activeId={activeSymbol} onClick={setActiveSymbol} />
              （学习率），它直接控制着模型在局部地貌中收敛或发散的速度。
            </p>
          </div>
          <div className="border-t border-slate-200/50 pt-2.5 mt-2 bg-indigo-50/20 p-2 rounded-lg font-mono text-[10px] text-indigo-800">
            公式: <MathRenderer math="X_{t+1} = X_t - \mathbf{\alpha} \nabla f(X_t)" />
          </div>
        </div>

        {/* Concept 2 */}
        <div className="space-y-2.5 p-4 bg-slate-50/50 rounded-xl border border-slate-150 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[13px] mb-2">
              <Award className="w-4.5 h-4.5 text-indigo-500" />
              <span>Hessian 矩阵与病态谷</span>
            </div>
            <p className="font-normal text-[11.5px] leading-relaxed text-slate-600 mb-2.5">
              Hessian 矩阵二阶特征值 <MathRenderer math="\lambda_1, \lambda_2" /> 描述曲面白天的凹凸情况。双正为局部碗谷，异号为无法下落的鞍点陷阱。
            </p>
            <p className="font-normal text-[11.5px] leading-relaxed text-slate-600">
              当特征值悬殊时，其曲率条件数
              <InteractiveSymbol math="\kappa" id="kappa" activeId={activeSymbol} onClick={setActiveSymbol} />
              会极高。这导致普通梯度下降在病态峡谷峭壁间反复震荡，寸步难行，必须引入惯性或者自适应缩放机制。
            </p>
          </div>
          <div className="border-t border-slate-200/50 pt-2.5 mt-2 bg-indigo-50/20 p-2 rounded-lg font-mono text-[10px] text-indigo-800">
            条件数: <MathRenderer math="\kappa = \frac{\lambda_{max}}{\lambda_{min}} \gg 1" />
          </div>
        </div>

        {/* Concept 3 */}
        <div className="space-y-2.5 p-4 bg-slate-50/50 rounded-xl border border-slate-150 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[13px] mb-2">
              <HelpCircle className="w-4.5 h-4.5 text-indigo-500" />
              <span>自适应求解器统合迭代</span>
            </div>
            <p className="font-normal text-[11.5px] leading-relaxed text-slate-600">
              现代最强的 Adam 模型统合了动量惯性
              <InteractiveSymbol math="\beta_1" id="beta1" activeId={activeSymbol} onClick={setActiveSymbol} />
              （一阶矩平滑）与能量缩放自适应
              <InteractiveSymbol math="\beta_2" id="beta2" activeId={activeSymbol} onClick={setActiveSymbol} />
              （二阶矩累计平滑）。
            </p>
            <p className="font-normal text-[11.5px] leading-relaxed text-slate-600">
              分母还放置了微小的保护参数
              <InteractiveSymbol math="\epsilon" id="epsilon" activeId={activeSymbol} onClick={setActiveSymbol} />
              以防止零梯度溢出。点击这些闪电符号展开各优化因子运作的<b>动态物理轨迹演示</b>。
            </p>
          </div>
          <div className="border-t border-slate-200/50 pt-2.5 mt-2 bg-indigo-50/20 p-2 rounded-lg font-mono text-[10px] text-indigo-800 overflow-x-auto text-[9.5px]">
            更新: <MathRenderer math="\theta_{t+1} = \theta_t - \frac{\alpha}{\sqrt{v_t} + \epsilon} m_t" />
          </div>
        </div>

        {/* Concept 4 */}
        <div className="space-y-2.5 p-4 bg-slate-50/50 rounded-xl border border-slate-150 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[13px] mb-2">
              <Sparkles className="w-4.5 h-4.5 text-indigo-500" />
              <span>拉斯特里金高度多局部极值陷阱</span>
            </div>
            <p className="font-normal text-[11.5px] leading-relaxed text-slate-600 mb-2">
              <strong>Rastrigin 函数</strong>是极其不规则的复杂非凸测试表面。它利用高频余弦震荡，在一个大型抛物面碗底之上叠加了成百上千个高度规律的局部极小值深坑险阻。
            </p>
            <p className="font-normal text-[11.5px] leading-relaxed text-slate-600">
              普通的一阶求导迭代极易受这种高频波动误导，直接窒息于离起点最近的第一个假极小碗底。其优化重在通过<strong>二阶动量积累</strong>或者<strong>随温随机噪声扰动</strong>，为寻优小球提供冲破能垒的物理动能。
            </p>
          </div>
          <div className="border-t border-slate-200/50 pt-2.5 mt-2 bg-indigo-50/20 p-2 rounded-lg font-mono text-[10px] text-indigo-800">
            公式: <MathRenderer math="f(\mathbf{x}) = A n + \sum_{i=1}^n \left[ x_i^2 - A \cos(2 \pi x_i) \right]" />
          </div>
        </div>

        {/* Concept 5 */}
        <div className="space-y-2.5 p-4 bg-slate-50/50 rounded-xl border border-slate-150 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[13px] mb-2">
              <Sliders className="w-4.5 h-4.5 text-indigo-500" />
              <span>希梅尔布劳多全局解对半分流</span>
            </div>
            <p className="font-normal text-[11.5px] leading-relaxed text-slate-600 mb-2">
              <strong>Himmelblau 函数</strong> 是一种经典的双变量多峰值非凸景观。与只有一个全局极值和许多局部虚假陷阱的地形不同，它具有 4 个数值深度完全重合、极小值都精确为 0 且位置相互呈九宫对称分布的全局真最优点。
            </p>
            <p className="font-normal text-[11.5px] leading-relaxed text-slate-600">
              当寻优质点从处于分水岭合围处的敏感中心点出发时，极其微小的二阶参数差异或随机方向微调都将起到蝴蝶效应，把路径在分流决策点推向完全相异的方向，是极佳的算法<strong>对称性分流赛跑</strong>沙盒。
            </p>
          </div>
          <div className="border-t border-slate-200/50 pt-2.5 mt-2 bg-indigo-50/20 p-2 rounded-lg font-mono text-[10px] text-indigo-800">
            公式: <MathRenderer math="f(x, y) = (x^2 + y - 11)^2 + (x + y^2 - 7)^2" />
          </div>
        </div>

        {/* Concept 6 */}
        <div className="space-y-2.5 p-4 bg-slate-50/50 rounded-xl border border-slate-150 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[13px] mb-2">
              <Compass className="w-4.5 h-4.5 text-indigo-500" />
              <span>艾克里指数衰减陡峭眼窝与尖锋</span>
            </div>
            <p className="font-normal text-[11.5px] leading-relaxed text-slate-600 mb-2">
              <strong>Ackley 函数</strong> 是描述高维极高阻尼优化的理想教材，结合了缓滑抛物面的大梯度和高频毛刺噪声。它由一个高强度的中央漏斗形指数量级剧烈凹降，和外沿无数起伏的细小正弦阶断强力拼接而成。
            </p>
            <p className="font-normal text-[11.5px] leading-relaxed text-slate-600">
              在外围低敏感度的“漫游层”，小球的移动几乎完全依赖大粒度的梯度。但一旦在正确的导航下突入到中央 <MathRenderer math="(0,0)" /> 的悬崖式暴降区时，若不能合理减慢步调或调节<strong>阻尼平滑保护项</strong>，极尖锐的陡坡反作用力会让梯度出现瞬时高维扭曲弹飞。
            </p>
          </div>
          <div className="border-t border-slate-200/50 pt-2.5 mt-2 bg-indigo-50/20 p-2 rounded-lg font-mono text-[10px] text-indigo-800">
            公式: <MathRenderer math="f(x, y) = -20e^{-0.2 \sqrt{0.5(x^2+y^2)}} - e^{0.5(\cos 2\pi x + \cos 2\pi y)} + 20 + e" />
          </div>
        </div>

        {/* Concept 7 */}
        <div className="space-y-2.5 p-4 bg-slate-50/50 rounded-xl border border-slate-150 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1.5 font-bold text-slate-800 text-[13px] mb-2">
              <Info className="w-4.5 h-4.5 text-indigo-500" />
              <span>比尔非凸阶梯脊线与微弱梯度粘滞</span>
            </div>
            <p className="font-normal text-[11.5px] leading-relaxed text-slate-600 mb-2">
              <strong>Beale 函数</strong> 呈现一种截然不同的恶劣非凸条件。其全局最优解 <MathRenderer math="(3, 0.5)" /> 紧挨着一个接近垂直隆起的高角度尖锐脊梁弯道，同时另一侧则延伸出极宽宽幅、梯度数值趋于停滞的死寂超平盘高原低平原。
            </p>
            <p className="font-normal text-[11.5px] leading-relaxed text-slate-600">
              在超低偏导平原中，没有自适应自倍增的 <strong>RMSprop</strong> 亦或是内置物理动量的优化器将由于梯度信息近乎于零，从而直接在这块泥淖中丧失动力发生“粘滞”。而在面对非凸高峰与峭壁拐弯时，它能极为明晰地揭示自适应算子动态调节步幅的必要性。
            </p>
          </div>
          <div className="border-t border-slate-200/50 pt-2.5 mt-2 bg-indigo-50/20 p-2 rounded-lg font-mono text-[10px] text-indigo-800">
            公式: <MathRenderer math="f(x,y) = (1.5-x+xy)^2 + (2.25-x+xy^2)^2 + (2.625-x+xy^3)^2" />
          </div>
        </div>

      </div>

      {/* Interactive Popover Panel */}
      <AnimatePresence>
        {activeSymbol && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs rounded-xl flex items-center justify-center p-3 z-50 pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.95, y: 15 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 15 }}
              className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden flex flex-col h-full max-h-[460px] md:max-h-[480px]"
            >
              {/* Popover Header */}
              <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between shadow-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  <span className="font-bold text-sm tracking-wide">
                    {activeSymbol === "alpha" && "学习率 𝛼 物理轨迹变化"}
                    {activeSymbol === "beta1" && "动量一阶衰减 𝛽₁ 惯性滑行轨迹"}
                    {activeSymbol === "beta2" && "自适应二阶衰减 𝛽₂ 陡凹横降比"}
                    {activeSymbol === "epsilon" && "分母稳定保护因子 𝜖 的阻尼抗抖"}
                    {activeSymbol === "kappa" && "Hessian 矩阵条件数 𝜅 的病态扭曲"}
                  </span>
                </div>
                <button
                  onClick={() => setActiveSymbol(null)}
                  className="text-slate-400 hover:text-white hover:bg-slate-800 p-1 rounded-md transition-colors cursor-pointer"
                  type="button"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Popover Content Grid */}
              <div className="p-4 flex-1 overflow-y-auto space-y-4">
                
                {/* Explain text card */}
                <div className="bg-slate-55 p-3 rounded-lg border border-slate-150 flex gap-3 text-[11px] text-slate-600 leading-relaxed font-normal">
                  <Info className="w-5 h-5 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    {activeSymbol === "alpha" && (
                      <p>
                        <b>学习率 <MathRenderer math="\alpha" /></b> 控制着每一步在局部斜率方向的滑动距离。
                        如果 <b>太小</b> (例如 &lt; 0.15)，球会非常迟钝，需要大量迭代才能挪进谷底；
                        如果 <b>太大</b> (例如 &gt; 1.0)，在谷底陡壁上会疯狂横冲跨过中点，甚至导致物理轨道不断外推膨胀、彻底发散爆头！
                      </p>
                    )}
                    {activeSymbol === "beta1" && (
                      <p>
                        <b>动量因子 <MathRenderer math="\beta_1" /></b> 模拟了经典物理的惯性质乘。
                        当惯性接近零时 (<MathRenderer math="\beta_1 = 0" />)，遇到路途上的坎坷（浅局部极小凹坑）球会立刻停转，无法爬出。
                        高惯性 (<MathRenderer math="\beta_1 \ge 0.9" />) 让滚动的球在快速下冲蓄力后拥有足够的物理动能<b>冲过并逃离假极小山包</b>，直抵真正的最深谷底！
                      </p>
                    )}
                    {activeSymbol === "beta2" && (
                      <p>
                        <b>自适应缩放常数 <MathRenderer math="\beta_2" /></b> 衡量历史梯度平方的累计记忆长度。
                        自适应优化器相比普通 SGD 的最大优越性在于：在<b>极度平缓的原野/鞍点外延</b>，它会衰减自适应累计分母，将微弱的步调等效放大（平地大步走）；而遇到<b>惊险峭壁</b>则瞬时约束步长避免坍塌（峭壁中碎步走）。
                      </p>
                    )}
                    {activeSymbol === "epsilon" && (
                      <p>
                        <b>平滑稳定因子 <MathRenderer math="\epsilon" /></b> 保障了能量不为零。
                        但若其被设得<b>极端微小却又遇到了强劲白噪声</b>，分母在平地中被除到无限大，会将哪怕是空气波动的杂乱梯度放大极多倍，令球在终点处疯狂发抖震颤抛飞；合理增加 <MathRenderer math="\epsilon" /> 则起到机械阻尼器作用，完美吸收热扰动。
                      </p>
                    )}
                    {activeSymbol === "kappa" && (
                      <p>
                        <b>Hessian 条件数 <MathRenderer math="\kappa" /></b> 是一阶与二阶最宽最严刚性尺度的曲率比。
                        条件数越大的山脉，代表山崖像一条极细的“一线天”裂谷。对于普通下降算子：刚跨向峡谷底部一点点，极强壁挂梯度瞬间反弹将其无情弹向对岸天边，形成高频低效率横切反弹，根本无法沿谷底纵向推进。
                      </p>
                    )}
                  </div>
                </div>

                {/* SVG Visualizer Area */}
                <div className="relative bg-slate-900 rounded-xl border border-slate-800 p-2 overflow-hidden flex flex-col items-center">
                  <div className="absolute top-2 left-3 flex items-center gap-1.5 text-[10px] text-slate-400 font-bold tracking-wider font-mono uppercase bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                    实时物理轨道模拟 (Physical Simulation)
                  </div>

                  {/* Simulations rendering as SVGs */}
                  <div className="w-full h-[180px] flex items-center justify-center mt-4">
                    {activeSymbol === "alpha" && (
                      <svg viewBox="0 0 300 180" className="w-full h-full max-w-sm">
                        {/* Parabola landscape */}
                        <path
                          d={(() => {
                            const pts = [];
                            for (let x = 40; x <= 260; x += 5) {
                              const y = 35 + 0.0075 * Math.pow(x - 150, 2);
                              pts.push(`${x},${y}`);
                            }
                            return `M ${pts.join(" L ")}`;
                          })()}
                          fill="none"
                          stroke="rgba(147, 197, 253, 0.3)"
                          strokeWidth="2.5"
                          strokeDasharray="4 2"
                        />
                        {/* Bottom dot marker */}
                        <circle cx="150" cy="35" r="4.5" fill="#10b981" opacity="0.75" />

                        {/* Trajectory lines */}
                        <polyline
                          points={alphaTraj.map((p) => `${p.x},${p.y}`).join(" ")}
                          fill="none"
                          stroke="#6366f1"
                          strokeWidth={1.8}
                        />

                        {/* Trajectory dots */}
                        {alphaTraj.map((p, idx) => (
                          <circle
                            key={idx}
                            cx={p.x}
                            cy={p.y}
                            r={idx === alphaTraj.length - 1 ? 5 : 2.5}
                            fill={idx === alphaTraj.length - 1 ? "#ec4899" : "#6366f1"}
                            opacity={idx <= simStep ? 1 : 0.15}
                          />
                        ))}

                        {/* Playing animated orb */}
                        {alphaTraj[simStep % alphaTraj.length] && (
                          <circle
                            cx={alphaTraj[simStep % alphaTraj.length].x}
                            cy={alphaTraj[simStep % alphaTraj.length].y}
                            r="6"
                            className="fill-indigo-400 stroke-white stroke-2 shadow-lg"
                          />
                        )}
                        <text x="150" y="22" textAnchor="middle" fill="#10b981" fontSize="9" fontWeight="bold">谷底目标 (Global Minimum)</text>
                      </svg>
                    )}

                    {activeSymbol === "beta1" && (
                      <svg viewBox="0 0 300 180" className="w-full h-full max-w-sm">
                        {/* Bumpy Landscape */}
                        <path
                          d={(() => {
                            const pts = [];
                            for (let x = 40; x <= 260; x += 3) {
                              const y = 100 + Math.pow(x - 150, 2) / 190 - 20 * Math.sin((x - 100) / 14);
                              pts.push(`${x},${y}`);
                            }
                            return `M ${pts.join(" L ")}`;
                          })()}
                          fill="none"
                          stroke="rgba(147, 197, 253, 0.3)"
                          strokeWidth="2.5"
                        />
                        {/* Mountain annotations */}
                        <line x1="122" y1="50" x2="122" y2="120" stroke="rgba(239, 68, 68, 0.2)" strokeDasharray="2 2" />
                        <text x="122" y="44" fill="#f87171" fontSize="8" textAnchor="middle">局部假山包 Barrier</text>
                        <text x="96" y="152" fill="#94a3b8" fontSize="8" textAnchor="middle">假极小 trap</text>
                        <text x="210" y="152" fill="#34d399" fontSize="8" textAnchor="middle">真全局深谷 Minimum</text>

                        {/* Trajectory */}
                        <polyline
                          points={beta1Traj.map((p) => `${p.x},${p.y}`).join(" ")}
                          fill="none"
                          stroke="#c084fc"
                          strokeWidth={1.8}
                        />

                        {/* Trajectory dots */}
                        {beta1Traj.map((p, idx) => (
                          <circle
                            key={idx}
                            cx={p.x}
                            cy={p.y}
                            r={2.2}
                            fill="#c084fc"
                            opacity={idx <= simStep ? 1 : 0.15}
                          />
                        ))}

                        {/* Operating animation ball */}
                        {beta1Traj[simStep % beta1Traj.length] && (
                          <circle
                            cx={beta1Traj[simStep % beta1Traj.length].x}
                            cy={beta1Traj[simStep % beta1Traj.length].y}
                            r="6"
                            className="fill-purple-400 stroke-white stroke-2"
                          />
                        )}
                      </svg>
                    )}

                    {activeSymbol === "beta2" && (
                      <svg viewBox="0 0 300 180" className="w-full h-full max-w-sm">
                        {/* Landscape describing drop + flat */}
                        <path
                          d={(() => {
                            const pts = [];
                            const getY = (x: number) => {
                              if (x < 110) return 45 + Math.pow(x - 110, 2) / 45;
                              if (x < 150) return 130 - Math.pow(x - 150, 2) / 30;
                              return 130 - (x - 150) * 0.08;
                            };
                            for (let x = 40; x <= 260; x += 3) {
                              pts.push(`${x},${getY(x)}`);
                            }
                            return `M ${pts.join(" L ")}`;
                          })()}
                          fill="none"
                          stroke="rgba(148, 163, 184, 0.3)"
                          strokeWidth="2.5"
                        />
                        <text x="65" y="32" fill="#f43f5e" fontSize="8">陡坡 Steep Slope</text>
                        <line x1="150" y1="30" x2="150" y2="160" stroke="rgba(255,255,255,0.08)" strokeDasharray="3 2" />
                        <text x="195" y="112" fill="#fbbf24" fontSize="8" textAnchor="middle">开阔死寂平原 Flat Plain</text>

                        {/* Standard SGD Path (Red/Orange) */}
                        <path
                          d={beta2Traj.standard.slice(0, simStep + 1).map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ")}
                          fill="none"
                          stroke="#ef4444"
                          strokeWidth={1.5}
                          opacity={0.65}
                        />
                        {beta2Traj.standard.map((p, idx) => (
                          <circle key={`std-${idx}`} cx={p.x} cy={p.y} r="2" fill="#ef4444" opacity={idx <= simStep ? 0.6 : 0.05} />
                        ))}

                        {/* Adaptive Optimizer Path (Glow Green) */}
                        <path
                          d={beta2Traj.adaptive.slice(0, simStep + 1).map((p, idx) => `${idx === 0 ? "M" : "L"} ${p.x},${p.y}`).join(" ")}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth={2.2}
                        />
                        {beta2Traj.adaptive.map((p, idx) => (
                          <circle key={`ada-${idx}`} cx={p.x} cy={p.y} r="2.5" fill="#10b981" opacity={idx <= simStep ? 1 : 0.08} />
                        ))}

                        {/* Adaptive Animated Particle */}
                        {beta2Traj.adaptive[simStep % beta2Traj.adaptive.length] && (
                          <circle
                            cx={beta2Traj.adaptive[simStep % beta2Traj.adaptive.length].x}
                            cy={beta2Traj.adaptive[simStep % beta2Traj.adaptive.length].y}
                            r="5.5"
                            className="fill-emerald-400 stroke-white stroke-2 shadow-md animate-pulse"
                          />
                        )}

                        {/* Standard Animated Particle */}
                        {beta2Traj.standard[simStep % beta2Traj.standard.length] && (
                          <circle
                            cx={beta2Traj.standard[simStep % beta2Traj.standard.length].x}
                            cy={beta2Traj.standard[simStep % beta2Traj.standard.length].y}
                            r="4.5"
                            className="fill-red-400 stroke-rose-950 stroke-1"
                            opacity={0.8}
                          />
                        )}

                        {/* Legend */}
                        <g transform="translate(190, 20)">
                          <circle cx="0" cy="0" r="3.5" fill="#10b981" />
                          <text x="8" y="2" fill="#cbd5e1" fontSize="8" fontWeight="bold">自适应 (平原加速过)</text>
                          <circle cx="0" cy="14" r="3.5" fill="#ef4444" />
                          <text x="8" y="16" fill="#cbd5e1" fontSize="8">普通 SGD (平原蠕动卡死)</text>
                        </g>
                      </svg>
                    )}

                    {activeSymbol === "epsilon" && (
                      <svg viewBox="0 0 300 180" className="w-full h-full max-w-sm">
                        {/* Parabola but flatter */}
                        <path
                          d={(() => {
                            const pts = [];
                            for (let x = 40; x <= 260; x += 5) {
                              const y = 110 + 0.002 * Math.pow(x - 150, 2);
                              pts.push(`${x},${y}`);
                            }
                            return `M ${pts.join(" L ")}`;
                          })()}
                          fill="none"
                          stroke="rgba(147, 197, 253, 0.25)"
                          strokeWidth="2.5"
                        />
                        <text x="150" y="146" textAnchor="middle" fill="#64748b" fontSize="8">
                          {epsilonVal < 0.015 ? "❗平滑项极其微弱，在平坦收敛区有白噪音强震" : "✓ 阻尼平顺，白噪音被 epsilon 吸收消溶"}
                        </text>

                        {/* Trajectory */}
                        <polyline
                          points={epsilonTraj.slice(0, simStep + 1).map((p) => `${p.x},${p.y}`).join(" ")}
                          fill="none"
                          stroke={epsilonVal < 0.015 ? "#f43f5e" : "#3b82f6"}
                          strokeWidth={1.8}
                        />

                        {/* Trajectory dots */}
                        {epsilonTraj.map((p, idx) => (
                          <circle
                            key={idx}
                            cx={p.x}
                            cy={p.y}
                            r={2.5}
                            fill={epsilonVal < 0.015 ? "#f43f5e" : "#3b82f6"}
                            opacity={idx <= simStep ? 1 : 0.1}
                          />
                        ))}

                        {/* Particle ball */}
                        {epsilonTraj[simStep % epsilonTraj.length] && (
                          <circle
                            cx={epsilonTraj[simStep % epsilonTraj.length].x}
                            cy={epsilonTraj[simStep % epsilonTraj.length].y}
                            r="5"
                            className={epsilonVal < 0.015 ? "fill-rose-400 stroke-white stroke-2 animate-bounce" : "fill-blue-400 stroke-white stroke-2"}
                          />
                        )}
                      </svg>
                    )}

                    {activeSymbol === "kappa" && (
                      <svg viewBox="0 0 300 180" className="w-full h-full max-w-sm">
                        {/* Concentric Ellipses Center at (150, 90) representing steep contours */}
                        {[30, 60, 90, 120].map((rx, idx) => {
                          const ry = rx / Math.sqrt(kappaVal);
                          return (
                            <ellipse
                              key={idx}
                              cx="150"
                              cy="90"
                              rx={rx}
                              ry={ry}
                              fill="none"
                              stroke="rgba(99, 102, 241, 0.25)"
                              strokeWidth="1.2"
                            />
                          );
                        })}

                        {/* Center Point */}
                        <circle cx="150" cy="90" r="3.5" fill="#10b981" />

                        {/* Trajectory Line vector */}
                        <polyline
                          points={kappaTraj.slice(0, simStep + 1).map((p) => `${p.x},${p.y}`).join(" ")}
                          fill="none"
                          stroke="#fb7185"
                          strokeWidth={1.6}
                        />

                        {/* Dots along descent */}
                        {kappaTraj.map((p, idx) => (
                          <circle
                            key={idx}
                            cx={p.x}
                            cy={p.y}
                            r={idx === 0 ? 3.5 : 2}
                            fill={idx === 0 ? "#10b981" : "#f43f5e"}
                            opacity={idx <= simStep ? 1 : 0.08}
                          />
                        ))}

                        {/* Trajectory Animated bead */}
                        {kappaTraj[simStep % kappaTraj.length] && (
                          <circle
                            cx={kappaTraj[simStep % kappaTraj.length].x}
                            cy={kappaTraj[simStep % kappaTraj.length].y}
                            r="5.5"
                            className="fill-rose-400 stroke-white stroke-1.5 shadow-sm"
                          />
                        )}
                        <text x="150" y="24" textAnchor="middle" fill="#94a3b8" fontSize="8">纵横曲率条件数 𝛫 比值极高时，轨迹将疯狂反弹跳跃</text>
                      </svg>
                    )}
                  </div>
                </div>

                {/* Controller Panel of simulation */}
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-150 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 text-slate-800 font-bold text-[11px] font-display">
                      <Sliders className="w-4 h-4 text-indigo-500" />
                      物理参数调校与控制 (Realtime Adjustments)
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className={`px-2.5 py-1 text-[11px] font-bold rounded-lg cursor-pointer flex items-center gap-1 leading-none shadow-xs transition-colors ${
                          isPlaying ? "bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200" : "bg-indigo-600 text-white hover:bg-indigo-700"
                        }`}
                        type="button"
                      >
                        {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                        {isPlaying ? "暂停动画" : "继续动画"}
                      </button>

                      <button
                        onClick={() => setSimKey(prev => prev + 1)}
                        className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                        title="重置模拟"
                        type="button"
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Individual Slider according to active parameter selection */}
                  <div className="space-y-1.5">
                    {activeSymbol === "alpha" && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500 font-medium">调整学习率 (𝛼):</span>
                          <span className={`font-mono font-bold ${alphaVal > 0.95 ? "text-rose-600" : alphaVal < 0.15 ? "text-amber-600" : "text-indigo-650"}`}>
                            {alphaVal.toFixed(3)} {alphaVal > 0.95 ? "(高发散危崖)" : alphaVal < 0.15 ? "(极度 sluggish 蜗牛爬)" : "(均衡收敛圈)"}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.05"
                          max="1.15"
                          step="0.05"
                          value={alphaVal}
                          onChange={(e) => setAlphaVal(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-650 focus:outline-none"
                        />
                      </div>
                    )}

                    {activeSymbol === "beta1" && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500 font-medium">惯性极乘 (𝛽₁ 一阶矩历史记忆):</span>
                          <span className={`font-mono font-bold ${beta1Val > 0.85 ? "text-emerald-600" : "text-amber-600"}`}>
                            {beta1Val.toFixed(3)} {beta1Val > 0.85 ? "(蓄力极满：轻松越过局部山包)" : "(惯性丧失：滚死在第一个坑洼中)"}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.00"
                          max="0.96"
                          step="0.03"
                          value={beta1Val}
                          onChange={(e) => setBeta1Val(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-650 focus:outline-none"
                        />
                      </div>
                    )}

                    {activeSymbol === "beta2" && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500 font-medium">二阶方差平滑衰减率 (𝛽₂):</span>
                          <span className={`font-mono font-bold ${beta2Val > 0.95 ? "text-indigo-650" : "text-slate-500"}`}>
                            {beta2Val.toFixed(3)} (统计滑窗窗口宽度)
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.50"
                          max="0.999"
                          step="0.01"
                          value={beta2Val}
                          onChange={(e) => setBeta2Val(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-650 focus:outline-none"
                        />
                      </div>
                    )}

                    {activeSymbol === "epsilon" && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500 font-medium">分母数值保护精度 (𝜖):</span>
                          <span className={`font-mono font-bold ${epsilonVal < 0.015 ? "text-red-500" : "text-indigo-650"}`}>
                            {epsilonVal.toFixed(3)} {epsilonVal < 0.015 ? "(高放大率：微小尘埃亦弹飞)" : "(阻尼锁死：平顺不震扰)"}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="0.001"
                          max="0.30"
                          step="0.01"
                          value={epsilonVal}
                          onChange={(e) => setEpsilonVal(parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-650 focus:outline-none"
                        />
                      </div>
                    )}

                    {activeSymbol === "kappa" && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[11px]">
                          <span className="text-slate-500 font-medium">设置特征值纵横刚性条件数 (𝛫):</span>
                          <span className={`font-mono font-bold ${kappaVal > 25 ? "text-rose-600 font-black" : "text-indigo-650"}`}>
                            {kappaVal.toFixed(3)} {kappaVal > 25 ? "(恶性‘一线天’峡谷：拼死振荡)" : "(圆滑浅谷：长驱直入)"}
                          </span>
                        </div>
                        <input
                          type="range"
                          min="1"
                          max="40"
                          step="1"
                          value={kappaVal}
                          onChange={(e) => setKappaVal(parseInt(e.target.value, 10))}
                          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-650 focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </div>

              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

