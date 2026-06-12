/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FormulaPreset, OptimizationStep, RunResult, OptimizerConfig } from "../types";

// Compute eigenvalues for a symmetric 2x2 matrix: [[a, b], [b, d]]
export function computeEigenvalues(a: number, b: number, d: number): [number, number] {
  const tr = a + d;
  const det = a * d - b * b;
  const discriminant = tr * tr - 4 * det;
  const sqrtDisc = Math.sqrt(Math.max(0, discriminant));
  const l1 = (tr + sqrtDisc) / 2;
  const l2 = (tr - sqrtDisc) / 2;
  return [Math.max(l1, l2), Math.min(l1, l2)];
}

export function getTopography(l1: number, l2: number): "minimum" | "maximum" | "saddle" | "valley" | "flat" | "normal" {
  const eps = 1e-4;
  if (l1 > eps && l2 > eps) return "minimum";
  if (l1 < -eps && l2 < -eps) return "maximum";
  if (l1 * l2 < -eps) return "saddle";
  if (Math.abs(l1) < eps && Math.abs(l2) < eps) return "flat";
  if ((l1 > eps && Math.abs(l2) < eps) || (Math.abs(l1) < eps && l2 > eps)) return "valley";
  return "normal";
}

// 2D Contour generation grid helper
export interface GridData {
  x: number[];
  y: number[];
  z: number[][];
}

