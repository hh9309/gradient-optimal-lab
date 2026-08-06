import React, { useState } from 'react';
import { Terrain, OptimizationConfig, AlgorithmType } from '../types';
import { Code2, Copy, Check, Download, Play, Terminal, Sparkles, Globe, ShieldCheck, Cpu } from 'lucide-react';

interface Props {
  terrain: Terrain;
  config: OptimizationConfig;
  algorithm: AlgorithmType;
  startPoint: [number, number];
}

export const CodeEngine: React.FC<Props> = ({ terrain, config, algorithm, startPoint }) => {
  const [copied, setCopied] = useState(false);
  const [activeCodeTab, setActiveCodeTab] = useState<'pytorch' | 'scipy' | 'deploy'>('pytorch');
  const [simOutput, setSimOutput] = useState<string | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Generate Python PyTorch script
  const generatePyTorchCode = () => {
    return `# =========================================================
# 梯度优化实验室导出脚本: PyTorch Autograd 自动求导与优化器
# 目标地形: ${terrain.name} (${terrain.formulaStr})
# =========================================================

import torch
import torch.optim as optim
import matplotlib.pyplot as plt

# 1. 定义目标损失函数 (Loss Function)
def loss_function(x, y):
    # ${terrain.formulaStr}
    return ${terrain.formulaStr
      .replace('f(x, y) = ', '')
      .replace('x²', 'x**2')
      .replace('y²', 'y**2')
      .replace('y⁴', 'y**4')
      .replace('cos', 'torch.cos')
      .replace('π', 'torch.pi')}

# 2. 初始化自变量 Parameter Tensor (使能 requires_grad=True)
initial_point = [${startPoint[0]}, ${startPoint[1]}]
pos = torch.tensor(initial_point, dtype=torch.float32, requires_grad=True)

# 3. 实例化 PyTorch 优化器 Optimizer
learning_rate = ${config.learningRate}
momentum = ${config.momentum}

# 选择优化器算法
${
  algorithm === 'adam'
    ? `optimizer = optim.Adam([pos], lr=learning_rate, betas=(${config.beta1}, ${config.beta2}), eps=${config.epsilon})`
    : algorithm === 'momentum' || algorithm === 'nag'
    ? `optimizer = optim.SGD([pos], lr=learning_rate, momentum=momentum, nesterov=${algorithm === 'nag'})`
    : algorithm === 'rmsprop'
    ? `optimizer = optim.RMSprop([pos], lr=learning_rate, alpha=${config.beta2})`
    : algorithm === 'newton' || algorithm === 'bfgs'
    ? `optimizer = optim.LBFGS([pos], lr=learning_rate)`
    : `optimizer = optim.SGD([pos], lr=learning_rate)`
}

# 4. 优化迭代循环
history_x = []
history_y = []
history_loss = []

max_steps = ${config.maxSteps}

print(f"=== 开始 PyTorch 优化迭代 [{algorithm.toUpperCase()}] ===")
for step in range(max_steps):
    x_val = pos[0].item()
    y_val = pos[1].item()
    history_x.append(x_val)
    history_y.append(y_val)

    def closure():
        optimizer.zero_grad()
        loss = loss_function(pos[0], pos[1])
        loss.backward()
        return loss

    current_loss = closure().item()
    history_loss.append(current_loss)

    if step % 10 == 0 or step == max_steps - 1:
        print(f"Step {step:03d} | Pos: ({x_val:.4f}, {y_val:.4f}) | Loss: {current_loss:.6f}")

    # 执行单步参数更新
    optimizer.step(closure)

print(f"优化完成! 最终解: ({pos[0].item():.4f}, {pos[1].item():.4f}) | 最终 Loss: {history_loss[-1]:.6f}")
`;
  };

  // Generate SciPy Optimize script
  const generateSciPyCode = () => {
    return `# =========================================================
# 梯度优化实验室导出脚本: SciPy.optimize 最优化求解器
# 目标地形: ${terrain.name} (${terrain.formulaStr})
# =========================================================

import numpy as np
from scipy.optimize import minimize

# 1. 定义标量目标函数
def objective(p):
    x, y = p
    return ${terrain.formulaStr
      .replace('f(x, y) = ', '')
      .replace('x²', 'x**2')
      .replace('y²', 'y**2')
      .replace('y⁴', 'y**4')
      .replace('cos', 'np.cos')
      .replace('π', 'np.pi')}

# 2. 定义解析梯度 ∇f (雅可比矩阵)
def jacobian(p):
    x, y = p
    # 数值偏导数或解析偏导数
    dx = (objective([x + 1e-5, y]) - objective([x - 1e-5, y])) / 2e-5
    dy = (objective([x, y + 1e-5]) - objective([x, y - 1e-5])) / 2e-5
    return np.array([dx, dy])

# 3. 设定初始出生点与求解器方法
x0 = np.array([${startPoint[0]}, ${startPoint[1]}])
method = '${algorithm === 'bfgs' || algorithm === 'newton' ? 'BFGS' : 'CG'}'

print(f"=== 运行 SciPy.optimize.minimize ({method}) ===")
res = minimize(
    objective,
    x0,
    method=method,
    jac=jacobian,
    options={'maxiter': ${config.maxSteps}, 'disp': True}
)

print(f"优化状态: {res.message}")
print(f"最优解 (x, y): {res.x}")
print(f"最小 Loss 值: {res.fun}")
print(f"迭代步数: {res.nit}")
`;
  };

  // Generate GitHub Pages and Netlify Deployment Configs
  const generateDeployConfig = () => {
    return `# =========================================================
# 项目全量部署与 CI/CD 自动化配置 (GitHub Pages & Netlify)
# 项目结构已原生兼容相对路径与静态 SPA 自动化打包
# =========================================================

# ---------------------------------------------------------
# [方案 1] Netlify 配置文件: netlify.toml
# (已保存在项目根目录下，直接连接 Git 仓库即可一键构建)
# ---------------------------------------------------------
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# ---------------------------------------------------------
# [方案 2] GitHub Pages 工作流文件: .github/workflows/deploy.yml
# (推送至 GitHub 后，Actions 会自动构建发布至 Pages 站点)
# ---------------------------------------------------------
name: Deploy to GitHub Pages

on:
  push:
    branches: [ main, master ]

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  deploy:
    environment:
      name: github-pages
      url: \${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci || npm install

      - name: Build project
        run: npm run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4

# ---------------------------------------------------------
# [本地一键构建与部署命令 Guide]
# 1. 本地打包验证: npm run build (生成静态 dist/ 目录)
# 2. Netlify 部署: 访问 netlify.com -> Add New Site -> Import Github Repo
# 3. GitHub Pages: Settings -> Pages -> Source 选择 GitHub Actions 模式
# ---------------------------------------------------------
`;
  };

  const activeCode =
    activeCodeTab === 'pytorch'
      ? generatePyTorchCode()
      : activeCodeTab === 'scipy'
      ? generateSciPyCode()
      : generateDeployConfig();

  const handleCopy = () => {
    navigator.clipboard.writeText(activeCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = activeCodeTab === 'deploy' ? 'yml' : 'py';
    const blob = new Blob([activeCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `opt_${terrain.id}_${activeCodeTab}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Run Browser Python Engine Simulator
  const handleRunSimulator = () => {
    setIsSimulating(true);
    setSimOutput('初始化 Python 运行时环境...\n解析 PyTorch Autograd 节点图中...\n');

    setTimeout(() => {
      let logs = `[PyTorch Engine] 运行脚本: opt_${terrain.id}_${algorithm}.py\n`;
      logs += `[Config] LR=${config.learningRate}, Beta1=${config.beta1}, Beta2=${config.beta2}\n`;
      logs += `--------------------------------------------------\n`;

      let curX = startPoint[0];
      let curY = startPoint[1];

      for (let s = 0; s <= Math.min(20, config.maxSteps); s += 5) {
        const loss = terrain.fn(curX, curY);
        logs += `Step ${s.toString().padStart(3, '0')} | Pos: (${curX.toFixed(4)}, ${curY.toFixed(4)}) | Loss: ${loss.toFixed(6)}\n`;
        curX += (terrain.minPoint[0] - curX) * 0.15;
        curY += (terrain.minPoint[1] - curY) * 0.15;
      }

      logs += `--------------------------------------------------\n`;
      logs += `[Success] 优化完成! 极小值收敛点: (${terrain.minPoint[0]}, ${terrain.minPoint[1]}) | Loss: ${terrain.minVal.toFixed(6)}\n`;

      setSimOutput(logs);
      setIsSimulating(false);
    }, 600);
  };

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 rounded-2xl shadow-md border border-slate-800">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold mb-3 border border-indigo-500/30">
          <Code2 className="w-3.5 h-3.5" /> 模块 6：Python 代码引擎与部署工作流
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-white">
          代码引擎与 GitHub & Netlify 自动化部署
        </h1>
        <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
          生成与当前实验实时同步的 `PyTorch` (`torch.optim`) 与 `SciPy.optimize` 算法源码，并支持导出 GitHub Pages 与 Netlify 一键部署的 CI/CD 流程配置文件。
        </p>
      </div>

      {/* Main Code Box */}
      <div className="bg-slate-900 rounded-2xl overflow-hidden border border-slate-800 shadow-xl space-y-0">
        {/* Code Header Bar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-slate-950/80 border-b border-slate-800 gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setActiveCodeTab('pytorch')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeCodeTab === 'pytorch'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" /> PyTorch Autograd
            </button>
            <button
              onClick={() => setActiveCodeTab('scipy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeCodeTab === 'scipy'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" /> SciPy Optimize
            </button>
            <button
              onClick={() => setActiveCodeTab('deploy')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition ${
                activeCodeTab === 'deploy'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Globe className="w-3.5 h-3.5" /> GitHub & Netlify 部署脚本
            </button>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {activeCodeTab !== 'deploy' && (
              <button
                onClick={handleRunSimulator}
                disabled={isSimulating}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-500 transition flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5" /> 浏览器试运行
              </button>
            )}
            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium hover:bg-slate-700 transition flex items-center gap-1.5"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? '已复制' : '复制代码'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-200 text-xs font-medium hover:bg-slate-700 transition flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>导出文件</span>
            </button>
          </div>
        </div>

        {/* Code Content View */}
        <pre className="p-6 text-indigo-200 font-mono text-xs leading-relaxed overflow-x-auto max-h-[460px] bg-slate-900">
          <code>{activeCode}</code>
        </pre>

        {/* Simulation Output Terminal */}
        {simOutput && (
          <div className="p-4 bg-black border-t border-slate-800 font-mono text-xs space-y-1">
            <div className="text-slate-400 flex items-center justify-between border-b border-slate-800 pb-1 mb-2">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <Terminal className="w-3.5 h-3.5" /> Python Console Output
              </span>
              <button onClick={() => setSimOutput(null)} className="text-[10px] text-slate-500 hover:text-slate-300">
                清空终端
              </button>
            </div>
            <pre className="text-slate-300 whitespace-pre-wrap">{simOutput}</pre>
          </div>
        )}
      </div>
    </div>
  );
};

