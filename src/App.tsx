/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { FormulaPreset, OptimizerConfig, RunResult } from "./types";
import { FORMULA_PRESETS, runOptimization } from "./utils/mathEngine";
import { ControlPanel } from "./components/ControlPanel";
import { VisualizerPanel } from "./components/VisualizerPanel";
import { TablePanel } from "./components/TablePanel";
import { MetricsPanel } from "./components/MetricsPanel";
import { ExporterPanel } from "./components/ExporterPanel";
import { AiInsightsPanel } from "./components/AiInsightsPanel";
import { KnowledgeGuide } from "./components/KnowledgeGuide";
import { ExperimentGuide } from "./components/ExperimentGuide";
import { Activity, Compass, HelpCircle, GraduationCap } from "lucide-react";

export default function App() {
  const defaultPreset = FORMULA_PRESETS[0]; // Bowl Paraboloid

  // Central state management
  const [activePreset, setActivePreset] = useState<FormulaPreset>(defaultPreset);
  const [config, setConfig] = useState<OptimizerConfig>({
    id: defaultPreset.id,
    name: defaultPreset.name,
    learningRate: 0.05,
    maxSteps: 100,
    initialX: 3.2,
    initialY: 2.8,
    beta1: 0.9,
    beta2: 0.99,
    epsilon: 1e-8,
    noiseLevel: 0
  });

  const [activeResult, setActiveResult] = useState<RunResult | null>(null);
  const [allResults, setAllResults] = useState<RunResult[]>([]);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(0);
  const [activeOptimizerId, setActiveOptimizerId] = useState<string>("adam");
  const [isSolving, setIsSolving] = useState(false);
  const [hasStartedOptimization, setHasStartedOptimization] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [showKnowledge, setShowKnowledge] = useState(false);
  const [showExperiment, setShowExperiment] = useState(false);

  // Reactive and synchronous solver to maintain 100% stable real-time synchronization
  // This completely resolves race conditions caused by multiple pending setTimeout tasks.
  useEffect(() => {
    // Whenever parameters, formula, or optimizer change, reset solving and charts state
    setHasStartedOptimization(false);
    setIsAnimating(false);

    // 1. Run the active solver configuration
    const primaryRes = runOptimization(activePreset, activeOptimizerId as any, config);
    setActiveResult(primaryRes);

    // 2. Run all other optimizers concurrently to simulate the comparative "Optimizer Race" in real-time
    const optimizersList: ("sgd" | "momentum" | "adagrad" | "rmsprop" | "adam")[] = [
      "sgd",
      "momentum",
      "adagrad",
      "rmsprop",
      "adam"
    ];

    const raceRuns = optimizersList.map((optimizerType) => {
      return runOptimization(activePreset, optimizerType, config);
    });

    setAllResults(raceRuns);

    // Reset index to 0 so the ball/path is fresh
    setSelectedStepIndex(0);
  }, [activePreset, config, activeOptimizerId]);

  // Handle manual "Solve Map" button clicks by resetting selectedStepIndex to 0 (restart display)
  const handleTriggerSolve = () => {
    setSelectedStepIndex(0);
    setHasStartedOptimization(true);
    setIsAnimating(true);
  };

  // Reset only the current active optimizer's velocity buffers and start fresh
  const handleResetOptimizer = () => {
    setSelectedStepIndex(0);
    setHasStartedOptimization(false);
    setIsAnimating(false);
    // Forces re-evaluation of the purely functional mathEngine (which starts with zeroed momentum v & s at step 0)
    setConfig((prev) => ({ ...prev }));
  };

  // Experiment loader trigger: loads preset parameters, and triggers the solver
  const handleApplyExperiment = (preset: FormulaPreset, expConfig: OptimizerConfig, activeOpt: string) => {
    setActivePreset(preset);
    setConfig(expConfig);
    setActiveOptimizerId(activeOpt);
    setSelectedStepIndex(0);
    setHasStartedOptimization(false);
    setIsAnimating(false);
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] font-sans text-slate-800 flex flex-col selection:bg-indigo-100 selection:text-indigo-900" id="app_root">
      
      {/* 1. Header / Navbar */}
      <header className="max-w-7xl w-full mx-auto mt-4 px-4 sm:px-0 shrink-0 sticky top-4 z-50">
        <div className="glass-card bg-white/90 px-6 py-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Logo & Heading Title */}
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-lg text-white shadow-sm shadow-indigo-100">
              <Compass className="w-5 h-5 animate-spin-slow text-white" />
            </div>
            <div className="flex items-baseline gap-2">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight font-display">
                GradientSolver <span className="text-indigo-600 font-medium font-display">AI</span>
              </h1>
              <span className="text-[10px] font-semibold text-slate-400 bg-slate-100/80 px-2 py-0.5 rounded-md border border-slate-200/50">v2.4.0 Stable</span>
            </div>
          </div>

          {/* Nav Links / Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowKnowledge(!showKnowledge)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                showKnowledge
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-100 font-bold"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 bg-white"
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>知识导引</span>
              <span className={`w-1.5 h-1.5 rounded-full ${showKnowledge ? "bg-white" : "bg-slate-300"}`} />
            </button>
            <button
              onClick={() => setShowExperiment(!showExperiment)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                showExperiment
                  ? "bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-100 font-bold"
                  : "border-slate-200 text-slate-600 hover:bg-slate-50 bg-white"
              }`}
            >
              <HelpCircle className="w-3.5 h-3.5" />
              <span>实验指南</span>
              <span className={`w-1.5 h-1.5 rounded-full ${showExperiment ? "bg-white" : "bg-slate-300"}`} />
            </button>
            <div className="h-4 w-px bg-slate-200 hidden sm:block mx-1"></div>
            <div className="flex items-center text-xs text-slate-500 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2 animate-pulse inline-block"></span>
              AI 诊断模块已就绪
            </div>
          </div>

        </div>
      </header>

      {/* 2. Main content viewport section */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">

        {/* Dynamic Physics & Geometry Feature Slices */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Slice 1: Rigid Body Marble Physics */}
          <div className="bg-gradient-to-r from-amber-500/10 to-rose-500/10 border border-amber-200/60 rounded-2xl p-4 flex items-start gap-3.5 shadow-xs transition-all hover:shadow-md">
            <div className="bg-amber-500/15 p-2 rounded-xl text-amber-700 shrink-0">
              <Activity className="w-5 h-5 animate-pulse" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-xs font-sans">
                  刚体惯性物理滚落模式 (Rigid Body Marble Physics)
                </h3>
                <span className="text-[9px] bg-amber-500/20 text-amber-800 px-1.5 py-0.2 rounded-full font-extrabold uppercase tracking-wide">ODE 仿真</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                提供<strong>离散数学迭代步进</strong>与<strong>连续物理 ODE 滚动</strong>双通道。在物理模式下，采用连续动力学微分方程，将优化轨迹渲染为带有重力加速度、质量、动能及阻尼摩擦力的真实金属钢球滑落过程。
              </p>
            </div>
          </div>

          {/* Slice 2: Dynamic Thermal Perturbation Ripple */}
          <div className="bg-gradient-to-r from-purple-500/10 to-indigo-500/10 border border-purple-200/60 rounded-2xl p-4 flex items-start gap-3.5 shadow-xs transition-all hover:shadow-md">
            <div className="bg-purple-500/15 p-2 rounded-xl text-purple-700 shrink-0">
              <Compass className="w-5 h-5 animate-bounce" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-800 text-xs font-sans">
                  动态随机噪声扰动涟漪 (Dynamic Thermal Perturbation)
                </h3>
                <span className="text-[9px] bg-purple-500/20 text-purple-800 px-1.5 py-0.2 rounded-full font-extrabold uppercase tracking-wide">SGD 扰动</span>
              </div>
              <p className="text-[11px] text-slate-500 leading-relaxed font-normal">
                拉大“地形扰动 (Gaussian Noise)”时，会在曲面上实时激起高频微小正交水波涟漪，钢球周围散发紫荧光粒子热振动场。形象表达出梯度随机化在逃逸马鞍点/局部最优陷阱时的动力学正则化物理写照。
              </p>
            </div>
          </div>
        </div>
        
        {/* Double side-by-side dashboard structure */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* Left Column: Config settings */}
          <div className="lg:col-span-5 flex flex-col">
            <ControlPanel
              activePreset={activePreset}
              config={config}
              onFormulaChange={setActivePreset}
              onConfigChange={setConfig}
              activeOptimizerId={activeOptimizerId}
              onOptimizerChange={setActiveOptimizerId}
              onTriggerSolve={handleTriggerSolve}
              isSolving={isSolving}
              onResetOptimizer={handleResetOptimizer}
            />
          </div>

          {/* Right Column: Visualization elements */}
          <div className="lg:col-span-7 flex flex-col">
            <VisualizerPanel
              preset={activePreset}
              activeResult={activeResult}
              allResults={allResults}
              selectedStepIndex={selectedStepIndex}
              onSelectStep={setSelectedStepIndex}
              isLoading={isSolving}
              config={config}
              isAnimating={isAnimating}
              setIsAnimating={setIsAnimating}
              onStartOptimization={() => setHasStartedOptimization(true)}
            />
          </div>

        </div>

        {/* 3. Calculations step table & metrics details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          
          {/* Calculation Step logs table */}
          <div className="flex flex-col">
            <TablePanel
              activeResult={activeResult}
              selectedStepIndex={selectedStepIndex}
              onSelectStep={setSelectedStepIndex}
            />
          </div>

          {/* Loss curves metrics dashboards */}
          <div className="flex flex-col">
            <MetricsPanel
              activeResult={activeResult}
              selectedStepIndex={selectedStepIndex}
              hasStartedOptimization={hasStartedOptimization}
            />
          </div>

        </div>

        {/* 4. PyTorch exporters & AI standalone diagnostic insight module */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* AI insights standalone configuration component */}
          <div className="lg:col-span-7 flex flex-col">
            <AiInsightsPanel
              preset={activePreset}
              config={config}
              activeResult={activeResult}
              allResults={allResults}
            />
          </div>

          {/* PyTorch/NumPy exporters */}
          <div className="lg:col-span-5 flex flex-col">
            <ExporterPanel
              preset={activePreset}
              activeResult={activeResult}
              config={config}
              selectedStepIndex={selectedStepIndex}
            />
          </div>

        </div>

        {/* 5. Separate Knowledge Guide & Experiment Guide pages */}
        {(showKnowledge || showExperiment) ? (
          <div className="border-t border-slate-200/60 pt-6 transition-all duration-300">
            <div className={`grid grid-cols-1 ${showKnowledge && showExperiment ? "lg:grid-cols-2" : "lg:grid-cols-1"} gap-6`}>
              
              {/* Knowledge guide */}
              {showKnowledge && (
                <div className="flex flex-col bg-white/40 p-4.5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200/60">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest font-display flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-indigo-600" />
                      知识导引专区 / Knowledge Guide
                    </span>
                    <button 
                      onClick={() => setShowKnowledge(false)}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-0.5 rounded transition-all cursor-pointer"
                    >
                      收起 ×
                    </button>
                  </div>
                  <KnowledgeGuide />
                </div>
              )}

              {/* Experiment guide with config loaders */}
              {showExperiment && (
                <div className="flex flex-col bg-white/40 p-4.5 rounded-2xl border border-slate-200/80 shadow-xs">
                  <div className="flex justify-between items-center mb-3 pb-2 border-b border-slate-200/60">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-widest font-display flex items-center gap-1.5">
                      <HelpCircle className="w-4 h-4 text-indigo-600" />
                      实验指南与配置加载器 / Experiment Guide
                    </span>
                    <button 
                      onClick={() => setShowExperiment(false)}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2 py-0.5 rounded transition-all cursor-pointer"
                    >
                      收起 ×
                    </button>
                  </div>
                  <ExperimentGuide onApplyExperiment={handleApplyExperiment} />
                </div>
              )}

            </div>
          </div>
        ) : (
          /* Compact view when both are hidden, keeping the interface minimal and elegant */
          <div className="border-t border-slate-200/60 pt-4 pb-2 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs bg-slate-100/60 p-4 rounded-xl border border-slate-200/50">
            <div className="text-slate-500 flex items-center gap-2">
              <Compass className="w-4.5 h-4.5 text-indigo-600 animate-spin-slow" />
              <span>知识导引与实验指南已收起，主界面高度已自动优化缩减。您可以随时在上方导航栏或在此一健展开详情阅读。</span>
            </div>
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => setShowKnowledge(true)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-250 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 text-indigo-700 text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                💡 展开知识导引
              </button>
              <button
                onClick={() => setShowExperiment(true)}
                className="px-3.5 py-1.5 rounded-lg border border-slate-250 bg-white hover:border-indigo-300 hover:bg-indigo-50/30 text-indigo-700 text-xs font-semibold shadow-xs transition-all cursor-pointer"
              >
                🔬 展开实验指南
              </button>
            </div>
          </div>
        )}

      </main>

      {/* 6. Footer section */}
      <footer className="bg-white/80 border-t border-slate-200 py-6 text-center text-xs mt-12">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-slate-500">
          <p>© 2026 梯度优化求解代数系统 - 具有微积分几何美学的智能诊断舱</p>
          <div className="flex gap-4">
            <a href="#knowledge_guide" className="hover:text-indigo-600 transition-colors font-medium">几何学原理</a>
            <a href="#experiment_guide" className="hover:text-indigo-600 transition-colors font-medium">交互指南</a>
            <a href="#calculation_table_card" className="hover:text-indigo-600 transition-colors font-medium">解析表格</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