export const FORMULA_PRESETS: FormulaPreset[] = [
  {
    id: "bowl",
    name: "二次凸双曲碗面 (Bowl Paraboloid)",
    latex: "f(x, y) = x^2 + 2y^2",
    expression: "x² + 2y²",
    rangeX: [-4, 4],
    rangeY: [-4, 4],
    f: (x, y) => x * x + 2 * y * y,
    grad: (x, y) => [2 * x, 4 * y],
    hessian: () => [
      [2, 0],
      [0, 4]
    ],
    globalMinima: [[0, 0]]
  },
  {
    id: "rosenbrock",
    name: "罗森布罗克香蕉函数 (Rosenbrock Valley)",
    latex: "f(x, y) = (1-x)^2 + 100(y-x^2)^2",
    expression: "(1 - x)² + 100 * (y - x²)²",
    rangeX: [-2, 2],
    rangeY: [-1, 3],
    f: (x, y) => Math.pow(1 - x, 2) + 100 * Math.pow(y - x * x, 2),
    grad: (x, y) => [
      -2 * (1 - x) - 400 * x * (y - x * x),
      200 * (y - x * x)
    ],
    hessian: (x, y) => [
      [2 - 400 * y + 1200 * x * x, -400 * x],
      [-400 * x, 200]
    ],
    globalMinima: [[1, 1]]
  },
  {
    id: "saddle",
    name: "经典猴鞍面 (Saddle Point Terrain)",
    latex: "f(x, y) = x^2 - y^2",
    expression: "x² - y²",
    rangeX: [-3, 3],
    rangeY: [-3, 3],
    f: (x, y) => x * x - y * y,
    grad: (x, y) => [2 * x, -2 * y],
    hessian: () => [
      [2, 0],
      [0, -2]
    ],
    globalMinima: [] // Has a saddle point at (0,0)
  },
  {
    id: "booth",
    name: "布斯双曲盘 (Booth's Ellipsoid)",
    latex: "f(x, y) = (x+2y-7)^2 + (2x+y-5)^2",
    expression: "(x + 2y - 7)² + (2x + y - 5)²",
    rangeX: [-10, 10],
    rangeY: [-10, 10],
    f: (x, y) => Math.pow(x + 2 * y - 7, 2) + Math.pow(2 * x + y - 5, 2),
    grad: (x, y) => [
      10 * x + 8 * y - 34,
      8 * x + 10 * y - 38
    ],
    hessian: () => [
      [10, 8],
      [8, 10]
    ],
    globalMinima: [[1, 3]]
  },
  {
    id: "himmelblau",
    name: "希梅尔布劳四谷洞穴 (Himmelblau's Multimodal)",
    latex: "f(x, y) = (x^2+y-11)^2 + (x+y^2-7)^2",
    expression: "(x² + y - 11)² + (x + y² - 7)²",
    rangeX: [-6, 6],
    rangeY: [-6, 6],
    f: (x, y) => Math.pow(x * x + y - 11, 2) + Math.pow(x + y * y - 7, 2),
    grad: (x, y) => [
      4 * x * (x * x + y - 11) + 2 * (x + y * y - 7),
      2 * (x * x + y - 11) + 4 * y * (x + y * y - 7)
    ],
    hessian: (x, y) => [
      [12 * x * x + 4 * y - 42, 4 * x + 4 * y],
      [4 * x + 4 * y, 4 * x + 12 * y * y - 26]
    ],
    globalMinima: [
      [3.0, 2.0],
      [-2.805118, 3.131312],
      [-3.779310, -3.283186],
      [3.584428, -1.848126]
    ]
  },
  {
    id: "rastrigin",
    name: "拉斯特里金强起伏矿场 (Rastrigin Highly Local-Minima)",
    latex: "f(x, y) = 20 + x^2 - 10\\cos(2\\pi x) + y^2 - 10\\cos(2\\pi y)",
    expression: "20 + x² - 10*cos(2πx) + y² - 10*cos(2πy)",
    rangeX: [-5.12, 5.12],
    rangeY: [-5.12, 5.12],
    f: (x, y) => 20 + x * x - 10 * Math.cos(2 * Math.PI * x) + y * y - 10 * Math.cos(2 * Math.PI * y),
    grad: (x, y) => [
      2 * x + 20 * Math.PI * Math.sin(2 * Math.PI * x),
      2 * y + 20 * Math.PI * Math.sin(2 * Math.PI * y)
    ],
    hessian: (x, y) => {
      const hxx = 2 + 40 * Math.pow(Math.PI, 2) * Math.cos(2 * Math.PI * x);
      const hyy = 2 + 40 * Math.pow(Math.PI, 2) * Math.cos(2 * Math.PI * y);
      return [
        [hxx, 0],
        [0, hyy]
      ];
    },
    globalMinima: [[0, 0]]
  },
  {
    id: "ackley",
    name: "艾克里全局多谷盆地 (Ackley Complex Ridges)",
    latex: "f(x, y) = -20\\exp\\left(-0.2\\sqrt{0.5(x^2+y^2)}\\right) - \\exp\\left(0.5(\\cos(2\\pi x)+\\cos(2\\pi y))\\right) + 20 + e",
    expression: "-20*exp(-0.2*sqrt(0.5*(x²+y²))) - exp(0.5*(cos(2πx)+cos(2πy))) + 20 + e",
    rangeX: [-5, 5],
    rangeY: [-5, 5],
    f: (x, y) => {
      const term1 = -20 * Math.exp(-0.2 * Math.sqrt(0.5 * (x * x + y * y)));
      const term2 = -Math.exp(0.5 * (Math.cos(2 * Math.PI * x) + Math.cos(2 * Math.PI * y)));
      return term1 + term2 + 20 + Math.E;
    },
    grad: (x, y) => {
      const r = Math.sqrt(0.5 * (x * x + y * y));
      const g1 = r === 0 ? 0 : (2 * x * Math.exp(-0.2 * r)) / r;
      const sumCos = 0.5 * (Math.cos(2 * Math.PI * x) + Math.cos(2 * Math.PI * y));
      const g2 = Math.PI * Math.sin(2 * Math.PI * x) * Math.exp(sumCos);
      const dfdx = g1 + g2;

      const g3 = r === 0 ? 0 : (2 * y * Math.exp(-0.2 * r)) / r;
      const g4 = Math.PI * Math.sin(2 * Math.PI * y) * Math.exp(sumCos);
      const dfdy = g3 + g4;

      return [dfdx, dfdy];
    },
    hessian: (x, y) => {
      const h = 1e-4;
      const f = (tx: number, ty: number) => {
        const term1 = -20 * Math.exp(-0.2 * Math.sqrt(0.5 * (tx * tx + ty * ty)));
        const term2 = -Math.exp(0.5 * (Math.cos(2 * Math.PI * tx) + Math.cos(2 * Math.PI * ty)));
        return term1 + term2 + 20 + Math.E;
      };
      const f0 = f(x, y);
      const f_xx = (f(x + h, y) - 2 * f0 + f(x - h, y)) / (h * h);
      const f_yy = (f(x, y + h) - 2 * f0 + f(x, y - h)) / (h * h);
      const f_xy = (f(x + h, y + h) - f(x + h, y - h) - f(x - h, y + h) + f(x - h, y - h)) / (4 * h * h);
      return [
        [f_xx, f_xy],
        [f_xy, f_yy]
      ];
    },
    globalMinima: [[0, 0]]
  },
  {
    id: "beale",
    name: "比尔非凸阶梯脊线 (Beale Non-Convex Plateaus)",
    latex: "f(x,y) = (1.5-x+xy)^2 + (2.25-x+xy^2)^2 + (2.625-x+xy^3)^2",
    expression: "(1.5 - x + x*y)² + (2.25 - x + x*y²)² + (2.625 - x + x*y³)²",
    rangeX: [-4.5, 4.5],
    rangeY: [-4.5, 4.5],
    f: (x, y) => {
      const t1 = 1.5 - x + x * y;
      const t2 = 2.25 - x + x * y * y;
      const t3 = 2.625 - x + x * Math.pow(y, 3);
      return t1 * t1 + t2 * t2 + t3 * t3;
    },
    grad: (x, y) => {
      const t1 = 1.5 - x + x * y;
      const t2 = 2.25 - x + x * y * y;
      const t3 = 2.625 - x + x * Math.pow(y, 3);
      
      const dfdx = 2 * t1 * (y - 1) + 2 * t2 * (y * y - 1) + 2 * t3 * (Math.pow(y, 3) - 1);
      const dfdy = 2 * t1 * x + 2 * t2 * (2 * x * y) + 2 * t3 * (3 * x * y * y);
      return [dfdx, dfdy];
    },
    hessian: (x, y) => {
      const h = 1e-4;
      const f = (tx: number, ty: number) => {
        const t1 = 1.5 - tx + tx * ty;
        const t2 = 2.25 - tx + tx * ty * ty;
        const t3 = 2.625 - tx + tx * Math.pow(ty, 3);
        return t1 * t1 + t2 * t2 + t3 * t3;
      };
      const f0 = f(x, y);
      const f_xx = (f(x + h, y) - 2 * f0 + f(x - h, y)) / (h * h);
      const f_yy = (f(x, y + h) - 2 * f0 + f(x, y - h)) / (h * h);
      const f_xy = (f(x + h, y + h) - f(x + h, y - h) - f(x - h, y + h) + f(x - h, y - h)) / (4 * h * h);
      return [
        [f_xx, f_xy],
        [f_xy, f_yy]
      ];
    },
    globalMinima: [[3, 0.5]]
  }
];

