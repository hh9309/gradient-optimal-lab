import { Terrain, AlgorithmType, OptimizationConfig, StepRecord, TrajectoryResult } from '../types';

/**
 * Numerical gradient computation via central differences
 */
export function numericalGradient(
  fn: (x: number, y: number) => number,
  x: number,
  y: number,
  h = 1e-5
): [number, number] {
  const dfdx = (fn(x + h, y) - fn(x - h, y)) / (2 * h);
  const dfdy = (fn(x, y + h) - fn(x, y - h)) / (2 * h);
  return [dfdx, dfdy];
}

/**
 * Numerical Hessian computation
 */
export function numericalHessian(
  fn: (x: number, y: number) => number,
  x: number,
  y: number,
  h = 1e-4
): [[number, number], [number, number]] {
  const f0 = fn(x, y);
  const fxx = (fn(x + h, y) - 2 * f0 + fn(x - h, y)) / (h * h);
  const fyy = (fn(x, y + h) - 2 * f0 + fn(x, y - h)) / (h * h);
  const fxy = (fn(x + h, y + h) - fn(x + h, y - h) - fn(x - h, y + h) + fn(x - h, y - h)) / (4 * h * h);
  return [
    [fxx, fxy],
    [fxy, fyy],
  ];
}

/**
 * Predefined Terrain Benchmark Library
 */
