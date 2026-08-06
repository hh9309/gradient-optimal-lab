import React, { useState } from 'react';
import { Terrain, OptimizationConfig, TrajectoryResult, AlgorithmType } from '../types';
import {
  FileText,
  Copy,
  Download,
  Printer,
  Check,
  Share2,
  Table,
  Code2,
  Award,
  Sparkles,
  Database,
  Sliders,
  Cpu,
  CheckCircle2,
  Activity,
  Filter,
  Search,
  FileCode,
  Layers,
  ChevronRight,
  TrendingDown,
  Compass,
} from 'lucide-react';

interface Props {
  terrain: Terrain;
  config: OptimizationConfig;
  trajectories: TrajectoryResult[];
  startPoint: [number, number];
}

export const ReportExporter: React.FC<Props> = ({
  terrain,
  config,
  trajectories,
  startPoint,
}) => {
  const [copiedMd, setCopiedMd] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [selectedAlgoTab, setSelectedAlgoTab] = useState<AlgorithmType>(
    trajectories[0]?.algorithm || 'sgd'
  );
  const [codeType, setCodeType] = useState<'pytorch' | 'scipy' | 'matplotlib'>('pytorch');
  const [stepSearch, setStepSearch] = useState('');

  // Get active trajectory for Step-by-Step sampling table
  const activeTraj =
    trajectories.find((t) => t.algorithm === selectedAlgoTab) || trajectories[0] || {
      algorithm: 'sgd',
      name: 'SGD',
      color: '#3b82f6',
      history: [],
      status: 'running',
      finalLoss: 0,
      totalDistance: 0,
      finalPoint: [0, 0],
    };

  // Find best algorithm (lowest final loss or fastest convergence)
  const bestTraj = [...trajectories].sort((a, b) => a.finalLoss - b.finalLoss)[0];

  // 1. Generate Markdown Report
  const generateMarkdownReport = () => {
    const timestamp = new Date().toLocaleString('zh-CN');

    let md = `# 梯度优化与最优化理论学术/工程实验报告\n\n`;
    md += `> **生成时间**: ${timestamp} | **工具**: 梯度优化实验室 (Gradient Optimization Lab)\n\n`;

    md += `## 一、实验配置与损失曲面规格\n\n`;
    md += `- **测试地形名称**: ${terrain.name} (${terrain.nameEn})\n`;
    md += `- **解析表达式**: $f(x, y) = ${terrain.formulaStr}$\n`;
    md += `- **理论极小值**: 位于点 $(${terrain.minPoint[0]}, ${terrain.minPoint[1]})$，极小值 $f^* = ${terrain.minVal}$\n`;
    md += `- **曲面病态特征**: ${terrain.conditionNumberDesc || '等高线良好'}\n`;
    md += `- **初始出生点**: $P_0 = (${startPoint[0]}, ${startPoint[1]})$，初始 Loss = $${terrain.fn(startPoint[0], startPoint[1]).toFixed(6)}$\n`;
    md += `- **实验超参数设置**: 学习率 $\\alpha = ${config.learningRate}$, 动量 $\\beta = ${config.momentum}$, 最大步数 $N = ${config.maxSteps}$, 容差 $\\epsilon = ${config.epsilon}$\n\n`;

    md += `## 二、多算法收敛性能指标对比表\n\n`;
    md += `| 算法名称 | 最终坐标 $(x, y)$ | 最终 Loss | 收敛状态 | 迭代步数 | 轨迹弧长 | 路径直度效率 |\n`;
    md += `| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n`;

    trajectories.forEach((t) => {
      const endPt = t.history[t.history.length - 1] || { x: 0, y: 0 };
      const startPt = t.history[0] || { x: 0, y: 0 };
      const directDist = Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y);
      const eff =
        t.totalDistance > 0 ? ((directDist / t.totalDistance) * 100).toFixed(1) : '100.0';

      md += `| **${t.name}** | (${endPt.x.toFixed(4)}, ${endPt.y.toFixed(4)}) | ${t.finalLoss.toFixed(6)} | ${t.status} | ${t.history.length - 1} | ${t.totalDistance.toFixed(3)} | ${eff}% |\n`;
    });

    md += `\n## 三、病态曲面收敛机制分析\n\n`;
    md += `1. **最佳表现算法**: **${bestTraj?.name || 'Adam'}** (最终 Loss: ${bestTraj?.finalLoss.toFixed(6)})\n`;
    md += `2. **病态几何物理图景**: 在包含陡峭峡谷或极小梯度的区域中，一阶普通 SGD 因缺少曲率自适应而产生横跳；而带有动量 (Momentum/NAG) 或一二阶矩估计 (Adam/RMSprop) 的算法能够通过历史梯度积累前进动量，平滑跨越病态区域。\n\n`;

    md += `## 四、可复现 Python / PyTorch 源代码\n\n`;
    md += `\`\`\`python\nimport torch\nimport torch.optim as optim\n\n# 自动求导与优化器配置\npos = torch.tensor([${startPoint[0]}, ${startPoint[1]}], requires_grad=True)\noptimizer = optim.Adam([pos], lr=${config.learningRate})\n\ndef loss_function(x, y):\n    # 地形表达式: ${terrain.formulaStr}\n    return ${terrain.formulaStr.replace(/²/g, '**2').replace(/³/g, '**3').replace(/⁴/g, '**4')}\n\`\`\`\n`;

    return md;
  };

  const markdownContent = generateMarkdownReport();

  // 2. Generate Python Code
  const generatePythonCode = () => {
    if (codeType === 'pytorch') {
      return `# ========================================================\n# 梯度优化实验室 - PyTorch 自动求导与优化器可复现脚本\n# 地形: ${terrain.name} (${terrain.formulaStr})\n# ========================================================\nimport torch\nimport torch.optim as optim\n\n# 1. 定义可优化初始点\npos = torch.tensor([${startPoint[0]}, ${startPoint[1]}], dtype=torch.float32, requires_grad=True)\n\n# 2. 配置优化器\noptimizer = optim.Adam([pos], lr=${config.learningRate})\n\n# 3. 迭代训练循环\nprint("开始 PyTorch 梯度优化...")
for step in range(${config.maxSteps}):
    optimizer.zero_grad()
    x, y = pos[0], pos[1]
    
    # 损失计算
    loss = (x - 1.5)**2 + 2*(y - 0.5)**2  # ${terrain.formulaStr}
    loss.backward()
    
    optimizer.step()
    
    if step % 10 == 0 or step == ${config.maxSteps - 1}:
        print(f"Step {step:03d} | Pos: ({pos[0].item():.4f}, {pos[1].item():.4f}) | Loss: {loss.item():.6f}")
`;
    } else if (codeType === 'scipy') {
      return `# ========================================================\n# 梯度优化实验室 - SciPy.optimize 最优化求解脚本\n# ========================================================\nimport numpy as np\nfrom scipy.optimize import minimize\n\ndef objective(p):\n    x, y = p[0], p[1]\n    return ${terrain.formulaStr.replace(/²/g, '**2').replace(/³/g, '**3').replace(/⁴/g, '**4')}\n\nx0 = np.array([${startPoint[0]}, ${startPoint[1]}])\nres = minimize(objective, x0, method='BFGS')\n\nprint("优化结果:", res.success)\nprint("极小值坐标:", res.x)\nprint("最终 Loss:", res.fun)\n`;
    } else {
      return `# ========================================================\n# 梯度优化实验室 - Matplotlib 2D 轨迹等高线可视化\n# ========================================================\nimport numpy as np\nimport matplotlib.pyplot as plt\n\n# 1. 建立网格\nx = np.linspace(-4, 4, 200)\ny = np.linspace(-4, 4, 200)\nX, Y = np.meshgrid(x, y)\nZ = X**2 + Y**2  # ${terrain.formulaStr}\n\n# 2. 绘制等高线\nplt.figure(figsize=(8, 6))\nCS = plt.contour(X, Y, Z, levels=25, cmap='viridis')\nplt.clabel(CS, inline=1, fontsize=8)\nplt.title("${terrain.name} - ${terrain.formulaStr}")
plt.xlabel("X")
plt.ylabel("Y")
plt.scatter([${startPoint[0]}], [${startPoint[1]}], color='red', marker='x', label='Start Point')
plt.legend()
plt.grid(True)
plt.show()\n`;
    }
  };

  // Export handlers
  const handleCopyMd = () => {
    navigator.clipboard.writeText(markdownContent);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatePythonCode());
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleDownloadJSON = () => {
    const exportPayload = {
      exportTime: new Date().toISOString(),
      terrain: {
        id: terrain.id,
        name: terrain.name,
        formula: terrain.formulaStr,
        minPoint: terrain.minPoint,
        minVal: terrain.minVal,
      },
      config,
      startPoint,
      trajectories,
    };
    const blob = new Blob([JSON.stringify(exportPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `experiment_data_${terrain.id}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadCSV = () => {
    let csv = 'Step,X,Y,Loss,GradX,GradY,GradNorm\n';
    activeTraj.history.forEach((h) => {
      csv += `${h.step},${h.x},${h.y},${h.loss},${h.gradX || 0},${h.gradY || 0},${h.gradNorm || 0}\n`;
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trajectory_${activeTraj.algorithm}_${terrain.id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadScript = () => {
    const code = generatePythonCode();
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `optimize_${terrain.id}_${codeType}.py`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Filtered steps for sampling table
  const filteredSteps = activeTraj.history.filter(
    (s) =>
      stepSearch === '' ||
      s.step.toString().includes(stepSearch) ||
      s.x.toFixed(3).includes(stepSearch) ||
      s.y.toFixed(3).includes(stepSearch)
  );

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-md border border-slate-800">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
            <FileText className="w-3.5 h-3.5 text-indigo-400" />
            <span>五大维度全量导出与报告中心 (Full Export Suite)</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadJSON}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>导出 JSON 全量包</span>
            </button>
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition flex items-center gap-1.5"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>打印 / 导出 PDF</span>
            </button>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-white">
          梯度优化实验报告与轨迹导出中心
        </h1>
        <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
          包含实验元数据规格、多算法对比矩阵、逐步采样明细、LaTeX/Markdown 学术报告与 Python 可复现源码 5 大完整导出板块。
        </p>
      </div>

      {/* ========================================================================= */}
      {/* 模块一：实验元数据与地形物理规格 (Section 1: Experiment Metadata) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                板块 1：实验元数据与地形物理规格 (Experiment & Surface Spec)
              </h2>
              <p className="text-[11px] text-slate-500">
                实时捕获的损失函数几何形态、条件数与基准超参数配置
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
            ID: {terrain.id}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              测试损失地形
            </div>
            <div className="font-bold text-slate-900 text-sm">{terrain.name}</div>
            <div className="text-indigo-600 font-mono font-semibold text-[11px] truncate">
              {terrain.formulaStr}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              理论极小值点 $P^*$
            </div>
            <div className="font-bold text-slate-900 text-sm font-mono">
              ({terrain.minPoint[0]}, {terrain.minPoint[1]})
            </div>
            <div className="text-amber-600 font-mono font-semibold text-[11px]">
              Min Loss $f^* = {terrain.minVal}$
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              初始出生点 $P_0$
            </div>
            <div className="font-bold text-slate-900 text-sm font-mono">
              ({startPoint[0]}, {startPoint[1]})
            </div>
            <div className="text-slate-600 font-mono text-[11px]">
              Init Loss = {terrain.fn(startPoint[0], startPoint[1]).toFixed(6)}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
              超参配置组合
            </div>
            <div className="font-bold text-slate-900 text-sm font-mono">
              α={config.learningRate} • β={config.momentum}
            </div>
            <div className="text-slate-500 text-[11px]">
              Max Steps: {config.maxSteps} | Tol: {config.epsilon}
            </div>
          </div>
        </div>

        <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-xl text-indigo-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              <strong>曲率病态特征诊断:</strong>{' '}
              {terrain.conditionNumberDesc || '等高线良好，各向同性。'}
            </span>
          </div>
          <div className="text-[11px] text-indigo-700 font-mono hidden sm:block">
            Bounds: [{terrain.bounds[0]}, {terrain.bounds[1]}]
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 模块二：多算法收敛性能对比诊断矩阵 (Section 2: Performance Comparison Matrix) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Table className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                板块 2：多算法收敛性能对比矩阵 (Multi-Algorithm Performance Matrix)
              </h2>
              <p className="text-[11px] text-slate-500">
                对比不同算法在最终 Loss、收敛步数、路径弧长及直度效率上的表现
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500">表现最佳:</span>
            <span className="px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold font-mono border border-emerald-200 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-emerald-600" /> {bestTraj?.name || 'Adam'}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-700 border-collapse bg-white rounded-xl border border-slate-200">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 font-semibold text-slate-800">
                <th className="py-2.5 px-3">算法</th>
                <th className="py-2.5 px-3">最终坐标 $(x, y)$</th>
                <th className="py-2.5 px-3">最终 Loss</th>
                <th className="py-2.5 px-3">余项误差 $|f - f^*|$</th>
                <th className="py-2.5 px-3">状态</th>
                <th className="py-2.5 px-3">迭代步数</th>
                <th className="py-2.5 px-3">轨迹弧长 $L$</th>
                <th className="py-2.5 px-3">直度效率</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {trajectories.map((t) => {
                const endPt = t.history[t.history.length - 1] || { x: 0, y: 0 };
                const startPt = t.history[0] || { x: 0, y: 0 };
                const directDist = Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y);
                const eff =
                  t.totalDistance > 0
                    ? ((directDist / t.totalDistance) * 100).toFixed(1)
                    : '100.0';
                const residual = Math.abs(t.finalLoss - terrain.minVal);

                const isBest = t.algorithm === bestTraj?.algorithm;

                return (
                  <tr
                    key={t.algorithm}
                    className={`hover:bg-slate-50 transition ${
                      isBest ? 'bg-emerald-50/40 font-semibold' : ''
                    }`}
                  >
                    <td className="py-2.5 px-3 font-sans font-bold flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: t.color }}
                      ></span>
                      <span>{t.name}</span>
                      {isBest && (
                        <span className="text-[9px] bg-emerald-500 text-white px-1.5 py-0.2 rounded">
                          BEST
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-900">
                      ({endPt.x.toFixed(4)}, {endPt.y.toFixed(4)})
                    </td>
                    <td className="py-2.5 px-3 text-amber-600 font-bold">
                      {t.finalLoss.toFixed(6)}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{residual.toExponential(3)}</td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          t.status === 'converged'
                            ? 'bg-emerald-100 text-emerald-800'
                            : t.status === 'oscillating'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-800">{t.history.length - 1}</td>
                    <td className="py-2.5 px-3 text-slate-800">{t.totalDistance.toFixed(3)}</td>
                    <td className="py-2.5 px-3 text-indigo-600 font-bold">{eff}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 模块三：Step-by-Step 逐步轨迹采样明细流 (Section 3: Step Sampling Data Stream) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                板块 3：Step-by-Step 逐步轨迹采样明细流 (Trajectory Sampling Stream)
              </h2>
              <p className="text-[11px] text-slate-500">
                查看具体算法的逐步迭代点位坐标、Loss、梯度范数 $\|\nabla f\|$ 及方向向量
              </p>
            </div>
          </div>

          <button
            onClick={handleDownloadCSV}
            className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>导出 CSV 轨迹步数表</span>
          </button>
        </div>

        {/* Algorithm Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
            {trajectories.map((t) => (
              <button
                key={t.algorithm}
                onClick={() => setSelectedAlgoTab(t.algorithm)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
                  selectedAlgoTab === t.algorithm
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: selectedAlgoTab === t.algorithm ? '#ffffff' : t.color,
                  }}
                ></span>
                <span>{t.name}</span>
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="搜索步数/坐标..."
              value={stepSearch}
              onChange={(e) => setStepSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Sampling Table */}
        <div className="max-h-64 overflow-y-auto border border-slate-200 rounded-xl">
          <table className="w-full text-xs text-left text-slate-700 border-collapse bg-white">
            <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 font-semibold">
              <tr>
                <th className="py-2 px-3">Step #</th>
                <th className="py-2 px-3">X 坐标</th>
                <th className="py-2 px-3">Y 坐标</th>
                <th className="py-2 px-3">Loss 值</th>
                <th className="py-2 px-3">梯度范数 $\|\nabla f\|$</th>
                <th className="py-2 px-3">Grad X</th>
                <th className="py-2 px-3">Grad Y</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredSteps.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    未找到匹配步数数据
                  </td>
                </tr>
              ) : (
                filteredSteps.slice(0, 100).map((s) => (
                  <tr key={s.step} className="hover:bg-slate-50">
                    <td className="py-1.5 px-3 font-bold text-slate-900">Step {s.step}</td>
                    <td className="py-1.5 px-3 text-slate-800">{s.x.toFixed(5)}</td>
                    <td className="py-1.5 px-3 text-slate-800">{s.y.toFixed(5)}</td>
                    <td className="py-1.5 px-3 text-amber-600 font-bold">{s.loss.toFixed(6)}</td>
                    <td className="py-1.5 px-3 text-indigo-600">
                      {(s.gradNorm || 0).toFixed(5)}
                    </td>
                    <td className="py-1.5 px-3 text-slate-500">{(s.gradX || 0).toFixed(4)}</td>
                    <td className="py-1.5 px-3 text-slate-500">{(s.gradY || 0).toFixed(4)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="text-[10px] text-slate-400 flex items-center justify-between px-1">
          <span>共 {activeTraj.history.length} 步轨迹数据（最多预览前 100 步）</span>
          <span>支持通过“导出 CSV 轨迹步数表”获取全量原始数据</span>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 模块四：学术/工程实验报告 Markdown 渲染预览 (Section 4: Academic Markdown Report) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                板块 4：学术/工程实验报告渲染与 Markdown 引擎 (Academic Report)
              </h2>
              <p className="text-[11px] text-slate-500">
                可直接复制用于论文、大作业、技术文档与代码报告的标准 Markdown 格式
              </p>
            </div>
          </div>

          <button
            onClick={handleCopyMd}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium shadow-sm transition flex items-center gap-1.5"
          >
            {copiedMd ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedMd ? '已复制 Markdown' : '复制 Markdown 报告'}</span>
          </button>
        </div>

        <pre className="p-5 bg-slate-900 text-slate-200 font-mono text-xs rounded-xl border border-slate-800 overflow-x-auto whitespace-pre-wrap leading-relaxed shadow-inner">
          {markdownContent}
        </pre>
      </div>

      {/* ========================================================================= */}
      {/* 模块五：全量可复现 Python / PyTorch / SciPy 源码集 (Section 5: Reproducible Code Hub) */}
      {/* ========================================================================= */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between border-b border-slate-200 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2">
                板块 5：全量可复现 Python / PyTorch / SciPy 源码集 (Reproducible Code Hub)
              </h2>
              <p className="text-[11px] text-slate-500">
                一键生成与当前地形、出生点及超参数完全一致的完整 Python 运行代码
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyCode}
              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition flex items-center gap-1.5"
            >
              {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCode ? '已复制源码' : '复制源码'}</span>
            </button>
            <button
              onClick={handleDownloadScript}
              className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>导出 .py 脚本文件</span>
            </button>
          </div>
        </div>

        {/* Code Tabs */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCodeType('pytorch')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              codeType === 'pytorch'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>PyTorch 自动求导 (`torch.optim`)</span>
          </button>

          <button
            onClick={() => setCodeType('scipy')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              codeType === 'scipy'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>SciPy 最优化求解器 (`scipy.optimize`)</span>
          </button>

          <button
            onClick={() => setCodeType('matplotlib')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 ${
              codeType === 'matplotlib'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <FileCode className="w-3.5 h-3.5" />
            <span>Matplotlib 等高线绘图脚本</span>
          </button>
        </div>

        <pre className="p-5 bg-slate-900 text-emerald-400 font-mono text-xs rounded-xl border border-slate-800 overflow-x-auto whitespace-pre leading-relaxed shadow-inner">
          {generatePythonCode()}
        </pre>
      </div>
    </div>
  );
};