// Parser helper for customizable formulas: fall back to numerical derivatives
export function parseCustomFormula(formulaText: string): FormulaPreset {
  // Simple custom parser. If parser errors, fallback standard paraboloid $x^2 + y^2$
  let cleanText = formulaText.toLowerCase().replace(/ \s/g, "");
  
  // Create a function evaluator.
  // Translate human math notations to JS Math functions
  const safeEval = (x: number, y: number): number => {
    try {
      let expr = cleanText
        .replace(/π/g, "Math.PI")
        .replace(/pi/g, "Math.PI")
        .replace(/sin/g, "Math.sin")
        .replace(/cos/g, "Math.cos")
        .replace(/tan/g, "Math.tan")
        .replace(/exp/g, "Math.exp")
        .replace(/log/g, "Math.log")
        .replace(/pow/g, "Math.pow")
        .replace(/sqrt/g, "Math.sqrt")
        .replace(/abs/g, "Math.abs")
        // exponential symbols
        .replace(/\^/g, "**");

      // Check sandbox security: only alphanumeric, operators, and Math calls
      if (/[^\d.xXyY+\-*/%()[\]\s,]/g.test(expr.replace(/Math\.[a-zA-Z]+/g, ""))) {
        throw new Error("Invalid characters");
      }

      // Convert variables
      const xValStr = `(${x})`;
      const yValStr = `(${y})`;
      // Safe boundary parse
      const finalExpr = expr
        .replace(/\bx\b/g, xValStr)
        .replace(/\by\b/g, yValStr)
        .replace(/\bX\b/g, xValStr)
        .replace(/\bY\b/g, yValStr);

      // Simple Function construction
      const evalFunc = new Function(`return ${finalExpr}`);
      const val = evalFunc();
      return isNaN(val) || !isFinite(val) ? 0 : val;
    } catch {
      // Default to quadratic paraboloid x^2 + y^2
      return x * x + y * y;
    }
  };

  // Numerical Gradient via Central Difference
  const gradEval = (x: number, y: number): [number, number] => {
    const h = 1e-5;
    const fxPlus = safeEval(x + h, y);
    const fxMinus = safeEval(x - h, y);
    const fyPlus = safeEval(x, y + h);
    const fyMinus = safeEval(x, y - h);
    return [
      (fxPlus - fxMinus) / (2 * h),
      (fyPlus - fyMinus) / (2 * h)
    ];
  };

  // Numerical Hessian Elements
  const hessianEval = (x: number, y: number): [[number, number], [number, number]] => {
    const h = 1e-4;
    const f0 = safeEval(x, y);
    const f_xx = (safeEval(x + h, y) - 2 * f0 + safeEval(x - h, y)) / (h * h);
    const f_yy = (safeEval(x, y + h) - 2 * f0 + safeEval(x, y - h)) / (h * h);
    
    // Mixed partial: d2f / dxdy
    const f_xy = (safeEval(x + h, y + h) - safeEval(x + h, y - h) - safeEval(x - h, y + h) + safeEval(x - h, y - h)) / (4 * h * h);
    
    return [
      [f_xx, f_xy],
      [f_xy, f_yy]
    ];
  };

  return {
    id: "custom",
    name: `自定义: f(x,y) = ${formulaText}`,
    latex: `f(x, y) = ${formulaText}`,
    expression: formulaText,
    rangeX: [-4, 4],
    rangeY: [-4, 4],
    f: safeEval,
    grad: gradEval,
    hessian: hessianEval
  };
}