export const TERRAINS: Terrain[] = [
  {
    id: 'bowl',
    name: '标准等向圆碗',
    nameEn: 'Isotropic Bowl',
    formulaStr: 'f(x, y) = x² + y²',
    latexStr: 'f(x, y) = x^2 + y^2',
    description: '最理想的凸函数，各个方向曲率完全一致， Hessian 矩阵条件数为 1。各方向下降速度相同，梯度直指极小值点。',
    characteristics: ['1 个全局极小值点 (0, 0)', '条件数 = 1 各向同性', '等高线为同心圆', '无震荡一击即中'],
    fn: (x, y) => x * x + y * y,
    grad: (x, y) => [2 * x, 2 * y],
    hessian: () => [[2, 0], [0, 2]],
    minPoint: [0, 0],
    minVal: 0,
    bounds: [-4, 4],
    conditionNumberDesc: '条件数 = 最大曲率 / 最小曲率 = 1 (理想良态各向同性)',
  },
  {
    id: 'elliptic',
    name: '狭长椭圆病态谷',
    nameEn: 'Anisotropic Elliptic Valley',
    formulaStr: 'f(x, y) = 0.5x² + 10y²',
    latexStr: 'f(x, y) = 0.5x^2 + 10y^2',
    description: '模拟两壁极其陡峭、谷底平缓的水槽地形。Hessian 条件数为 40。传统 SGD 在 y 轴陡峭壁面剧烈震荡横跳，而 x 轴方向前进缓慢。',
    characteristics: ['1 个全局极小值点 (0, 0)', '条件数 = 40 (病态陡谷)', 'y 轴方向梯度远大于 x 轴', '动量与自适应算法适用'],
    fn: (x, y) => 0.5 * x * x + 10 * y * y,
    grad: (x, y) => [x, 20 * y],
    hessian: () => [[1, 0], [0, 20]],
    minPoint: [0, 0],
    minVal: 0,
    bounds: [-4, 4],
    conditionNumberDesc: '条件数 = 最大曲率 / 最小曲率 = 40 (显著病态)',
  },
  {
    id: 'twin_basin',
    name: '对称双谷关隘',
    nameEn: 'Twin Basin Saddle Pass',
    formulaStr: 'f(x, y) = (x² - 1)² + y²',
    latexStr: 'f(x, y) = (x^2 - 1)^2 + y^2',
    description: '经典的双势井双谷地形。包含 2 个全局极小值谷底 (-1, 0) 与 (1, 0)，以及中央 1 个极小梯度的关隘鞍点 (0, 0)。结构清晰直观，完美演示算法在鞍点的停滞与向两侧的分流分支。',
    characteristics: ['最多 3 个临界点 (2 极小值 + 1 鞍点)', '双极小值: (-1, 0) 与 (1, 0)', '中央关隘: (0, 0) 处 Hessian 特征值一正一负', '等高线平滑，路线清晰'],
    fn: (x, y) => Math.pow(x * x - 1, 2) + y * y,
    grad: (x, y) => [4 * x * (x * x - 1), 2 * y],
    hessian: (x, y) => [[12 * x * x - 4, 0], [0, 2]],
    minPoint: [1, 0],
    minVal: 0,
    bounds: [-3, 3],
    conditionNumberDesc: '中央关隘鞍点 (0, 0) 连通两侧深谷 (共 3 个临界点)',
  },
  {
    id: 'slanted_basin',
    name: '旋转倾斜非对称谷',
    nameEn: 'Slanted Asymmetric Valley',
    formulaStr: 'f(x, y) = (x - 1.5)² + 2(y - 0.5)² + 1.2(x - 1.5)(y - 0.5)',
    latexStr: 'f(x, y) = (x - 1.5)^2 + 2(y - 0.5)^2 + 1.2(x - 1.5)(y - 0.5)',
    description: '带坐标轴交叉项的旋转倾斜单盆地。全局极小值在 (1.5, 0.5)。等高线呈现 45° 倾斜，测试算法在坐标轴非对齐方向上的二阶转向与平滑下降能力。',
    characteristics: ['1 个全局极小值点 (1.5, 0.5)', '带 xy 坐标交叉项，等高线倾斜', '主轴不平行于坐标轴', '单峰凸函数，收敛路径极其平滑'],
    fn: (x, y) => Math.pow(x - 1.5, 2) + 2 * Math.pow(y - 0.5, 2) + 1.2 * (x - 1.5) * (y - 0.5),
    grad: (x, y) => [2 * (x - 1.5) + 1.2 * (y - 0.5), 4 * (y - 0.5) + 1.2 * (x - 1.5)],
    hessian: () => [[2, 1.2], [1.2, 4]],
    minPoint: [1.5, 0.5],
    minVal: 0,
    bounds: [-4, 4],
    conditionNumberDesc: '坐标交叉倾斜椭圆，1 个极小值 (1.5, 0.5)',
  },
  {
    id: 'asymmetric_wells',
    name: '非对称双井陷阱谷',
    nameEn: 'Asymmetric Double-Well Basin',
    formulaStr: 'f(x, y) = 0.25(x² - 2.25)² + y² - 0.3x + 1.2',
    latexStr: 'f(x, y) = 0.25(x^2 - 2.25)^2 + y^2 - 0.3x + 1.2',
    description: '双势井非对称地形。包含 1 个深全局极小值 (1.56, 0)、1 个浅局部极小值 (-1.37, 0) 以及中央 1 个分隔关隘 (-0.13, 0)。结构优雅简明，测试算法是否会陷入浅陷阱或越过山脊到达全局极小值。',
    characteristics: ['最多 3 个临界点 (1 主极小 + 1 浅极小 + 1 关隘)', '深全局极小值: (1.56, 0), f ≈ 0.74', '浅局部极小值: (-1.37, 0), f ≈ 1.12', '测试学习率与动量跨越局部陷阱的能力'],
    fn: (x, y) => 0.25 * Math.pow(x * x - 2.25, 2) + y * y - 0.3 * x + 1.2,
    grad: (x, y) => [x * (x * x - 2.25) - 0.3, 2 * y],
    hessian: (x, y) => [[3 * x * x - 2.25, 0], [0, 2]],
    minPoint: [1.562, 0],
    minVal: 0.74,
    bounds: [-3.5, 3.5],
    conditionNumberDesc: '1 个全局主极小值 + 1 个浅局部陷阱 (共 3 个极值点)',
  },
  {
    id: 'saddle_basin',
    name: '马鞍双谷连通山脊',
    nameEn: 'Saddle Ridge Double Basin',
    formulaStr: 'f(x, y) = x² - y² + 0.05(x² + y²)²',
    latexStr: 'f(x, y) = x^2 - y^2 + 0.05(x^2 + y^2)^2',
    description: '结构极简的三临界点地形。包含原点 1 个标准马鞍关隘 (0, 0) 与南北对称 2 个深谷极小值 (0, ±3.16)。梯度平滑且计算稳定，清晰展示算法在马鞍处的停滞与逃逸动态。',
    characteristics: ['最多 3 个临界点 (1 鞍点 + 2 极小值)', '原点 (0, 0) 为纯马鞍点 (Hessian 特征值一正一负)', '2 个极小值: (0, ±3.16), f = -5', '展现动量与自适应算法对鞍点的逃逸能力'],
    fn: (x, y) => x * x - y * y + 0.05 * Math.pow(x * x + y * y, 2),
    grad: (x, y) => [2 * x * (1 + 0.1 * (x * x + y * y)), 2 * y * (-1 + 0.1 * (x * x + y * y))],
    hessian: (x, y) => [
      [2 + 0.6 * x * x + 0.2 * y * y, 0.4 * x * y],
      [0.4 * x * y, -2 + 0.2 * x * x + 0.6 * y * y],
    ],
    minPoint: [0, 3.162],
    minVal: -5,
    bounds: [-4.5, 4.5],
    conditionNumberDesc: '原点 (0, 0) 为经典马鞍关隘，南北分布 2 深谷 (共 3 个临界点)',
  },
];

