import React, { useState, useEffect, useRef } from 'react';
import { TERRAINS, runOptimizationTrajectory } from '../utils/mathFunctions';
import { Terrain, AlgorithmType, OptimizationConfig, TrajectoryResult } from '../types';
import { ThreeLossSurface } from './ThreeLossSurface';
import { ContourMap } from './ContourMap';
import {
  Play,
  Pause,
  SkipForward,
  RotateCcw,
  Sliders,
  Sparkles,
  Zap,
  Layers,
  ChevronRight,
  TrendingDown,
  Info,
} from 'lucide-react';

interface Props {
  selectedTerrain: Terrain;
  onSelectTerrain: (terrain: Terrain) => void;
  config: OptimizationConfig;
  onChangeConfig: (newConfig: OptimizationConfig) => void;
  selectedAlgos: AlgorithmType[];
  onToggleAlgo: (algo: AlgorithmType) => void;
  startPoint: [number, number];
  onChangeStartPoint: (x: number, y: number) => void;
  onTrajectoriesUpdate?: (trajectories: TrajectoryResult[]) => void;
}

export const LossSurfaceSandbox: React.FC<Props> = ({
  selectedTerrain,
  onSelectTerrain,
  config,
  onChangeConfig,
  selectedAlgos,
  onToggleAlgo,
  startPoint,
  onChangeStartPoint,
  onTrajectoriesUpdate,
}) => {
  // Trajectory results state
  const [trajectories, setTrajectories] = useState<TrajectoryResult[]>([]);
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(100); // ms per step
  const [smoothness, setSmoothness] = useState<number>(2.0); // Gaussian blur smoothness for 2D Contour Map

  const animationRef = useRef<number | null>(null);

  // Compute trajectories whenever terrain, config, algorithms or start point changes
  useEffect(() => {
    const results = selectedAlgos.map((algo) =>
      runOptimizationTrajectory(
        selectedTerrain,
        algo,
        config,
        startPoint[0],
        startPoint[1]
      )
    );
    setTrajectories(results);
    setActiveStep(0);
    setIsPlaying(false);

    if (onTrajectoriesUpdate) {
      onTrajectoriesUpdate(results);
    }
  }, [selectedTerrain, config, selectedAlgos, startPoint]);

  // Max step across trajectories
  const maxHistoryLength = Math.max(
    1,
    ...trajectories.map((t) => t.history.length - 1)
  );

  // Animation player
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setActiveStep((prev) => {
          if (prev >= maxHistoryLength) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, playbackSpeed);

      return () => clearInterval(interval);
    }
  }, [isPlaying, maxHistoryLength, playbackSpeed]);

  const handleStepForward = () => {
    if (activeStep < maxHistoryLength) {
      setActiveStep((prev) => prev + 1);
    }
  };

  const handleStepBackward = () => {
    if (activeStep > 0) {
      setActiveStep((prev) => prev - 1);
    }
  };

  const handleReset = () => {
    setIsPlaying(false);
    setActiveStep(0);
  };

  const ALL_ALGOS: { id: AlgorithmType; name: string; color: string }[] = [
    { id: 'sgd', name: 'SGD', color: '#ef4444' },
    { id: 'momentum', name: 'Momentum', color: '#3b82f6' },
    { id: 'nag', name: 'NAG', color: '#8b5cf6' },
    { id: 'rmsprop', name: 'RMSProp', color: '#f59e0b' },
    { id: 'adam', name: 'Adam', color: '#10b981' },
    { id: 'newton', name: 'Newton', color: '#ec4899' },
    { id: 'bfgs', name: 'BFGS', color: '#06b6d4' },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Terrain Selector Slice Carousel / Tabs */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h2 className="text-base font-bold text-slate-800">
              经典极值地形基准库 (Terrain Benchmark Library)
            </h2>
          </div>
          <span className="text-xs text-slate-500 hidden sm:inline">
            选择不同曲率与条件数的损失地形
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          {TERRAINS.map((t) => {
            const isSelected = t.id === selectedTerrain.id;
            return (
              <button
                key={t.id}
                onClick={() => onSelectTerrain(t)}
                className={`p-3 rounded-xl border text-left transition-all duration-200 flex flex-col justify-between h-24 ${
                  isSelected
                    ? 'border-indigo-600 bg-indigo-50/70 shadow-sm ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                }`}
              >
                <div>
                  <div
                    className={`font-semibold text-xs ${
                      isSelected ? 'text-indigo-900' : 'text-slate-800'
                    }`}
                  >
                    {t.name}
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5 truncate">
                    {t.formulaStr}
                  </div>
                </div>
                <div
                  className={`text-[10px] px-2 py-0.5 rounded font-sans w-fit max-w-full truncate mt-1 ${
                    isSelected
                      ? 'bg-indigo-200/70 text-indigo-800 font-medium'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                  title={t.conditionNumberDesc}
                >
                  {t.conditionNumberDesc || '常规地形'}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected Terrain Detail Info Strip */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Info className="w-4 h-4 text-indigo-600 shrink-0" />
            <span className="text-slate-700">
              <strong className="text-slate-900">{selectedTerrain.name}</strong>: {selectedTerrain.description}
            </span>
          </div>
          <div className="flex gap-1 shrink-0 flex-wrap">
            {selectedTerrain.characteristics.map((c, i) => (
              <span
                key={i}
                className="bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px] text-slate-600 font-mono"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Dual View Sandbox: 3D Loss Surface + 2D Contour Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="h-[460px]">
          <ThreeLossSurface
            terrain={selectedTerrain}
            trajectories={trajectories}
            activeStep={activeStep}
            onSelectPoint={(x, y) => onChangeStartPoint(x, y)}
            selectedPoint={startPoint}
          />
        </div>

        <div className="h-[460px]">
          <ContourMap
            terrain={selectedTerrain}
            trajectories={trajectories}
            activeStep={activeStep}
            onSelectStartPoint={(x, y) => onChangeStartPoint(x, y)}
            selectedStartPoint={startPoint}
            smoothness={smoothness}
            onSmoothnessChange={setSmoothness}
          />
        </div>
      </div>

      {/* Playback & Hyperparameter Control Panel */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-6">
        {/* Step Playback Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          {/* Play / Pause / Step Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 text-white font-medium text-xs hover:bg-indigo-700 shadow-sm transition"
            >
              {isPlaying ? (
                <>
                  <Pause className="w-3.5 h-3.5" /> 暂停播放
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" /> 运行动画
                </>
              )}
            </button>

            <button
              onClick={handleStepBackward}
              disabled={activeStep === 0}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs hover:bg-slate-100 disabled:opacity-40 transition"
              title="上一步"
            >
              <ChevronRight className="w-4 h-4 rotate-180" />
            </button>

            <button
              onClick={handleStepForward}
              disabled={activeStep >= maxHistoryLength}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs hover:bg-slate-100 disabled:opacity-40 transition"
              title="下一步"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={handleReset}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs hover:bg-slate-100 transition"
              title="重置步骤"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Step Timeline Slider */}
          <div className="flex-1 w-full flex items-center gap-3">
            <span className="text-xs font-mono font-medium text-slate-600 shrink-0">
              Step: <strong className="text-indigo-600">{activeStep}</strong> / {maxHistoryLength}
            </span>
            <input
              type="range"
              min="0"
              max={maxHistoryLength}
              value={activeStep}
              onChange={(e) => {
                setIsPlaying(false);
                setActiveStep(parseInt(e.target.value, 10));
              }}
              className="flex-1 accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
            />
          </div>

          {/* Speed Selector */}
          <div className="flex items-center gap-1 bg-white px-2 py-1 rounded-lg border border-slate-200 text-xs text-slate-600">
            <span className="text-[11px] text-slate-500 mr-1">速度:</span>
            {[
              { label: '0.5x', speed: 200 },
              { label: '1x', speed: 100 },
              { label: '2x', speed: 50 },
            ].map((s) => (
              <button
                key={s.label}
                onClick={() => setPlaybackSpeed(s.speed)}
                className={`px-1.5 py-0.5 rounded text-[11px] transition ${
                  playbackSpeed === s.speed
                    ? 'bg-indigo-100 text-indigo-700 font-semibold'
                    : 'hover:bg-slate-100'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Algorithm Selection Checkboxes */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-500" /> 对比算法勾选 (Select Algorithms for Comparison):
          </label>
          <div className="flex flex-wrap gap-2.5">
            {ALL_ALGOS.map((algo) => {
              const isChecked = selectedAlgos.includes(algo.id);
              return (
                <button
                  key={algo.id}
                  onClick={() => onToggleAlgo(algo.id)}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-medium flex items-center gap-2 transition ${
                    isChecked
                      ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full inline-block"
                    style={{ backgroundColor: algo.color }}
                  />
                  <span>{algo.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Hyperparameter Adjustments Sliders */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 pt-2 border-t border-slate-200 text-xs">
          {/* Birth Point & Learning Rate */}
          <div className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
            <div className="font-semibold text-slate-800 flex items-center gap-1">
              <Sliders className="w-3.5 h-3.5 text-indigo-600" /> 出生点与学习率 (α)
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-600">初始位置 (x₀, y₀):</span>
                <span className="font-mono text-indigo-600 font-semibold">
                  ({startPoint[0].toFixed(2)}, {startPoint[1].toFixed(2)})
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.2"
                  value={startPoint[0]}
                  onChange={(e) => onChangeStartPoint(parseFloat(e.target.value) || 0, startPoint[1])}
                  className="px-2 py-1 rounded bg-white border border-slate-200 font-mono text-xs"
                />
                <input
                  type="number"
                  step="0.2"
                  value={startPoint[1]}
                  onChange={(e) => onChangeStartPoint(startPoint[0], parseFloat(e.target.value) || 0)}
                  className="px-2 py-1 rounded bg-white border border-slate-200 font-mono text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-600">学习率 Learning Rate (α):</span>
                <span className="font-mono text-indigo-600 font-bold">{config.learningRate}</span>
              </div>
              <input
                type="range"
                min="0.001"
                max="0.5"
                step="0.005"
                value={config.learningRate}
                onChange={(e) => onChangeConfig({ ...config, learningRate: parseFloat(e.target.value) })}
                className="w-full accent-indigo-600"
              />
            </div>
          </div>

          {/* Momentum & Adam Parameters */}
          <div className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
            <div className="font-semibold text-slate-800 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" /> 动量 (β) & Adam 自适应矩
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-600">动量衰减 Momentum (β):</span>
                <span className="font-mono text-amber-600 font-bold">{config.momentum}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="0.99"
                step="0.05"
                value={config.momentum}
                onChange={(e) => onChangeConfig({ ...config, momentum: parseFloat(e.target.value) })}
                className="w-full accent-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-600">Adam β₁ / β₂:</span>
                <span className="font-mono text-slate-800 font-semibold">
                  {config.beta1} / {config.beta2}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.01"
                  value={config.beta1}
                  onChange={(e) => onChangeConfig({ ...config, beta1: parseFloat(e.target.value) })}
                  className="px-2 py-1 rounded bg-white border border-slate-200 font-mono text-xs"
                />
                <input
                  type="number"
                  step="0.001"
                  value={config.beta2}
                  onChange={(e) => onChangeConfig({ ...config, beta2: parseFloat(e.target.value) })}
                  className="px-2 py-1 rounded bg-white border border-slate-200 font-mono text-xs"
                />
              </div>
            </div>
          </div>

          {/* Step Limit & Stochastic Noise */}
          <div className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
            <div className="font-semibold text-slate-800 flex items-center gap-1">
              <TrendingDown className="w-3.5 h-3.5 text-emerald-600" /> 最大迭代步数 & 随机噪声
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-600">最大步数 Max Steps:</span>
                <span className="font-mono text-emerald-600 font-bold">{config.maxSteps}</span>
              </div>
              <input
                type="range"
                min="20"
                max="300"
                step="10"
                value={config.maxSteps}
                onChange={(e) => onChangeConfig({ ...config, maxSteps: parseInt(e.target.value, 10) })}
                className="w-full accent-emerald-600"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-600">梯度随机噪声 (Stochastic Noise):</span>
                <span className="font-mono text-slate-800 font-semibold">{config.noiseLevel}</span>
              </div>
              <input
                type="range"
                min="0"
                max="0.5"
                step="0.05"
                value={config.noiseLevel}
                onChange={(e) => onChangeConfig({ ...config, noiseLevel: parseFloat(e.target.value) })}
                className="w-full accent-slate-600"
              />
            </div>
          </div>

          {/* Contour Map Smoothness (Gaussian Blur Filter) */}
          <div className="space-y-4 bg-slate-50/70 p-4 rounded-xl border border-slate-200/80">
            <div className="font-semibold text-slate-800 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" /> 地形等高线平滑度 (Smoothness)
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-600">高斯模糊半径 (Blur Radius):</span>
                <span className="font-mono text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200">
                  {smoothness.toFixed(1)} px
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="5"
                step="0.5"
                value={smoothness}
                onChange={(e) => setSmoothness(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-600 pt-0.5">
                <span>0.0 (原始)</span>
                <span>2.0 (推荐)</span>
                <span>5.0 (极平滑)</span>
              </div>
            </div>

            <div className="text-[11px] text-slate-600 leading-relaxed bg-white p-2 rounded border border-slate-200/70">
              💡 利用可分离高斯滤波平滑等高线图，消除非凸鞍点与多峰极值处的局部锯齿噪点，大幅提升视觉辨识体验。
            </div>
          </div>
        </div>

        {/* Real-time Step Telemetry Table */}
        <div className="border-t border-slate-200 pt-4">
          <h3 className="text-xs font-semibold text-slate-700 mb-2">
            当前 Step {activeStep} 算法状态实时监控 (Real-time Telemetry):
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-600 border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 font-medium text-slate-700">
                  <th className="py-2 px-3">算法 Name</th>
                  <th className="py-2 px-3">当前坐标 (x, y)</th>
                  <th className="py-2 px-3">损失 Loss f(x,y)</th>
                  <th className="py-2 px-3">梯度模长 ||∇f||</th>
                  <th className="py-2 px-3">距离极小值 Dist</th>
                  <th className="py-2 px-3">收敛状态 Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 font-mono">
                {trajectories.map((t) => {
                  const curr = t.history[Math.min(activeStep, t.history.length - 1)];
                  if (!curr) return null;
                  const dist = Math.hypot(
                    curr.x - selectedTerrain.minPoint[0],
                    curr.y - selectedTerrain.minPoint[1]
                  );

                  return (
                    <tr key={t.algorithm} className="hover:bg-slate-50/80">
                      <td className="py-2 px-3 font-sans font-semibold flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block"
                          style={{ backgroundColor: t.color }}
                        />
                        <span className="text-slate-800">{t.name}</span>
                      </td>
                      <td className="py-2 px-3 text-slate-700">
                        ({curr.x.toFixed(3)}, {curr.y.toFixed(3)})
                      </td>
                      <td className="py-2 px-3 font-bold text-amber-600">
                        {curr.loss.toFixed(6)}
                      </td>
                      <td className="py-2 px-3 text-slate-600">
                        {curr.gradNorm.toFixed(4)}
                      </td>
                      <td className="py-2 px-3 text-emerald-600 font-semibold">
                        {dist.toFixed(4)}
                      </td>
                      <td className="py-2 px-3 font-sans">
                        {t.status === 'converged' ? (
                          <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            已收敛 (Step {t.convergedStep})
                          </span>
                        ) : t.status === 'diverged' ? (
                          <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            发散飞山 (Exploded)
                          </span>
                        ) : (
                          <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                            迭代中
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
      </div>
    </div>
  );
};
