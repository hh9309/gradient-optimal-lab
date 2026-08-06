import React, { useState } from 'react';
import { TERRAINS, runOptimizationTrajectory } from './utils/mathFunctions';
import { ActiveTab, Terrain, OptimizationConfig, AlgorithmType, TrajectoryResult } from './types';
import { Header } from './components/Header';
import { LossSurfaceSandbox } from './components/LossSurfaceSandbox';
import { FunctionGradientSandbox } from './components/FunctionGradientSandbox';
import { GeometricEssence } from './components/GeometricEssence';
import { AlgorithmEvolution } from './components/AlgorithmEvolution';
import { TheoryCore } from './components/TheoryCore';
import { CodeEngine } from './components/CodeEngine';
import { AiDiagnostics } from './components/AiDiagnostics';
import { ReportExporter } from './components/ReportExporter';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('sandbox');

  // Active Terrain (default to Narrow Elliptic Valley to highlight oscillations vs momentum)
  const [selectedTerrain, setSelectedTerrain] = useState<Terrain>(TERRAINS[1]);

  // Global Hyperparameters State
  const [config, setConfig] = useState<OptimizationConfig>({
    learningRate: 0.05,
    momentum: 0.85,
    beta1: 0.9,
    beta2: 0.999,
    epsilon: 1e-8,
    maxSteps: 80,
    noiseLevel: 0,
    decayRate: 0,
  });

  // Active Multi-Algorithms Selection
  const [selectedAlgos, setSelectedAlgos] = useState<AlgorithmType[]>([
    'sgd',
    'momentum',
    'nag',
    'rmsprop',
    'adam',
    'newton',
  ]);

  // Starting Birth Point (x0, y0)
  const [startPoint, setStartPoint] = useState<[number, number]>([-3.0, 3.0]);

  // Trajectories Cache
  const [trajectories, setTrajectories] = useState<TrajectoryResult[]>(() => {
    return selectedAlgos.map((algo) =>
      runOptimizationTrajectory(selectedTerrain, algo, config, startPoint[0], startPoint[1])
    );
  });

  const handleToggleAlgo = (algo: AlgorithmType) => {
    if (selectedAlgos.includes(algo)) {
      if (selectedAlgos.length > 1) {
        setSelectedAlgos(selectedAlgos.filter((a) => a !== algo));
      }
    } else {
      setSelectedAlgos([...selectedAlgos, algo]);
    }
  };

  const handleChangeStartPoint = (x: number, y: number) => {
    setStartPoint([x, y]);
  };

  // Pathology Preset Loader
  const handleApplyPreset = (presetType: 'explosion' | 'oscillation' | 'saddle' | 'ideal') => {
    switch (presetType) {
      case 'oscillation':
        setSelectedTerrain(TERRAINS[1]); // Narrow Elliptic Valley
        setStartPoint([-3.2, 3.2]);
        setConfig((prev) => ({ ...prev, learningRate: 0.08, momentum: 0.85 }));
        setSelectedAlgos(['sgd', 'momentum', 'adam']);
        break;
      case 'explosion':
        setSelectedTerrain(TERRAINS[0]); // Bowl
        setStartPoint([-2.5, 2.5]);
        setConfig((prev) => ({ ...prev, learningRate: 0.55 })); // Very high learning rate causing explosion
        setSelectedAlgos(['sgd']);
        break;
      case 'saddle':
        setSelectedTerrain(TERRAINS[2]); // Twin Basin Saddle Pass
        setStartPoint([0.01, 2.2]);
        setConfig((prev) => ({ ...prev, learningRate: 0.05, momentum: 0.0 })); // SGD stuck at saddle
        setSelectedAlgos(['sgd', 'momentum', 'adam']);
        break;
      case 'ideal':
        setSelectedTerrain(TERRAINS[0]); // Standard Bowl
        setStartPoint([-3.0, 3.0]);
        setConfig((prev) => ({ ...prev, learningRate: 0.08, momentum: 0.85 }));
        setSelectedAlgos(['sgd', 'momentum', 'adam', 'newton']);
        break;
    }
    setActiveTab('sandbox');
  };

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans selection:bg-indigo-500 selection:text-white">
      {/* Top Header Navigation */}
      <Header activeTab={activeTab} onChangeTab={setActiveTab} />

      {/* Main Tab Content Display */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'sandbox' && (
          <LossSurfaceSandbox
            selectedTerrain={selectedTerrain}
            onSelectTerrain={setSelectedTerrain}
            config={config}
            onChangeConfig={setConfig}
            selectedAlgos={selectedAlgos}
            onToggleAlgo={handleToggleAlgo}
            startPoint={startPoint}
            onChangeStartPoint={handleChangeStartPoint}
            onTrajectoriesUpdate={setTrajectories}
          />
        )}

        {activeTab === 'function-grad' && <FunctionGradientSandbox />}

        {activeTab === 'essence' && <GeometricEssence />}

        {activeTab === 'algorithms' && (
          <AlgorithmEvolution trajectories={trajectories} terrain={selectedTerrain} />
        )}

        {activeTab === 'theory' && <TheoryCore />}

        {activeTab === 'code' && (
          <CodeEngine
            terrain={selectedTerrain}
            config={config}
            algorithm={selectedAlgos[0] || 'sgd'}
            startPoint={startPoint}
          />
        )}

        {activeTab === 'ai-diag' && (
          <AiDiagnostics
            terrain={selectedTerrain}
            config={config}
            trajectories={trajectories}
            startPoint={startPoint}
            onApplyPreset={handleApplyPreset}
          />
        )}

        {activeTab === 'report' && (
          <ReportExporter
            terrain={selectedTerrain}
            config={config}
            trajectories={trajectories}
            startPoint={startPoint}
          />
        )}
      </main>

      {/* Footer Status Bar */}
      <footer className="h-9 bg-white border-t border-slate-200 px-4 sm:px-6 flex items-center justify-between shrink-0 text-[11px] text-slate-500 font-mono select-none">
        <div className="flex items-center space-x-4 sm:space-x-6 overflow-x-auto">
          <span>
            X: <strong className="text-slate-700">{startPoint[0].toFixed(4)}</strong>
          </span>
          <span>
            Y: <strong className="text-slate-700">{startPoint[1].toFixed(4)}</strong>
          </span>
          <span>
            Loss:{' '}
            <strong className="text-indigo-600 font-bold">
              {trajectories[0]?.finalLoss != null
                ? trajectories[0].finalLoss.toFixed(6)
                : selectedTerrain.fn(startPoint[0], startPoint[1]).toFixed(6)}
            </strong>
          </span>
          <span className="hidden md:inline text-indigo-600">
            Iter: {trajectories[0]?.history.length ? trajectories[0].history.length - 1 : 0}/{config.maxSteps}
          </span>
          <span className="hidden lg:inline text-slate-400">
            Terrain: {selectedTerrain.name}
          </span>
        </div>
        <div className="flex items-center space-x-4 shrink-0 text-[10px]">
          <span className="flex items-center text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200/80 font-medium">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full mr-1.5"></span>
            GPU Acceleration ON
          </span>
          <span className="hidden sm:inline text-slate-400">UTF-8</span>
        </div>
      </footer>
    </div>
  );
}