// Main Runner for Single Optimization Engine
export function runOptimization(
  preset: FormulaPreset,
  optimizerType: "sgd" | "momentum" | "adagrad" | "rmsprop" | "adam",
  config: OptimizerConfig
): RunResult {
  const steps: OptimizationStep[] = [];
  const maxSteps = config.maxSteps;
  const alpha = config.learningRate;
  
  let x = config.initialX;
  let y = config.initialY;

  // Track state for momentum / adam
  let v_x = 0;
  let v_y = 0;
  let s_x = 0;
  let s_y = 0;
  let m_x = 0;
  let m_y = 0;

  let success = false;
  let diverged = false;
  let stuck = false;
  let statusMessage = "达到最大迭代步数";

  // Seeded LCG PRNG helper to keep the optimization paths stable across 3D drag rotations
  let noiseSeed = 12345;
  const randNum = () => {
    noiseSeed = (noiseSeed * 1664525 + 1013904223) % 4294967296;
    return noiseSeed / 4294967296;
  };

  const getGaussianNoise = (stdDev: number): number => {
    if (stdDev <= 0) return 0;
    let u = 0, v = 0;
    while (u === 0) u = randNum();
    while (v === 0) v = randNum();
    return stdDev * Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  };

  for (let k = 0; k <= maxSteps; k++) {
    let loss = preset.f(x, y);
    if (config.noiseLevel && config.noiseLevel > 0) {
      loss += getGaussianNoise(config.noiseLevel * 0.15);
    }

    // Stop if NaN or infinity
    if (isNaN(loss) || !isFinite(loss) || isNaN(x) || !isFinite(x) || isNaN(y) || !isFinite(y)) {
      diverged = true;
      statusMessage = "梯度爆炸或数值发散 (Diverged/NaN)";
      break;
    }

    let [gx, gy] = preset.grad(x, y);
    if (config.noiseLevel && config.noiseLevel > 0) {
      gx += getGaussianNoise(config.noiseLevel * 0.40);
      gy += getGaussianNoise(config.noiseLevel * 0.40);
    }
    const gNorm = Math.sqrt(gx * gx + gy * gy);

    // Compute Hessian details
    const H = preset.hessian(x, y);
    const hxx = H[0][0];
    const hxy = H[0][1];
    const hyy = H[1][1];
    const [l1, l2] = computeEigenvalues(hxx, hxy, hyy);
    const topo = getTopography(l1, l2);

    // If gradient is extremely small, we successfully converged!
    if (gNorm < 1e-5 && k > 0) {
      success = true;
      statusMessage = `成功收敛到极值点 (梯度模长 < 10⁻⁵)`;
      steps.push({
        step: k,
        x,
        y,
        loss,
        gradX: gx,
        gradY: gy,
        gradNorm: gNorm,
        updateX: 0,
        updateY: 0,
        hessian: H,
        eigenvalues: [l1, l2],
        topography: topo
      });
      break;
    }

    // Check if we are stuck on a saddle point or plateau
    if (gNorm < 1e-3 && topo === "saddle" && k > 2) {
      stuck = true;
      statusMessage = "受困于鞍点 (Saddle Point Detained)";
    }

    // Determine the update steps based on selected Optimizer
    let dx = 0;
    let dy = 0;

    switch (optimizerType) {
      case "sgd":
        dx = -alpha * gx;
        dy = -alpha * gy;
        break;

      case "momentum": {
        const beta = config.beta1 || 0.9;
        v_x = beta * v_x + gx;
        v_y = beta * v_y + gy;
        dx = -alpha * v_x;
        dy = -alpha * v_y;
        break;
      }

      case "adagrad": {
        s_x += gx * gx;
        s_y += gy * gy;
        const eps = config.epsilon || 1e-8;
        dx = - (alpha / (Math.sqrt(s_x) + eps)) * gx;
        dy = - (alpha / (Math.sqrt(s_y) + eps)) * gy;
        break;
      }

      case "rmsprop": {
        const beta = config.beta2 || 0.99;
        s_x = beta * s_x + (1 - beta) * gx * gx;
        s_y = beta * s_y + (1 - beta) * gy * gy;
        const eps = config.epsilon || 1e-8;
        dx = - (alpha / (Math.sqrt(s_x) + eps)) * gx;
        dy = - (alpha / (Math.sqrt(s_y) + eps)) * gy;
        break;
      }

      case "adam": {
        const b1 = config.beta1 || 0.9;
        const b2 = config.beta2 || 0.999;
        const eps = config.epsilon || 1e-8;
        const t = k + 1;

        m_x = b1 * m_x + (1 - b1) * gx;
        m_y = b1 * m_y + (1 - b1) * gy;

        v_x = b2 * v_x + (1 - b2) * gx * gx;
        v_y = b2 * v_y + (1 - b2) * gy * gy;

        // Bias correction
        const mHat_x = m_x / (1 - Math.pow(b1, t));
        const mHat_y = m_y / (1 - Math.pow(b1, t));
        const vHat_x = v_x / (1 - Math.pow(b2, t));
        const vHat_y = v_y / (1 - Math.pow(b2, t));

        dx = - (alpha / (Math.sqrt(vHat_x) + eps)) * mHat_x;
        dy = - (alpha / (Math.sqrt(vHat_y) + eps)) * mHat_y;
        break;
      }
    }

    // Push state
    steps.push({
      step: k,
      x,
      y,
      loss,
      gradX: gx,
      gradY: gy,
      gradNorm: gNorm,
      updateX: dx,
      updateY: dy,
      hessian: H,
      eigenvalues: [l1, l2],
      topography: topo
    });

    // Apply updates
    x += dx;
    y += dy;

    // Boundary capping to prevent wild infinite loops
    if (Math.abs(x) > 100 || Math.abs(y) > 100) {
      diverged = true;
      statusMessage = "算坐标溢出范围 (-100, 100) (Out of Bounds Diverged)";
      break;
    }
  }

  return {
    optimizerId: optimizerType,
    optimizerName: optimizerType.toUpperCase(),
    steps,
    success: success && !diverged,
    diverged,
    stuck,
    statusMessage
  };
}

