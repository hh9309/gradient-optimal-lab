/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { FormulaPreset, OptimizerConfig } from "../types";
import { FORMULA_PRESETS, parseCustomFormula } from "../utils/mathEngine";
import { Settings, Play, Sliders, Hash, Activity, RotateCcw } from "lucide-react";
import { MathRenderer } from "./MathRenderer";

interface ControlPanelProps {
  onFormulaChange: (preset: FormulaPreset) => void;
  onConfigChange: (config: OptimizerConfig) => void;
  activePreset: FormulaPreset;
  config: OptimizerConfig;
  activeOptimizerId: string;
  onOptimizerChange: (optId: string) => void;
  onTriggerSolve: () => void;
  isSolving: boolean;
  onResetOptimizer?: () => void;
}

export function ControlPanel({
  onFormulaChange,
  onConfigChange,
  activePreset,
  config,
  activeOptimizerId,
  onOptimizerChange,
  onTriggerSolve,
  isSolving,
  onResetOptimizer
}: ControlPanelProps) {
  const [selectedPresetId, setSelectedPresetId] = useState<string>(activePreset.id);
  const [customFormulaText, setCustomFormulaText] = useState("x^2 + 3 * y^2 - 0.2 * cos(3 * pi * x)");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showResetFeedback, setShowResetFeedback] = useState(false);

  const handleResetOptimizerClick = () => {
    if (onResetOptimizer) {
      onResetOptimizer();
    }
    setShowResetFeedback(true);
    setTimeout(() => {
      setShowResetFeedback(false);
    }, 2500);
  };

  const handlePresetSelect = (id: string) => {
    setSelectedPresetId(id);
    if (id === "custom") {
      const parsed = parseCustomFormula(customFormulaText);
      onFormulaChange(parsed);
    } else {
      const found = FORMULA_PRESETS.find((p) => p.id === id);
      if (found) {
        onFormulaChange(found);
        // Adjust start coordinate to be safely inside limits
        const midX = (found.rangeX[0] + found.rangeX[1]) / 2;
        const midY = (found.rangeY[0] + found.rangeY[1]) / 2;
        // set starting to some interesting point away from 0,0
        const startX = found.globalMinima && found.globalMinima.length > 0 
          ? found.globalMinima[0][0] - 1.5 
          : found.rangeX[0] + (found.rangeX[1] - found.rangeX[0]) * 0.75;
        const startY = found.globalMinima && found.globalMinima.length > 0 
          ? found.globalMinima[0][1] + 1.2 
          : found.rangeY[0] + (found.rangeY[1] - found.rangeY[0]) * 0.8;

        // Clip to avoid falling exactly on minima
        onConfigChange({
          ...config,
          initialX: Number(startX.toFixed(3)),
          initialY: Number(startY.toFixed(3)),
        });
      }
    }
  };

  const applyCustomFormula = () => {
    const parsed = parseCustomFormula(customFormulaText);
    onFormulaChange(parsed);
  };

  const handleSliderChange = (key: keyof OptimizerConfig, value: number) => {
    onConfigChange({
      ...config,
      [key]: value
    });
  };

  return (
    <div className="glass-card bg-white/90 p-5 flex flex-col h-full" id="config_panel">
      {/* Head */}
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
        <Sliders className="w-5 h-5 text-indigo-500" />
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-display">超参数调参台 / Control</h3>
      </div>

      {/* 1. Function selector */}
      <div className="space-y-4 flex-1">
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            1. 选择或构造目标函数 / Function Input
          </label>
          <select
            value={selectedPresetId}
            onChange={(e) => handlePresetSelect(e.target.value)}
            className="w-full text-xs font-semibold text-slate-700 bg-slate-50/85 p-2.5 rounded-lg border border-slate-200 focus:border-indigo-500 focus:outline-hidden transition-colors"
          >
            {FORMULA_PRESETS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
            <option value="custom">✍ 自定义数学解析式 (Custom Latex Evaluator)</option>
          </select>
        </div>

        {selectedPresetId === "custom" && (
          <div className="p-3 bg-indigo-50/40 rounded-lg border border-indigo-100 space-y-2">
            <span className="text-[11px] font-medium text-indigo-700 block">请输入标准数学表达式 (支持 x, y, pi, sin, cos, exp, ^):</span>
            <div className="flex gap-2">
              <input
                type="text"
                value={customFormulaText}
                onChange={(e) => setCustomFormulaText(e.target.value)}
                className="flex-1 text-xs font-mono bg-white p-2 rounded border border-indigo-200 focus:outline-indigo-500 focus:ring-0"
                placeholder="e.g. x^2 + 3*y^2 - 0.2*cos(3*pi*x)"
              />
              <button
                onClick={applyCustomFormula}
                className="px-3 py-1 bg-indigo-600 font-semibold text-xs text-white rounded hover:bg-indigo-700 transition-colors shrink-0"
              >
                应用表达式
              </button>
            </div>
            <span className="text-[10px] text-indigo-500/80 block italic">※ 更改公式后自动通过高阶差分(Central Differencing)计算偏导梯度与 Hessian。</span>
          </div>
        )}

        {/* Mathematical Expression display box */}
        <div className="p-3 bg-slate-50/50 rounded-lg border border-slate-100 flex items-center justify-between">
          <div className="flex-1 overflow-x-auto">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">当前目标函数解析式 / f(x, y):</span>
            <div className="mt-1">
              <MathRenderer math={activePreset.latex} block />
            </div>
          </div>
        </div>

        {/* 2. Optimizers list with parameters */}
        <div>
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            2. 求解核心优化算法 / Optimizers
          </label>
          <div className="grid grid-cols-5 gap-1.5 p-1 bg-slate-100/80 rounded-lg border border-slate-200/40">
            {["sgd", "momentum", "adagrad", "rmsprop", "adam"].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => onOptimizerChange(opt)}
                className={`py-2 text-[10px] font-bold uppercase rounded-md transition-all ${
                  activeOptimizerId === opt
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* 3. Parameter sliders */}
        <div className="space-y-4 pt-2">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            3. 超参数调参控制 / Hyperparameters
          </label>

          {/* LR slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-700 font-semibold flex items-center gap-1">
                学习速率 <span className="text-indigo-600 font-bold">学习率 (Learning Rate / α)</span>
              </span>
              <span className="font-mono font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200 shadow-xs">
                {config.learningRate}
              </span>
            </div>
            <div className="flex gap-3">
              <input
                type="range"
                min="0.0005"
                max="0.3"
                step="0.0005"
                value={config.learningRate}
                onChange={(e) => handleSliderChange("learningRate", Number(e.target.value))}
                className="flex-1 accent-indigo-650 cursor-pointer h-2 bg-gradient-to-r from-blue-100 to-indigo-400 border border-indigo-250 rounded-lg appearance-none shadow-inner"
              />
            </div>
          </div>

          {/* Steps slider */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-700 font-semibold">
                最大迭代步数 <span className="text-emerald-600 font-bold">(Max Epoch Steps)</span>
              </span>
              <span className="font-mono font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 shadow-xs">
                {config.maxSteps}
              </span>
            </div>
            <input
              type="range"
              min="10"
              max="250"
              step="5"
              value={config.maxSteps}
              onChange={(e) => handleSliderChange("maxSteps", Number(e.target.value))}
              className="w-full accent-emerald-600 cursor-pointer h-2 bg-gradient-to-r from-teal-100 to-emerald-400 border border-emerald-250 rounded-lg appearance-none shadow-inner"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Initial X */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-700 font-semibold">
                <span>初始纵坐标 x₀ (Yaw)</span>
                <span className="font-mono font-extrabold text-orange-700 bg-orange-50 px-1.5 py-0.5 rounded-md border border-orange-200 shadow-xs">{config.initialX}</span>
              </div>
              <input
                type="range"
                min={activePreset.rangeX[0]}
                max={activePreset.rangeX[1]}
                step="0.1"
                value={config.initialX}
                onChange={(e) => handleSliderChange("initialX", Number(e.target.value))}
                className="w-full accent-orange-600 cursor-pointer h-2 bg-gradient-to-r from-amber-100 to-orange-400 border border-orange-200 rounded-lg appearance-none shadow-inner"
              />
            </div>

            {/* Initial Y */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-700 font-semibold">
                <span>初始横坐标 y₀ (Pitch)</span>
                <span className="font-mono font-extrabold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-200 shadow-xs">{config.initialY}</span>
              </div>
              <input
                type="range"
                min={activePreset.rangeY[0]}
                max={activePreset.rangeY[1]}
                step="0.1"
                value={config.initialY}
                onChange={(e) => handleSliderChange("initialY", Number(e.target.value))}
                className="w-full accent-rose-600 cursor-pointer h-2 bg-gradient-to-r from-pink-100 to-rose-400 border border-rose-200 rounded-lg appearance-none shadow-inner"
              />
            </div>
          </div>

          {/* Terrain Perturbation slider (地形扰动 / Gaussian Noise) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-700 font-semibold flex items-center gap-1">
                地形扰动 <span className="text-purple-600 font-bold">(Gaussian Noise σ)</span>
              </span>
              <span className={`font-mono font-extrabold px-2 py-0.5 rounded-md border transition-colors shadow-xs ${
                config.noiseLevel > 0 
                  ? "text-purple-700 bg-purple-50 border-purple-200" 
                  : "text-slate-500 bg-slate-50 border-slate-200"
              }`}>
                {config.noiseLevel === 0 ? "纯净地形 (Clean)" : `σ = ${config.noiseLevel.toFixed(3)}`}
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="2.0"
              step="0.05"
              value={config.noiseLevel}
              onChange={(e) => handleSliderChange("noiseLevel", Number(e.target.value))}
              className="w-full accent-purple-600 cursor-pointer h-2 bg-gradient-to-r from-violet-100 via-purple-200 to-fuchsia-300 border border-purple-200 rounded-lg appearance-none shadow-inner"
            />
            <span className="text-[10px] text-slate-500 block leading-normal font-normal">
              叠加拿样高斯噪声扰动梯度与损失评估，模拟非凸测量测量噪声。
            </span>
          </div>

        </div>

        {/* 4. Advanced optimizer settings */}
        <div className="border-t border-slate-100 pt-3">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" />
            {showAdvanced ? "隐藏高级优化器设置 ▲" : "展开高级优化算法系数设置 (Momentum / Adam) ▼"}
          </button>

          {showAdvanced && (
            <div className="grid grid-cols-2 gap-3 mt-3 p-3 bg-slate-50 rounded-lg text-xs space-y-0 border border-slate-100">
              <div>
                <span className="text-slate-500 flex items-center gap-1">动量惯性系数 β₁:</span>
                <input
                  type="number"
                  value={config.beta1}
                  step="0.01"
                  onChange={(e) => handleSliderChange("beta1", Number(e.target.value))}
                  className="w-full mt-1 bg-white p-1.5 rounded border border-slate-200 text-xs font-mono"
                />
              </div>
              <div>
                <span className="text-slate-500">衰减估算系数 β₂:</span>
                <input
                  type="number"
                  value={config.beta2}
                  step="0.001"
                  onChange={(e) => handleSliderChange("beta2", Number(e.target.value))}
                  className="w-full mt-1 bg-white p-1.5 rounded border border-slate-200 text-xs font-mono"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Perform calculation triggers */}
      <div className="mt-5 pt-3 border-t border-slate-100 space-y-2">
        <button
          onClick={() => onTriggerSolve()}
          disabled={isSolving}
          className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-700 font-bold text-white rounded-xl shadow-md disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer text-xs"
          id="btn_run_optimization"
        >
          {isSolving ? (
            <>
              <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin"></div>
              <span>梯度追踪计算中...</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              <span>开始优化任务 (Solve Map)</span>
            </>
          )}
        </button>

        <button
          onClick={handleResetOptimizerClick}
          type="button"
          className="w-full py-2.5 px-4 bg-gradient-to-r from-rose-50 to-amber-50 hover:from-rose-100 hover:to-amber-100 border border-rose-200 active:scale-98 text-rose-700 font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
          id="btn_reset_optimizer"
          title="重置当前优化算法的内部状态缓存（如Adam的一阶/二阶动量缓存），保留所有调参参数"
        >
          <RotateCcw className="w-3.5 h-3.5 animate-spin-hover" />
          <span>重置优化器状态 (Reset Optimizer)</span>
        </button>

        {showResetFeedback && (
          <div className="p-2.5 text-[10px] text-center font-bold text-rose-700 bg-rose-50/80 border border-rose-250 rounded-lg animate-pulse">
            ✨ 当前优化器内部状态(Adam动量缓存等)已深度清零，计算轨迹已重新初始化！
          </div>
        )}
      </div>
    </div>
  );
}
