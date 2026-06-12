/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface OptimizerConfig {
  id: string;
  name: string;
  learningRate: number;
  maxSteps: number;
  initialX: number;
  initialY: number;
  beta1: number; // for momentum / adam
  beta2: number; // for rmsProp / adam
  epsilon: number;
  noiseLevel: number; // For Gaussian noise simulation
}

export interface FormulaPreset {
  id: string;
  name: string;
  latex: string;
  expression: string; // readable text
  rangeX: [number, number];
  rangeY: [number, number];
  f: (x: number, y: number) => number;
  grad: (x: number, y: number) => [number, number];
  hessian: (x: number, y: number) => [[number, number], [number, number]];
  globalMinima?: [number, number][];
}

export interface OptimizationStep {
  step: number;
  x: number;
  y: number;
  loss: number;
  gradX: number;
  gradY: number;
  gradNorm: number;
  updateX: number;
  updateY: number;
  hessian: [[number, number], [number, number]];
  eigenvalues: [number, number];
  topography: "minimum" | "maximum" | "saddle" | "valley" | "flat" | "normal";
}

export interface RunResult {
  optimizerId: string;
  optimizerName: string;
  steps: OptimizationStep[];
  success: boolean;
  diverged: boolean;
  stuck: boolean;
  statusMessage: string;
}

export interface AIInsightRequest {
  formulaName: string;
  config: OptimizerConfig;
  activeResult: RunResult;
  allResults: RunResult[];
}

export interface AIInsightResponse {
  anomalyDetected: boolean;
  anomalyType?: "divergence" | "saddle_point" | "oscillation" | "slow_convergence" | "none";
  anomalyMessage?: string;
  terrainAnalysis: string;
  optimizerComparison: {
    optimizerId: string;
    prosAndCons: string;
    efficiencyRank: number;
  }[];
  tuningRecommendations: {
    parameter: string;
    suggestedValue: string;
    reason: string;
  }[];
  curvaturesExplanation: string; // Hessian eigenvalues explanation
}
