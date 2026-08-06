import React, { useState } from 'react';
import { TrajectoryResult, Terrain } from '../types';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Cpu, Zap, Activity, BarChart2, CheckCircle, ArrowUpRight } from 'lucide-react';

interface Props {
  trajectories: TrajectoryResult[];
  terrain: Terrain;
}

export const AlgorithmEvolution: React.FC<Props> = ({ trajectories, terrain }) => {
  const [useLogScale, setUseLogScale] = useState(true);

  // Prepare Recharts loss vs step data
  const maxSteps = Math.max(0, ...trajectories.map((t) => t.history.length));
  const chartData = [];

  for (let step = 0; step < maxSteps; step++) {
    const point: any = { step };
    trajectories.forEach((t) => {
      const record = t.history[step] || t.history[t.history.length - 1];
      if (record) {
        // Prevent log scale <= 0 issues
        const lossVal = Math.max(1e-8, record.loss);
        point[t.algorithm] = useLogScale ? Math.log10(lossVal) : lossVal;
      }
    });
    chartData.push(point);
  }

  // Algorithm Mathematical Formulas Cards
  const ALGO_DOCS = [
    {
      id: 'sgd',
      name: 'SGD (标准随机梯度下降)',
      formula: '\\mathbf{x}_{k+1} = \\mathbf{x}_k - \\alpha \\nabla f(\\mathbf{x}_k)',
      desc: '最基础的一阶最优化算法，更新方向纯粹依赖当前梯度。在椭圆狭长谷地形中，y 轴陡峭分量会导致步长在两侧悬崖间剧烈震荡横跳。',
      pros: '计算量极小 $O(d)$，无历史状态存储',
      cons: '易陷于病态狭谷震荡、鞍点停滞',
    },
    {
      id: 'momentum',
      name: 'Momentum (Polyak 动量法)',
      formula: '\\mathbf{v}_{k+1} = \\beta \\mathbf{v}_k + \\alpha \\nabla f(\\mathbf{x}_k), \\quad \\mathbf{x}_{k+1} = \\mathbf{x}_k - \\mathbf{v}_{k+1}',
      desc: '引入物理学的动量惯性。谷壁来回横跳的正负梯度互相抵消，而沿谷底前进的方向梯度累积叠加，从而大幅抑制震荡加速推进。',
      pros: '极大加快平坦谷底冲刺，抵消交替震荡',
      cons: '在谷底极小值附近容易过冲 (Overshoot)',
    },
    {
      id: 'nag',
      name: 'NAG (Nesterov 加速梯度)',
      formula: '\\mathbf{v}_{k+1} = \\beta \\mathbf{v}_k + \\alpha \\nabla f(\\mathbf{x}_k - \\beta \\mathbf{v}_k)',
      desc: '具有“前瞻视角”的动量算法。先按照惯性移动到预判点，再计算该点的梯度。在冲向山谷底部前能提前刹车。',
      pros: '具备前瞻减速能力，大幅降低过冲震荡',
      cons: '实现相对复杂，超参数敏感',
    },
    {
      id: 'rmsprop',
      name: 'RMSProp (均方根自适应学习率)',
      formula: 's_k = \\beta_2 s_{k-1} + (1-\\beta_2)g_k^2, \\quad \\mathbf{x}_{k+1} = \\mathbf{x}_k - \\frac{\\alpha}{\\sqrt{s_k}+\\epsilon} g_k',
      desc: '通过计算梯度的指数加权移动平均平方 (2 阶矩)，按历史梯度陡峭程度自适应调整各维度步长，解决 AdaGrad 学习率早衰过快问题。',
      pros: '完美应对非平稳目标与病态地形',
      cons: '无一阶动量惯性，可能依赖初始 α',
    },
    {
      id: 'adam',
      name: 'Adam (自适应矩估计)',
      formula: 'm_k = \\beta_1 m_{k-1} + (1-\\beta_1)g_k, \\quad s_k = \\beta_2 s_{k-1} + (1-\\beta_2)g_k^2',
      desc: '结合 1 阶矩 (动量) 与 2 阶矩 (RMSProp 自适应步长)，并加入偏差修正 (Bias Correction)。为每个参数自动调整个性化学习率。',
      pros: '深度学习默认首选，对梯度稀疏与尺度不敏感',
      cons: '后期可能因 2 阶矩累积导致学习率衰减过快',
    },
    {
      id: 'newton',
      name: 'Newton / BFGS (二阶拟牛顿法)',
      formula: '\\mathbf{x}_{k+1} = \\mathbf{x}_k - \\mathbf{H}^{-1} \\nabla f(\\mathbf{x}_k)',
      desc: '利用 Hessian 矩阵的二阶偏导数二次逼近曲面。在凸二次曲面上可实现一击即中二次收敛。BFGS 用梯度差值近似 H⁻¹。',
      pros: '二次局部收敛极快，彻底免疫狭谷震荡',
      cons: '计算与存储 H⁻¹ 需 O(d²) ~ O(d³) 复杂度',
    },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-2xl shadow-md border border-slate-800">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3 border border-indigo-500/30">
          <Cpu className="w-3.5 h-3.5" /> 模块 4：算法演进与收敛拆解
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-white">
          一阶与二阶最优化算法全景演进
        </h1>
        <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
          从简单的梯度下降 (SGD) 到动量惯性 (Momentum)，自适应矩估计 (Adam) 再到牛顿二阶曲率法 (BFGS)。剖析数学公式与收敛曲线轨迹。
        </p>
      </div>

      {/* Recharts Convergence Loss Curves Chart */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-200 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <BarChart2 className="w-4 h-4 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-800">
              Loss 损失函数下降收敛曲线 (Loss vs Step)
            </h2>
          </div>
          <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-lg text-xs">
            <span className="text-slate-600 pl-2">纵轴:</span>
            <button
              onClick={() => setUseLogScale(true)}
              className={`px-2.5 py-1 rounded font-medium transition ${
                useLogScale ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              log₁₀(Loss) 对数
            </button>
            <button
              onClick={() => setUseLogScale(false)}
              className={`px-2.5 py-1 rounded font-medium transition ${
                !useLogScale ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              线性 Loss
            </button>
          </div>
        </div>

        <div className="w-full h-80 pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="step" stroke="#64748b" fontSize={11} label={{ value: '迭代步数 (Steps)', position: 'insideBottom', offset: -5 }} />
              <YAxis stroke="#64748b" fontSize={11} label={{ value: useLogScale ? 'log10(Loss)' : 'Loss', angle: -90, position: 'insideLeft' }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                itemStyle={{ color: '#38bdf8' }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
              {trajectories.map((t) => (
                <Line
                  key={t.algorithm}
                  type="monotone"
                  dataKey={t.algorithm}
                  name={t.name}
                  stroke={t.color}
                  strokeWidth={2.2}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trajectory Performance Metrics Comparison Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <Activity className="w-4 h-4 text-emerald-600" />
          <h2 className="text-base font-bold text-slate-800">
            算法收敛与轨迹效率综合量化对比表 (Quantitative Comparison)
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left text-slate-700 border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200 text-slate-800 font-semibold">
                <th className="py-2.5 px-3">算法名称</th>
                <th className="py-2.5 px-3">最终 Loss 值</th>
                <th className="py-2.5 px-3">总行走路径 (Path Length)</th>
                <th className="py-2.5 px-3">直线/路径效率比</th>
                <th className="py-2.5 px-3">收敛步数 (Converged Step)</th>
                <th className="py-2.5 px-3">评价指标</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-mono">
              {trajectories.map((t) => {
                const startPt = t.history[0];
                const endPt = t.history[t.history.length - 1];
                const directDist = Math.hypot(endPt.x - startPt.x, endPt.y - startPt.y);
                const efficiency = t.totalDistance > 0 ? (directDist / t.totalDistance) * 100 : 100;

                return (
                  <tr key={t.algorithm} className="hover:bg-slate-50">
                    <td className="py-2.5 px-3 font-sans font-bold flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: t.color }} />
                      <span>{t.name}</span>
                    </td>
                    <td className="py-2.5 px-3 font-bold text-amber-600">
                      {t.finalLoss.toFixed(6)}
                    </td>
                    <td className="py-2.5 px-3">{t.totalDistance.toFixed(3)}</td>
                    <td className="py-2.5 px-3 font-bold text-indigo-600">
                      {efficiency.toFixed(1)}%
                    </td>
                    <td className="py-2.5 px-3 text-slate-700">
                      {t.convergedStep ? `Step ${t.convergedStep}` : `>${t.history.length - 1}`}
                    </td>
                    <td className="py-2.5 px-3 font-sans">
                      {efficiency > 80 ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          直线平滑高效
                        </span>
                      ) : efficiency > 40 ? (
                        <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          温和波浪交替
                        </span>
                      ) : (
                        <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          陡壁剧烈横跳
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slice Cards for Algorithm Formulas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {ALGO_DOCS.map((doc) => (
          <div
            key={doc.id}
            className="bg-white rounded-xl p-5 border border-slate-200/90 shadow-sm hover:border-indigo-300 transition space-y-3 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-800">{doc.name}</span>
                <Zap className="w-4 h-4 text-amber-500" />
              </div>
              <div className="p-2.5 bg-slate-900 text-indigo-300 font-mono text-[11px] rounded-lg border border-slate-800 overflow-x-auto">
                {doc.formula}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed pt-1">{doc.desc}</p>
            </div>

            <div className="pt-2 border-t border-slate-100 text-[11px] space-y-1">
              <div className="text-emerald-600 flex items-center gap-1 font-medium">
                <CheckCircle className="w-3 h-3 shrink-0" />
                <span>优点: {doc.pros}</span>
              </div>
              <div className="text-slate-500 flex items-center gap-1">
                <ArrowUpRight className="w-3 h-3 shrink-0 text-slate-400" />
                <span>局限: {doc.cons}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