/**
 * Run Step-by-Step Optimization Trajectory Engine
 */
export function runOptimizationTrajectory(
  terrain: Terrain,
  algo: AlgorithmType,
  config: OptimizationConfig,
  startX: number,
  startY: number
): TrajectoryResult {
  const history: StepRecord[] = [];
  let x = startX;
  let y = startY;

  // State variables for algorithms
  let vx = 0;
  let vy = 0;
  let sx = 0; // RMSProp / Adam 2nd moment
  let sy = 0;
  let mx = 0; // Adam 1st moment
  let my = 0;

  let totalDistance = 0;
  const maxSteps = config.maxSteps || 100;
  let lr = config.learningRate;

  // Color mapping per algorithm for visual contrast
  const ALGO_COLORS: Record<AlgorithmType, string> = {
    sgd: '#ef4444',       // Crimson Red
    momentum: '#3b82f6',  // Vivid Blue
    nag: '#8b5cf6',       // Royal Purple
    rmsprop: '#f59e0b',   // Bright Amber
    adam: '#10b981',      // Emerald Green
    newton: '#ec4899',    // Deep Pink
    bfgs: '#06b6d4',      // Cyan
  };

  const ALGO_NAMES: Record<AlgorithmType, string> = {
    sgd: 'SGD (随机梯度下降)',
    momentum: 'Momentum (动量法)',
    nag: 'NAG (Nesterov加速梯度)',
    rmsprop: 'RMSProp (均方根自适应)',
    adam: 'Adam (自适应矩估计)',
    newton: 'Newton (牛顿二阶法)',
    bfgs: 'BFGS (拟牛顿法)',
  };

  // Initial step record
  const initLoss = terrain.fn(x, y);
  const [initGradX, initGradY] = terrain.grad(x, y);
  history.push({
    step: 0,
    x,
    y,
    loss: initLoss,
    gradX: initGradX,
    gradY: initGradY,
    gradNorm: Math.hypot(initGradX, initGradY),
    vx: 0,
    vy: 0,
  });

  // Inverse Hessian matrix estimate for BFGS
  let B_inv = [
    [1, 0],
    [0, 1],
  ];

  let status: TrajectoryResult['status'] = 'running';
  let convergedStep: number | undefined = undefined;

  for (let k = 1; k <= maxSteps; k++) {
    // Check if exploded / NaN
    if (isNaN(x) || isNaN(y) || Math.abs(x) > 1e4 || Math.abs(y) > 1e4) {
      status = 'diverged';
      break;
    }

    const currentLoss = terrain.fn(x, y);
    const [gx, gy] = terrain.grad(x, y);

    // Add optional noise for stochastic simulation
    const noiseX = config.noiseLevel ? (Math.random() - 0.5) * config.noiseLevel : 0;
    const noiseY = config.noiseLevel ? (Math.random() - 0.5) * config.noiseLevel : 0;

    const effGx = gx + noiseX;
    const effGy = gy + noiseY;

    const gradNorm = Math.hypot(effGx, effGy);

    // Convergence check: Gradient norm or distance to min < 1e-4
    const distToMin = Math.hypot(x - terrain.minPoint[0], y - terrain.minPoint[1]);
    if (gradNorm < 1e-4 || distToMin < 1e-3 || Math.abs(currentLoss - terrain.minVal) < 1e-5) {
      status = 'converged';
      convergedStep = k;
      break;
    }

    let dx = 0;
    let dy = 0;

    // Apply learning rate decay if configured
    if (config.decayRate > 0) {
      lr = config.learningRate / (1 + config.decayRate * k);
    }

    switch (algo) {
      case 'sgd': {
        dx = -lr * effGx;
        dy = -lr * effGy;
        break;
      }
      case 'momentum': {
        const beta = config.momentum || 0.9;
        vx = beta * vx + lr * effGx;
        vy = beta * vy + lr * effGy;
        dx = -vx;
        dy = -vy;
        break;
      }
      case 'nag': {
        const beta = config.momentum || 0.9;
        // Look-ahead gradient position
        const lookaheadX = x - beta * vx;
        const lookaheadY = y - beta * vy;
        const [lgx, lgy] = terrain.grad(lookaheadX, lookaheadY);
        vx = beta * vx + lr * lgx;
        vy = beta * vy + lr * lgy;
        dx = -vx;
        dy = -vy;
        break;
      }
      case 'rmsprop': {
        const beta2 = config.beta2 || 0.99;
        const eps = config.epsilon || 1e-8;
        sx = beta2 * sx + (1 - beta2) * effGx * effGx;
        sy = beta2 * sy + (1 - beta2) * effGy * effGy;
        dx = (-lr / (Math.sqrt(sx) + eps)) * effGx;
        dy = (-lr / (Math.sqrt(sy) + eps)) * effGy;
        break;
      }
      case 'adam': {
        const beta1 = config.beta1 || 0.9;
        const beta2 = config.beta2 || 0.999;
        const eps = config.epsilon || 1e-8;

        mx = beta1 * mx + (1 - beta1) * effGx;
        my = beta1 * my + (1 - beta1) * effGy;

        sx = beta2 * sx + (1 - beta2) * effGx * effGx;
        sy = beta2 * sy + (1 - beta2) * effGy * effGy;

        // Bias correction
        const mHatX = mx / (1 - Math.pow(beta1, k));
        const mHatY = my / (1 - Math.pow(beta1, k));
        const sHatX = sx / (1 - Math.pow(beta2, k));
        const sHatY = sy / (1 - Math.pow(beta2, k));

        dx = (-lr / (Math.sqrt(sHatX) + eps)) * mHatX;
        dy = (-lr / (Math.sqrt(sHatY) + eps)) * mHatY;
        break;
      }
      case 'newton': {
        // Newton's Method using Hessian: Δx = - H^(-1) * ∇f
        const H = terrain.hessian
          ? terrain.hessian(x, y)
          : numericalHessian(terrain.fn, x, y);
        const det = H[0][0] * H[1][1] - H[0][1] * H[1][0];

        if (Math.abs(det) < 1e-6) {
          // Hessian non-invertible or near saddle point, fallback to SGD with damping
          dx = -lr * effGx;
          dy = -lr * effGy;
        } else {
          // Inverse 2x2 matrix
          const invH = [
            [H[1][1] / det, -H[0][1] / det],
            [-H[1][0] / det, H[0][0] / det],
          ];
          // Step = - H^(-1) * g
          const newtonDx = -(invH[0][0] * effGx + invH[0][1] * effGy);
          const newtonDy = -(invH[1][0] * effGx + invH[1][1] * effGy);

          // Apply step scaling / learning rate for stability
          dx = lr * newtonDx;
          dy = lr * newtonDy;
        }
        break;
      }
      case 'bfgs': {
        // Quasi-Newton BFGS update
        const pX = -(B_inv[0][0] * effGx + B_inv[0][1] * effGy);
        const pY = -(B_inv[1][0] * effGx + B_inv[1][1] * effGy);

        dx = lr * pX;
        dy = lr * pY;

        // Compute next point to update B_inv via Sherman-Morrison
        const nextX = x + dx;
        const nextY = y + dy;
        const [nextGx, nextGy] = terrain.grad(nextX, nextY);

        const sVec = [dx, dy];
        const yVec = [nextGx - effGx, nextGy - effGy];

        const syDot = sVec[0] * yVec[0] + sVec[1] * yVec[1];
        if (Math.abs(syDot) > 1e-8) {
          const rho = 1 / syDot;
          // Simple rank-2 update for 2D Hessian inverse
          const Hy0 = B_inv[0][0] * yVec[0] + B_inv[0][1] * yVec[1];
          const Hy1 = B_inv[1][0] * yVec[0] + B_inv[1][1] * yVec[1];
          const yHy = yVec[0] * Hy0 + yVec[1] * Hy1;

          const factor = (syDot + yHy) * rho * rho;

          B_inv[0][0] += factor * sVec[0] * sVec[0] - rho * (sVec[0] * Hy0 + Hy0 * sVec[0]);
          B_inv[0][1] += factor * sVec[0] * sVec[1] - rho * (sVec[0] * Hy1 + Hy0 * sVec[1]);
          B_inv[1][0] += factor * sVec[1] * sVec[0] - rho * (sVec[1] * Hy0 + Hy1 * sVec[0]);
          B_inv[1][1] += factor * sVec[1] * sVec[1] - rho * (sVec[1] * Hy1 + Hy1 * sVec[1]);
        }
        break;
      }
    }

    const stepDist = Math.hypot(dx, dy);
    totalDistance += stepDist;

    x += dx;
    y += dy;

    const nextLoss = terrain.fn(x, y);
    const [ngX, ngY] = terrain.grad(x, y);

    history.push({
      step: k,
      x,
      y,
      loss: nextLoss,
      gradX: ngX,
      gradY: ngY,
      gradNorm: Math.hypot(ngX, ngY),
      vx,
      vy,
    });
  }

  if (status === 'running') {
    status = 'max_steps';
  }

  return {
    algorithm: algo,
    name: ALGO_NAMES[algo],
    color: ALGO_COLORS[algo],
    history,
    status,
    convergedStep,
    finalLoss: history[history.length - 1]?.loss ?? 0,
    totalDistance,
    finalPoint: [x, y],
  };
}
