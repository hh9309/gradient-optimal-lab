import React from 'react';
import { ActiveTab } from '../types';
import {
  Compass,
  Layers,
  BarChart2,
  BookOpen,
  Code2,
  Bot,
  FileText,
  FileSpreadsheet,
  Calculator,
} from 'lucide-react';

interface Props {
  activeTab: ActiveTab;
  onChangeTab: (tab: ActiveTab) => void;
}

export const Header: React.FC<Props> = ({ activeTab, onChangeTab }) => {
  const TABS: { id: ActiveTab; name: string; icon: React.ReactNode; num: string }[] = [
    { id: 'sandbox', name: '曲面沙盒', icon: <Layers className="w-3.5 h-3.5" />, num: '01' },
    { id: 'function-grad', name: '函数梯度', icon: <Calculator className="w-3.5 h-3.5" />, num: '02' },
    { id: 'essence', name: '几何本质', icon: <Compass className="w-3.5 h-3.5" />, num: '03' },
    { id: 'algorithms', name: '算法拆解', icon: <BarChart2 className="w-3.5 h-3.5" />, num: '04' },
    { id: 'theory', name: '最优化理论', icon: <BookOpen className="w-3.5 h-3.5" />, num: '05' },
    { id: 'code', name: '代码引擎', icon: <Code2 className="w-3.5 h-3.5" />, num: '06' },
    { id: 'ai-diag', name: 'AI 诊断', icon: <Bot className="w-3.5 h-3.5" />, num: '07' },
    { id: 'report', name: '轨迹导出', icon: <FileText className="w-3.5 h-3.5" />, num: '08' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-200/90 shadow-sm shrink-0">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row items-center justify-between py-3 gap-3">
          {/* Logo & App Title */}
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-bold text-xl italic shadow-sm shrink-0 select-none">
              ∇
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-semibold text-slate-900 tracking-tight">
                  梯度优化与最优化理论实验室
                </h1>
                <span className="text-[11px] text-slate-400 font-mono font-normal">v2.5.0</span>
              </div>
              <p className="text-[11px] text-slate-500">
                3D/2D 损失曲面沙盒 • 算法轨迹对比 • 最优化理论 • 代码引擎
              </p>
            </div>
          </div>

          {/* Center/Right Status & Action Bar */}
          <div className="flex items-center gap-2.5 flex-wrap justify-center lg:justify-end">
            <button
              onClick={() => onChangeTab('report')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 border shrink-0 ${
                activeTab === 'report'
                  ? 'bg-indigo-600 text-white border-indigo-600 ring-2 ring-indigo-200'
                  : 'bg-emerald-50/90 text-emerald-700 hover:bg-emerald-100 border-emerald-200'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>导出报告</span>
            </button>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200 max-w-full overflow-x-auto">
              {TABS.map((tab) => {
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => onChangeTab(tab.id)}
                    className={`px-2.5 py-1.5 rounded text-xs font-medium flex items-center gap-1.5 transition-colors shrink-0 ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200/80 font-semibold shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    <span className={isActive ? 'text-indigo-600' : 'text-slate-400'}>
                      {tab.icon}
                    </span>
                    <span>{tab.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

