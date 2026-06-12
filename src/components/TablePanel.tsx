/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { RunResult, OptimizationStep } from "../types";
import { Table, Download, Eye, ArrowRight, Grid, LayoutList } from "lucide-react";

interface TablePanelProps {
  activeResult: RunResult | null;
  selectedStepIndex: number;
  onSelectStep: (index: number) => void;
}

export function TablePanel({ activeResult, selectedStepIndex, onSelectStep }: TablePanelProps) {
  const [page, setPage] = useState(0);
  const rowsPerPage = 10;

  if (!activeResult || activeResult.steps.length === 0) {
    return (
      <div className="glass-card bg-white/90 p-8 flex flex-col items-center justify-center text-center h-full min-h-[300px]">
        <Table className="w-12 h-12 text-slate-300 mb-2" />
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-display mb-1">步进计算透视表 / Calculation Table</h3>
        <p className="text-xs text-slate-400 mt-1 max-w-sm">
          暂无轨迹数据。请在左侧超参数调参台点击“启动优化器”进行第一轮梯度下降演练。
        </p>
      </div>
    );
  }

  const steps = activeResult.steps;
  const numPages = Math.ceil(steps.length / rowsPerPage);
  const visibleSteps = steps.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  // Download simulation of CSV values
  const downloadCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Step,x,y,Loss,Grad_X,Grad_Y,Grad_Norm,Delta_X,Delta_Y,Hxx,Hxy,Hyy,Eigen_1,Eigen_2,Topography\n";
    steps.forEach((s) => {
      const row = [
        s.step,
        s.x.toFixed(3),
        s.y.toFixed(3),
        s.loss.toFixed(3),
        s.gradX.toFixed(3),
        s.gradY.toFixed(3),
        s.gradNorm.toFixed(3),
        s.updateX.toFixed(3),
        s.updateY.toFixed(3),
        s.hessian[0][0].toFixed(3),
        s.hessian[0][1].toFixed(3),
        s.hessian[1][1].toFixed(3),
        s.eigenvalues[0].toFixed(3),
        s.eigenvalues[1].toFixed(3),
        s.topography
      ].join(",");
      csvContent += row + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `optimization_steps_${activeResult.optimizerId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getTopographyBadge = (topo: string) => {
    switch (topo) {
      case "minimum":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-250">局部洼地 (Min)</span>;
      case "maximum":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-250">局部高峰 (Max)</span>;
      case "saddle":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-250">马鞍脊点 (Saddle)</span>;
      case "valley":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-250">狭长峡谷</span>;
      case "flat":
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-slate-500 border border-slate-250">平坦原面</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-gray-50 text-gray-500 border border-gray-250">斜面</span>;
    }
  };

  return (
    <div className="glass-card bg-white/90 p-5 flex flex-col h-full" id="calculation_table_card">
      {/* Head */}
      <div className="flex items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-1.5">
          <LayoutList className="w-5 h-5 text-indigo-500" />
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-display">计算透视表 / Step</h3>
        </div>
        
        <button
          onClick={downloadCSV}
          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-705 bg-slate-50 hover:bg-slate-100/90 rounded-lg transition-all border border-slate-250 cursor-pointer"
        >
          <Download className="w-3.5 h-3.5" />
          导出 CSV
        </button>
      </div>

      <p className="text-xs text-slate-500 mb-3 font-normal leading-relaxed">
        下方列出了 <b>{activeResult.optimizerName}</b> 的单步求导战术分解。
        <span className="text-indigo-600 font-medium"> 点击对应行</span> 
        可在等高线地图中激活红圈红线，同时自动更新泰勒逼近镜和 Hessian 特征谱。
      </p>

      {/* Main Table */}
      <div className="flex-1 overflow-x-auto min-h-[220px]">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="border-b border-slate-100 text-[10px] font-bold uppercase tracking-wider text-slate-400 bg-slate-50/50">
              <th className="py-2.5 px-3">步数 (k)</th>
              <th className="py-2.5 px-3">坐标点 (x, y)</th>
              <th className="py-2.5 px-3 text-right">损失 Loss f(x,y)</th>
              <th className="py-2.5 px-3 text-right">偏导数 px, py</th>
              <th className="py-2.5 px-3 text-right">梯度模长 ||∇f||</th>
              <th className="py-2.5 px-3 text-right">参数增量 (Δx, Δy)</th>
              <th className="py-2.5 px-3">Hessian 特征值 [λ₁, λ₂]</th>
              <th className="py-2.5 px-3 text-center">地形特征</th>
            </tr>
          </thead>
          <tbody className="text-xs font-medium text-slate-700 divide-y divide-slate-50">
            {visibleSteps.map((step) => {
              const isActive = step.step === selectedStepIndex;
              return (
                <tr
                  key={step.step}
                  onClick={() => onSelectStep(step.step)}
                  className={`cursor-pointer transition-colors hover:bg-indigo-50/20 ${
                    isActive ? "bg-indigo-50/60 font-semibold text-indigo-700" : ""
                  }`}
                >
                  <td className="py-2.5 px-3 font-mono text-slate-400 font-bold">{step.step}</td>
                  <td className="py-2.5 px-3 font-mono">
                    ({step.x.toFixed(3)}, {step.y.toFixed(3)})
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-emerald-600">
                    {step.loss.toFixed(3)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-500">
                    {step.gradX.toFixed(3)}, {step.gradY.toFixed(3)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-amber-600 font-bold">
                    {step.gradNorm.toFixed(3)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-indigo-500 text-[11px]">
                    ({step.updateX.toFixed(3)}, {step.updateY.toFixed(3)})
                  </td>
                  <td className="py-2.5 px-3 font-mono text-slate-500 text-[11px]">
                    [{step.eigenvalues[0].toFixed(3)}, {step.eigenvalues[1].toFixed(3)}]
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    {getTopographyBadge(step.topography)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination component */}
      {numPages > 1 && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
          <span className="text-slate-500 font-medium">
            显示第 {page * rowsPerPage + 1} 到 {Math.min(steps.length, (page + 1) * rowsPerPage)} 条 (共 {steps.length} 步)
          </span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(Math.max(0, page - 1))}
              disabled={page === 0}
              className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded hover:bg-slate-200 disabled:opacity-40 font-semibold transition-colors disabled:cursor-not-allowed"
            >
              上一页
            </button>
            <div className="flex items-center px-2 font-semibold text-slate-800">
              {page + 1} / {numPages}
            </div>
            <button
              onClick={() => setPage(Math.min(numPages - 1, page + 1))}
              disabled={page === numPages - 1}
              className="px-2.5 py-1 bg-slate-100 border border-slate-200 text-slate-700 rounded hover:bg-slate-200 disabled:opacity-40 font-semibold transition-colors disabled:cursor-not-allowed"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
