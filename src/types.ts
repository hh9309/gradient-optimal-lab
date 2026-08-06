/**
 * Gradient Optimization Lab - Type Definitions
 */

export type AlgorithmType =
  | 'sgd'
  | 'momentum'
  | 'nag'
  | 'rmsprop'
  | 'adam'
  | 'newton'
  | 'bfgs';

export interface Terrain {
  id: string;
  name: string;
  nameEn: string;
  formulaStr: string;
  latexStr: string;
  description: string;
  characteristics: string[];
  fn: (x: number, y: number) => number;
  grad: (x: number, y: number) => [number, number];
  hessian?: (x: number, y: number) => [[number, number], [number, number]];
  minPoint: [number, number];
  minVal: number;
  bounds: [number, number]; // e.g. [-4, 4]
  contourLevels?: number[];
  conditionNumberDesc?: string;
}

export interface OptimizationConfig {
  learningRate: number;
  momentum: number; // β for Polyak Momentum / NAG
  beta1: number;    // β1 for Adam (0.9)
  beta2: number;    // β2 for Adam (0.999)
  epsilon: number;  // 1e-8
  maxSteps: number;
  noiseLevel: number;
  decayRate: number; // Learning rate decay
}

export interface StepRecord {
  step: number;
  x: number;
  y: number;
  loss: number;
  gradX: number;
  gradY: number;
  gradNorm: number;
  vx?: number;
  vy?: number;
}

export interface TrajectoryResult {
  algorithm: AlgorithmType;
  name: string;
  color: string;
  history: StepRecord[];
  status: 'converged' | 'diverged' | 'oscillating' | 'stuck' | 'running' | 'max_steps';
  convergedStep?: number;
  finalLoss: number;
  totalDistance: number;
  finalPoint: [number, number];
}

export type ActiveTab =
  | 'sandbox'
  | 'function-grad'
  | 'essence'
  | 'algorithms'
  | 'theory'
  | 'code'
  | 'ai-diag'
  | 'report';

export interface DiagnosticReport {
  timestamp: string;
  status: string;
  reportMarkdown: string;
}
