/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { FormulaPreset, RunResult, OptimizerConfig } from "../types";
import { generateCodeTemplate } from "../utils/mathEngine";
import { Code, Copy, Check, FileCode2 } from "lucide-react";

interface ExporterPanelProps {
  preset: FormulaPreset;
  activeResult: RunResult | null;
  config: OptimizerConfig;
  selectedStepIndex: number;
}

export function ExporterPanel({
  preset,
  activeResult,
  config,
  selectedStepIndex
}: ExporterPanelProps) {
  const [copied, setCopied] = useState(false);
  const [codeHeight, setCodeHeight] = useState(160);

  const activeStepObj = activeResult && activeResult.steps.length > 0
    ? activeResult.steps[Math.min(selectedStepIndex, activeResult.steps.length - 1)]
    : null;

  const codeString = generateCodeTemplate(preset, activeResult?.optimizerId || "adam", config);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="glass-card bg-white/90 p-5 flex flex-col h-full" id="exporter_panel">
      {/* Exporter Head */}
      <div className="flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
        <FileCode2 className="w-5 h-5 text-indigo-500" />
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-display">代码数据导出器 / Exporter</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4.5 flex-1">
        
        {/* Hessian details */}
        <div className="md:col-span-1 bg-slate-50/50 p-4 rounded-xl border border-slate-150 flex flex-col justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">
              当前步 $2 \times 2$ Hessian 矩阵详情:
            </span>
            {activeStepObj ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {/* Visual 2x2 matrix brackets layout */}
                  <span className="text-xl font-thin text-indigo-350 shrink-0 select-none">[</span>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono font-bold text-indigo-900 w-full text-center">
                    <div className="py-1 bg-white border border-slate-200 rounded text-center" title="Hxx">
                      {activeStepObj.hessian[0][0].toFixed(3)}
                    </div>
                    <div className="py-1 bg-white border border-slate-200 rounded text-center" title="Hxy">
                      {activeStepObj.hessian[0][1].toFixed(3)}
                    </div>
                    <div className="py-1 bg-white border border-slate-200 rounded text-center" title="Hyx">
                      {activeStepObj.hessian[0][1].toFixed(3)}
                    </div>
                    <div className="py-1 bg-white border border-slate-200 rounded text-center" title="Hyy">
                      {activeStepObj.hessian[1][1].toFixed(3)}
                    </div>
                  </div>
                  <span className="text-xl font-thin text-indigo-350 shrink-0 select-none">]</span>
                </div>

                <div className="text-[11px] text-slate-500 space-y-1 bg-white border border-slate-150 p-3 rounded-lg leading-relaxed font-normal">
                  <div className="flex justify-between">
                    <span>迹 Trace (Tr):</span>
                    <span className="font-mono text-slate-700 font-semibold">
                      {(activeStepObj.hessian[0][0] + activeStepObj.hessian[1][1]).toFixed(3)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>行列式 Det (H):</span>
                    <span className="font-mono text-slate-700 font-semibold">
                      {(
                        activeStepObj.hessian[0][0] * activeStepObj.hessian[1][1] -
                        activeStepObj.hessian[0][1] * activeStepObj.hessian[0][1]
                      ).toFixed(3)}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-slate-400 text-xs italic py-6 text-center">暂不可用（需计算首轮求导序列）</div>
            )}
          </div>

          <div className="mt-4 pt-3 border-t border-slate-200/60 text-[10px] text-slate-400 leading-normal font-normal italic">
            ※ Hessian 矩阵是二次多元偏导数组成的对称方阵，量化了梯度空间在该处的凹凸陡峭程度。
          </div>
        </div>

        {/* Code representation */}
        <div className="md:col-span-2 flex flex-col bg-slate-900 rounded-xl overflow-hidden text-slate-200 relative">
          <div className="bg-slate-800 px-4 py-2 flex items-center justify-between border-b border-slate-950 shrink-0">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 font-mono">
              <Code className="w-4 h-4 text-emerald-400" />
              gradient_descent_solver.py (PyTorch & Autograd)
            </span>

            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-slate-700 hover:bg-slate-600 rounded text-slate-200 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  已复制
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-350" />
                  复制代码
                </>
              )}
            </button>
          </div>

          <div 
            className="p-4 overflow-auto font-mono text-[10px] leading-relaxed select-all"
            style={{ height: `${codeHeight}px` }}
          >
            <pre className="text-slate-300">{codeString}</pre>
          </div>

          {/* Height slider control at the bottom */}
          <div className="bg-slate-800/80 px-4 py-1.5 flex items-center justify-between border-t border-slate-950 shrink-0 text-[10px] text-slate-400 select-none">
            <span className="flex items-center gap-1 font-semibold text-slate-400 font-mono">📏 代码框高度 (Height):</span>
            <div className="flex items-center gap-2.5">
              <input
                type="range"
                min="100"
                max="400"
                step="10"
                value={codeHeight}
                onChange={(e) => setCodeHeight(Number(e.target.value))}
                className="w-24 accent-indigo-500 h-1 bg-slate-750 rounded-lg cursor-pointer"
              />
              <span className="font-mono text-slate-300 bg-slate-950/80 px-1.5 py-0.5 rounded font-bold">{codeHeight}px</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
