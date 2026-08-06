import React, { useState, useEffect, useRef } from 'react';
import { Terrain, OptimizationConfig, TrajectoryResult } from '../types';
import {
  Bot,
  Sparkles,
  AlertTriangle,
  RefreshCw,
  Send,
  CheckCircle2,
  Settings,
  Key,
  Cpu,
  Eye,
  EyeOff,
  ShieldCheck,
  X,
  MessageSquare,
  Trash2,
  User,
  HelpCircle,
} from 'lucide-react';
import {
  LLMModel,
  LLMConfig,
  ChatMessage,
  getStoredLLMConfig,
  setStoredLLMConfig,
  callLLM,
} from '../utils/llmService';

interface Props {
  terrain: Terrain;
  config: OptimizationConfig;
  trajectories: TrajectoryResult[];
  startPoint: [number, number];
  onApplyPreset?: (presetType: 'explosion' | 'oscillation' | 'saddle' | 'ideal') => void;
}

export const AiDiagnostics: React.FC<Props> = ({
  terrain,
  config,
  trajectories,
  startPoint,
  onApplyPreset,
}) => {
  // LLM Config State
  const [llmConfig, setLlmConfig] = useState<LLMConfig>({
    apiKey: '',
    selectedModel: 'gemini-3.6-flash',
  });
  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [modalKeyInput, setModalKeyInput] = useState<string>('');
  const [modalModelInput, setModalModelInput] = useState<LLMModel>('gemini-3.6-flash');
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);

  // Diagnosis State
  const [diagnoseLoading, setDiagnoseLoading] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Q&A Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>('');
  const [chatLoading, setChatLoading] = useState<boolean>(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Load stored LLM config on mount
  useEffect(() => {
    const stored = getStoredLLMConfig();
    setLlmConfig(stored);
    setModalKeyInput(stored.apiKey);
    setModalModelInput(stored.selectedModel);
  }, []);

  // Save settings
  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const newConfig: LLMConfig = {
      apiKey: modalKeyInput.trim(),
      selectedModel: modalModelInput,
    };
    setLlmConfig(newConfig);
    setStoredLLMConfig(newConfig);
    setShowSettingsModal(false);
    setSettingsNotice(null);
  };

  // Open settings modal
  const openSettings = (notice?: string) => {
    setModalKeyInput(llmConfig.apiKey);
    setModalModelInput(llmConfig.selectedModel);
    if (notice) setSettingsNotice(notice);
    else setSettingsNotice(null);
    setShowSettingsModal(true);
  };

  // Check if API key is present, if not show modal
  const ensureApiKey = (): boolean => {
    if (!llmConfig.apiKey || !llmConfig.apiKey.trim()) {
      openSettings('⚠️ 请先配置大模型 API-Key 即可开始智能分析与问答。所有请求均由浏览器本地直接发起或端到端加密传输。');
      return false;
    }
    return true;
  };

  // Run AI Diagnosis Report
  const handleRunDiagnosis = async () => {
    if (!ensureApiKey()) return;

    setDiagnoseLoading(true);
    setErrorMsg(null);

    const primaryTraj = trajectories[0] || {
      algorithm: 'sgd',
      history: [],
      status: 'running',
      finalLoss: 0,
    };

    const systemPrompt = `你是一位严谨而亲和的最优化理论与神经网络专家。请对以下优化算法在特定损失函数曲面上的表现进行深度病态诊断与收敛分析。`;

    const userPrompt = `【优化任务参数】
- 目标地形: ${terrain.name || '自定义曲面'} ($f(x,y) = ${terrain.formulaStr}$)
- 使用算法: ${primaryTraj.algorithm?.toUpperCase() || 'SGD'}
- 学习率 (α): ${config.learningRate}
- 动量参数 (β): ${config.momentum ?? 'N/A'}
- 初始出生点: (${startPoint?.[0]}, ${startPoint?.[1]})
- 优化结果状态: ${primaryTraj.status}
- 执行步数: ${primaryTraj.history?.length ? primaryTraj.history.length - 1 : 0} 步
- 最终 Loss 值: ${typeof primaryTraj.finalLoss === 'number' ? primaryTraj.finalLoss.toFixed(6) : primaryTraj.finalLoss}
- 轨迹采样 (前3步与后3步): ${JSON.stringify(primaryTraj.history?.slice(0, 3))} ... ${JSON.stringify(primaryTraj.history?.slice(-3))}

请提供一份结构化、语言淡雅严谨且极具启发性的诊断报告（使用 Markdown 格式）：
1. **诊断结论与现象分析**：判断是“学习率过大导致飞出山体”、“椭圆谷陡峭壁面剧烈震荡”、“鞍点/平坦区梯度消失”还是“顺利收敛”。
2. **几何与数学机制解释**：结合该地形的 Hessian 矩阵、条件数 (Condition Number $\\kappa$) 或梯度方向进行数学直观原理解释。
3. **针对性调优建议**：给出具体的参数调整方案（如调整 Learning Rate、引入 Momentum、切换 Adam 或二阶 Newton/BFGS 方法）。
4. **实践小贴士**：联系深度学习神经网络训练（如 PyTorch 中的学习率衰减、梯度裁剪、自适应矩估计）的实际经验。`;

    try {
      const resText = await callLLM({
        apiKey: llmConfig.apiKey,
        model: llmConfig.selectedModel,
        systemPrompt,
        userPrompt,
      });

      setReport(resText);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'AI 诊断失败，请检查 API Key 配置。');
    } finally {
      setDiagnoseLoading(false);
    }
  };

  // Handle Q&A Chat Message Send
  const handleSendChatMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || chatInput;
    if (!textToSend || !textToSend.trim()) return;
    if (!ensureApiKey()) return;

    const userMsgText = textToSend.trim();
    if (!customPrompt) setChatInput('');

    const newMsgId = Date.now().toString();
    const userMsg: ChatMessage = {
      id: newMsgId,
      role: 'user',
      content: userMsgText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setChatLoading(true);

    setTimeout(() => {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 50);

    const primaryTraj = trajectories[0] || { algorithm: 'sgd', finalLoss: 0, status: 'running' };

    const systemPrompt = `你是一位大模型教学助手兼最优化理论专家。
【当前实验上下文】
- 损失地形: ${terrain.name} ($f(x,y) = ${terrain.formulaStr}$)
- 当前算法: ${primaryTraj.algorithm?.toUpperCase() || 'SGD'}
- 学习率: α=${config.learningRate}, 动量: β=${config.momentum}
- 轨迹终点 Loss: ${typeof primaryTraj.finalLoss === 'number' ? primaryTraj.finalLoss.toFixed(4) : primaryTraj.finalLoss}

请以极其清晰、通俗易懂且逻辑严谨的方式解答用户的提问，结合具体的数学原理与物理直觉，必要时给出公式与图景想象。`;

    try {
      const historyForLLM = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const replyText = await callLLM({
        apiKey: llmConfig.apiKey,
        model: llmConfig.selectedModel,
        systemPrompt,
        userPrompt: userMsgText,
        history: historyForLLM,
      });

      const assistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: llmConfig.selectedModel === 'gemini-3.6-flash' ? 'Gemini 3.6 Flash' : 'DeepSeek V4 Pro',
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorAssistantMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `❌ 请求失败: ${err.message || '请检查 API Key 或网络状况。'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorAssistantMsg]);
    } finally {
      setChatLoading(false);
      setTimeout(() => {
        chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  };

  const modelDisplayName =
    llmConfig.selectedModel === 'gemini-3.6-flash' ? 'Gemini 3.6 Flash' : 'DeepSeek V4 Pro';

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header Banner with Gear Settings Button */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 rounded-2xl shadow-md border border-slate-800 relative overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 text-xs font-semibold border border-indigo-500/30">
            <Bot className="w-3.5 h-3.5 text-indigo-400" />
            <span>AI 病态诊断与交互对话</span>
          </div>

          {/* Model Status Badge & Gear Gear Settings Button */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 px-3 py-1 rounded-xl bg-slate-800/80 border border-slate-700 text-xs text-slate-200">
              <Cpu className="w-3.5 h-3.5 text-indigo-400" />
              <span className="font-medium text-indigo-200">{modelDisplayName}</span>
              <span className="text-slate-600">|</span>
              {llmConfig.apiKey ? (
                <span className="text-emerald-400 flex items-center gap-1 font-mono text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Key已设置
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1 font-mono text-[11px]">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span> 未设置 Key
                </span>
              )}
            </div>

            <button
              onClick={() => openSettings()}
              className="p-2 rounded-xl bg-indigo-600/80 hover:bg-indigo-500 text-white transition border border-indigo-400/40 shadow-sm flex items-center gap-1.5 text-xs font-medium"
              title="大模型 API-Key 与模型设置"
            >
              <Settings className="w-4 h-4 animate-spin-slow" />
              <span className="hidden sm:inline">模型设置</span>
            </button>
          </div>
        </div>

        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2 text-white">
          AI 智能求解病态诊断与互动问答对话框
        </h1>
        <p className="text-slate-300 text-sm max-w-3xl leading-relaxed">
          提取当前损失地形、算法收敛轨迹与超参数特征，通过 Gemini 3.6 Flash 或 DeepSeek V4 Pro 提供深度诊断，并支持随时与 AI 专家发起自由互动对话问答。
        </p>
      </div>

      {/* Settings Modal Dialog */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 border border-slate-200 dark:border-slate-800 shadow-2xl relative space-y-5">
            <button
              onClick={() => setShowSettingsModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
              <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-400">
                <Settings className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 dark:text-white text-base">
                  大模型配置 (LLM Settings)
                </h3>
                <p className="text-xs text-slate-500">
                  可部署至 GitHub Pages，支持浏览器端直接调用 API
                </p>
              </div>
            </div>

            {settingsNotice && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-amber-800 dark:text-amber-300 text-xs leading-relaxed flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div>{settingsNotice}</div>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
              {/* API Key Input */}
              <div className="space-y-1.5">
                <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5 text-indigo-600" /> 手工输入 API-Key:
                  </span>
                  <span className="text-[10px] text-slate-400 font-normal">保存在本地 localStorage</span>
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    placeholder="例如: AIzaSy... 或 sk-..."
                    value={modalKeyInput}
                    onChange={(e) => setModalKeyInput(e.target.value)}
                    className="w-full px-3 py-2.5 pr-10 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-mono text-xs focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <label className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-indigo-600" /> 选择大模型 (Select Model):
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setModalModelInput('gemini-3.6-flash')}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between space-y-1 ${
                      modalModelInput === 'gemini-3.6-flash'
                        ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/30'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>Gemini 3.6 Flash</span>
                      {modalModelInput === 'gemini-3.6-flash' && (
                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      )}
                    </div>
                    <div className="text-[10px] opacity-75">Google 官方高敏捷推理引擎</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalModelInput('deepseek-v4-pro')}
                    className={`p-3 rounded-xl border text-left transition flex flex-col justify-between space-y-1 ${
                      modalModelInput === 'deepseek-v4-pro'
                        ? 'border-indigo-600 bg-indigo-50/80 dark:bg-indigo-950/60 text-indigo-950 dark:text-indigo-200 ring-2 ring-indigo-500/30'
                        : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="font-bold text-xs flex items-center justify-between">
                      <span>DeepSeek V4 Pro</span>
                      {modalModelInput === 'deepseek-v4-pro' && (
                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                      )}
                    </div>
                    <div className="text-[10px] opacity-75">深度求索专业深度推理引擎</div>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowSettingsModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-200"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-medium hover:bg-indigo-700 shadow-md transition"
                >
                  确认保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Live AI Snapshot Banner Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-1 bg-indigo-900 rounded-2xl p-5 text-white shadow-lg shadow-indigo-200/50 space-y-4">
          <div className="flex items-center space-x-2">
            <span className="text-amber-400 text-xl">⚡</span>
            <h3 className="text-sm font-bold tracking-wide text-white">AI 动态实时诊断</h3>
          </div>
          <div className="space-y-3">
            <div className="bg-white/10 p-3 rounded-xl border border-white/10">
              <div className="text-[10px] text-indigo-300 font-bold uppercase tracking-wider">当前地形瓶颈</div>
              <p className="text-xs mt-1 leading-relaxed text-indigo-50">
                {terrain.conditionNumberDesc
                  ? `检测到 “${terrain.name}” (${terrain.conditionNumberDesc})。`
                  : `当前处于 ${terrain.name}。`}
                {terrain.characteristics[0] ? `${terrain.characteristics[0]}。` : ''}
              </p>
            </div>
            <div className="bg-white/10 p-3 rounded-xl border border-white/10">
              <div className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">超参优化建议</div>
              <p className="text-xs mt-1 leading-relaxed text-indigo-50">
                {config.learningRate > 0.1
                  ? '学习率 α 处于偏高区间，若在深谷中震荡强烈，建议调小 α 至 0.01~0.05。'
                  : '学习率设置相对合理。'}
                {config.momentum < 0.5
                  ? ' 动量 β 较低，在狭长椭圆谷中开启 Momentum (β=0.85~0.9) 可大幅抵消横向震荡。'
                  : ' 动量配置充足。'}
              </p>
            </div>
          </div>
        </div>

        {/* Pathology Preset Triggers */}
        <div className="md:col-span-2 bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
            <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> 一键重现典型病态场景 (Pathology Presets):
            </span>
            <span className="text-xs text-slate-400">点击自动调配超参数</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => onApplyPreset && onApplyPreset('oscillation')}
              className="p-3 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-xl text-left transition space-y-1"
            >
              <div className="font-semibold text-xs text-indigo-900">1. 椭圆狭谷剧烈横跳</div>
              <div className="text-[11px] text-slate-500">SGD 在 0.5x² + 10y² 水槽陡壁剧烈来回震荡</div>
            </button>

            <button
              onClick={() => onApplyPreset && onApplyPreset('explosion')}
              className="p-3 bg-slate-50 hover:bg-rose-50/60 border border-slate-200 hover:border-rose-300 rounded-xl text-left transition space-y-1"
            >
              <div className="font-semibold text-xs text-rose-900">2. 学习率过大爆飞山体</div>
              <div className="text-[11px] text-slate-500">学习率 α=0.55 导致步长不断放大直接飞出曲面</div>
            </button>

            <button
              onClick={() => onApplyPreset && onApplyPreset('saddle')}
              className="p-3 bg-slate-50 hover:bg-amber-50/60 border border-slate-200 hover:border-amber-300 rounded-xl text-left transition space-y-1"
            >
              <div className="font-semibold text-xs text-amber-900">3. 马鞍点梯度消失停滞</div>
              <div className="text-[11px] text-slate-500">无动量 SGD 停滞在 (0,0) 鞍点无法逃逸</div>
            </button>

            <button
              onClick={() => onApplyPreset && onApplyPreset('ideal')}
              className="p-3 bg-slate-50 hover:bg-emerald-50/60 border border-slate-200 hover:border-emerald-300 rounded-xl text-left transition space-y-1"
            >
              <div className="font-semibold text-xs text-emerald-900">4. 理想良态圆碗直达</div>
              <div className="text-[11px] text-slate-500">条件数 = 1 圆碗顺畅笔直降落底端</div>
            </button>
          </div>
        </div>
      </div>

      {/* Main Trigger & AI Report Panel */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div className="space-y-0.5">
            <span className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" /> 当前诊断配置摘要 (Current State Payload)
            </span>
            <p className="text-xs text-slate-600">
              地形: <strong className="text-slate-900">{terrain.name}</strong> • 算法:{' '}
              <strong className="text-indigo-600">{trajectories[0]?.name || 'SGD'}</strong> • 学习率 α={config.learningRate} • 模型: <strong className="text-indigo-600">{modelDisplayName}</strong>
            </p>
          </div>

          <button
            onClick={handleRunDiagnosis}
            disabled={diagnoseLoading}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-md transition flex items-center gap-2 disabled:opacity-50 shrink-0"
          >
            {diagnoseLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" /> {modelDisplayName} 正在分析...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" /> 一键生成 AI 诊断报告
              </>
            )}
          </button>
        </div>

        {/* Error message if any */}
        {errorMsg && (
          <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs font-medium flex items-center justify-between">
            <span>{errorMsg}</span>
            <button
              onClick={() => openSettings()}
              className="underline hover:text-rose-900 font-bold ml-2 shrink-0"
            >
              点击配置 Key
            </button>
          </div>
        )}

        {/* AI Report Markdown View */}
        {report ? (
          <div className="p-6 bg-slate-900 text-slate-100 rounded-xl border border-slate-800 shadow-inner space-y-4 text-xs leading-relaxed overflow-x-auto">
            <div className="flex items-center justify-between text-indigo-400 font-bold text-sm border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" /> {modelDisplayName} 优化诊断报告 (Diagnostic Results):
              </div>
              <span className="text-[11px] font-normal text-slate-400 font-mono">
                Model: {llmConfig.selectedModel}
              </span>
            </div>
            <div className="whitespace-pre-wrap font-sans text-slate-200 leading-relaxed">{report}</div>
          </div>
        ) : (
          !diagnoseLoading && (
            <div className="py-10 flex flex-col items-center justify-center text-center text-slate-400 space-y-2 border-2 border-dashed border-slate-200 rounded-xl">
              <Bot className="w-10 h-10 text-slate-300" />
              <div className="text-xs font-medium text-slate-600">尚未生成 AI 诊断</div>
              <p className="text-[11px] text-slate-400 max-w-sm">
                点击上方“一键生成 AI 诊断报告”按钮，即可调用 {modelDisplayName} 分析当前沙盒中算法的收敛状态与几何病态机制。
              </p>
            </div>
          )
        )}
      </div>

      {/* Interactive LLM Q&A Chat Dialog Box Section (大模型回答问题对话框) */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100">
              <MessageSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm">
                大模型智能问答与互动对话框 ({modelDisplayName})
              </h3>
              <p className="text-[11px] text-slate-500">
                关于当前最优化实验、梯度消失、震荡机制或超参数调优的任何疑惑，随心提问
              </p>
            </div>
          </div>

          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              className="text-xs text-slate-400 hover:text-rose-600 flex items-center gap-1 transition px-2 py-1 rounded hover:bg-rose-50"
              title="清空对话历史"
            >
              <Trash2 className="w-3.5 h-3.5" /> 清空历史
            </button>
          )}
        </div>

        {/* Quick Question Chips */}
        <div className="space-y-1.5">
          <div className="text-[11px] text-slate-500 font-medium flex items-center gap-1">
            <HelpCircle className="w-3 h-3 text-indigo-500" /> 推荐快捷发问 (Quick Prompts):
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleSendChatMessage('为什么在狭长椭圆谷中，普通 SGD 会剧烈横跳而 Adam 或 Momentum 能平滑直达？')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs transition border border-slate-200"
            >
              💡 为什么椭圆谷中 SGD 横跳而 Adam 不会？
            </button>
            <button
              onClick={() => handleSendChatMessage('当学习率 α 过大导致 Loss 变成 NaN 爆飞时，其数学迭代公式中发生了什么？')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs transition border border-slate-200"
            >
              ⚡ 学习率过大爆飞的数学物理机制？
            </button>
            <button
              onClick={() => handleSendChatMessage('在马鞍关隘地形中，为什么 Hessian 矩阵的特征值决定了 SGD 的停滞与逃逸方向？')}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs transition border border-slate-200"
            >
              🏔️ 鞍点关隘处 Hessian 特征值的含义？
            </button>
            <button
              onClick={() => handleSendChatMessage(`针对当前选中的地形 (${terrain.name})，请推荐最适合它的优化算法与最佳超参数搭配！`)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 text-xs transition border border-slate-200"
            >
              🎯 为当前地形推荐最佳算法与超参
            </button>
          </div>
        </div>

        {/* Chat History Messages Scroll Box */}
        <div className="min-h-[220px] max-h-[380px] overflow-y-auto p-4 bg-slate-50 rounded-xl border border-slate-200/80 space-y-4 text-xs">
          {messages.length === 0 ? (
            <div className="h-full py-12 flex flex-col items-center justify-center text-center text-slate-400 space-y-2">
              <Bot className="w-8 h-8 text-slate-300" />
              <div className="text-xs font-medium text-slate-600">向大模型发起自由提问</div>
              <p className="text-[11px] text-slate-400 max-w-sm">
                点击上方推荐问题，或在下方输入框中键入您的疑问，{modelDisplayName} 将结合当前实验参数进行解答。
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-3 ${
                  msg.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.role === 'assistant' && (
                  <div className="p-2 rounded-xl bg-indigo-600 text-white shrink-0 mt-0.5 shadow-sm">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-3 space-y-1 ${
                    msg.role === 'user'
                      ? 'bg-indigo-600 text-white rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-200/90 shadow-sm rounded-tl-none'
                  }`}
                >
                  <div className="flex items-center justify-between gap-4 text-[10px] opacity-75 font-mono border-b border-black/10 dark:border-white/10 pb-1 mb-1">
                    <span>{msg.role === 'user' ? '提问者' : msg.modelUsed || modelDisplayName}</span>
                    <span>{msg.timestamp}</span>
                  </div>
                  <div className="whitespace-pre-wrap leading-relaxed font-sans text-xs">
                    {msg.content}
                  </div>
                </div>

                {msg.role === 'user' && (
                  <div className="p-2 rounded-xl bg-slate-800 text-white shrink-0 mt-0.5 shadow-sm">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))
          )}

          {chatLoading && (
            <div className="flex items-center gap-3 text-indigo-600 text-xs font-medium bg-indigo-50/80 p-3 rounded-xl border border-indigo-100 animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{modelDisplayName} 正在深度思考并撰写回答...</span>
            </div>
          )}

          <div ref={chatBottomRef} />
        </div>

        {/* Chat Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendChatMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder={`向 ${modelDisplayName} 提问关于当前最优化算法的疑惑...`}
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            disabled={chatLoading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 text-xs focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm placeholder:text-slate-400"
          />
          <button
            type="submit"
            disabled={chatLoading || !chatInput.trim()}
            className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs shadow-md transition flex items-center gap-1.5 disabled:opacity-50 shrink-0"
          >
            <Send className="w-3.5 h-3.5" />
            <span>发送</span>
          </button>
        </form>
      </div>
    </div>
  );
};