// Generate PyTorch/NumPy matching exporter template
export function generateCodeTemplate(preset: FormulaPreset, optimizerId: string, config: OptimizerConfig): string {
  const optimizerNameUpper = optimizerId === "sgd" ? "SGD" : optimizerId === "adam" ? "Adam" : optimizerId === "momentum" ? "SGD with Momentum" : optimizerId === "adagrad" ? "Adagrad" : "RMSprop";
  const numSteps = config.maxSteps;
  const lr = config.learningRate;
  
  // Custom python clean text expressions
  const pyExpr = preset.expression
    .replace(/Math\.sin/g, "np.sin")
    .replace(/Math\.cos/g, "np.cos")
    .replace(/Math\.exp/g, "np.exp")
    .replace(/Math\.log/g, "np.log")
    .replace(/Math\.PI/g, "np.pi")
    .replace(/π/g, "np.pi");

  return `import numpy as np
import torch
import torch.optim as optim

# ==========================================
# 1. 函数定义 & 自动求导 (PyTorch 实现)
# 表达式: ${preset.latex}
# ==========================================

def evaluate_function(x, y):
    # numpy / pytorch compatible expression
    return ${pyExpr.replace(/x/g, "x").replace(/y/g, "y")}

print("--- 开始梯度优化求解 (PyTorch) ---")

# 初始化参数 (需要求导)
x = torch.tensor(${config.initialX.toFixed(3)}, requires_grad=True)
y = torch.tensor(${config.initialY.toFixed(3)}, requires_grad=True)

# 2. 配置优化器: ${optimizerNameUpper}
learning_rate = ${lr}
max_steps = ${numSteps}

${optimizerId === "sgd" ? `optimizer = optim.SGD([x, y], lr=learning_rate)` : ""}
${optimizerId === "momentum" ? `optimizer = optim.SGD([x, y], lr=learning_rate, momentum=${config.beta1 || 0.9})` : ""}
${optimizerId === "adagrad" ? `optimizer = optim.Adagrad([x, y], lr=learning_rate)` : ""}
${optimizerId === "rmsprop" ? `optimizer = optim.RMSprop([x, y], lr=learning_rate, alpha=${config.beta2 || 0.99})` : ""}
${optimizerId === "adam" ? `optimizer = optim.Adam([x, y], lr=learning_rate, betas=(${config.beta1 || 0.9}, ${config.beta2 || 0.999}))` : ""}

# 3. 展开迭代更新轨迹
history = []
for step in range(max_steps + 1):
    optimizer.zero_grad()
    
    # 计算 Loss
    loss = evaluate_function(x, y)
    
    # 反向传播求出梯度 (BP)
    loss.backward()
    
    # 记录当前迭代信息
    current_x = x.item()
    current_y = y.item()
    grad_x = x.grad.item()
    grad_y = y.grad.item()
    grad_norm = np.sqrt(grad_x**2 + grad_y**2)
    
    # 计算 $2 \\times 2$  Hessian 矩阵的近似
    # PyTorch 可以通过二阶导数求得精确 Hessian
    hessian = torch.autograd.functional.hessian(lambda vars: evaluate_function(vars[0], vars[1]), torch.tensor([x, y]))
    eigenvalues, _ = torch.linalg.eigvalsh(hessian)
    
    history.append({
        "step": step,
        "x": current_x,
        "y": current_y,
        "loss": loss.item(),
        "grad_norm": grad_norm,
        "hessian": hessian.tolist(),
        "eigenvalues": eigenvalues.tolist()
    })
    
    # 打印前 5 步与最后结果
    if step < 5 or step == max_steps:
        print(f"Step {step:03d} | Params: [{current_x:.4f}, {current_y:.4f}] | Loss: {loss.item():.6f} | ||Grad||: {grad_norm:.6f}")
        
    # 单步梯度更新
    optimizer.step()
    
    # 收敛早停判定
    if grad_norm < 1e-5:
        print(f"\\n✔ 优化成功收敛于第 {step} 步!")
        break
`;
}
