/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from "react";
import { FormulaPreset, RunResult, OptimizerConfig, AIInsightResponse } from "../types";
import { Sparkles, AlertOctagon, RefreshCw, BarChart2, Lightbulb, Grid, Settings } from "lucide-react";
import { MathRenderer } from "./MathRenderer";

interface AiInsightsPanelProps {
  preset: FormulaPreset;
  config: OptimizerConfig;
  activeResult: RunResult | null;
  allResults: RunResult[];
}

export function AiInsightsPanel({
  preset,
  config,
  activeResult,
  allResults
}: AiInsightsPanelProps) {
  const [aiResponse, setAiResponse] = useState<AIInsightResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [saveStat, setSaveStat] = useState("");

  const [chatInput, setChatInput] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "user" | "assistant"; content: string }[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState("");

  const [llmProvider, setLlmProvider] = useState<"gemini" | "deepseek">(() => {
    return (localStorage.getItem("ai_insight_provider") as "gemini" | "deepseek") || "gemini";
  });
  const [llmModel, setLlmModel] = useState<string>(() => {
    return localStorage.getItem("ai_insight_model") || "gemini-2.5-flash";
  });
  const [customBaseUrl, setCustomBaseUrl] = useState<string>(() => {
    return localStorage.getItem("ai_insight_base_url") || "";
  });
  const [savedApiKey, setSavedApiKey] = useState<string>(() => {
    return localStorage.getItem("ai_insight_key") || "";
  });

  const getConfiguredApiKey = () => {
    return localStorage.getItem("ai_insight_key") || "";
  };

  const triggerSaveStat = (msg: string) => {
    setSaveStat(msg);
    setTimeout(() => {
      setSaveStat("");
    }, 4000);
  };

  const handleSaveSettings = () => {
    localStorage.setItem("ai_insight_provider", llmProvider);
    localStorage.setItem("ai_insight_model", llmModel);
    localStorage.setItem("ai_insight_base_url", customBaseUrl);
    localStorage.setItem("ai_insight_key", savedApiKey);
    triggerSaveStat("✅ 大模型直连配置已成功保存！");
    setShowSettings(false);
  };

  const handleClearAllSettings = () => {
    localStorage.removeItem("ai_insight_provider");
    localStorage.removeItem("ai_insight_model");
    localStorage.removeItem("ai_insight_base_url");
    localStorage.removeItem("ai_insight_key");
    setLlmProvider("gemini");
    setLlmModel("gemini-2.5-flash");
    setCustomBaseUrl("");
    setSavedApiKey("");
    triggerSaveStat("🗑️ 配置已清除。");
    setShowSettings(false);
  };

  const requestAiAnalysis = async () => {
    if (!activeResult || activeResult.steps.length === 0) return;
    setLoading(true);
    setAiResponse(null);
    setErrorMsg("");
    try {
      const activeKey = getConfiguredApiKey();
      if (!activeKey) {
        throw new Error("请先点击右上角 ⚙️ 齿轮图标，输入并保存您的大模型 API 密钥。");
      }

      // Format metrics summary to feed to the AI model
      const pathSummary = activeResult.steps.slice(0, 50).map((s: any) => 
        `步数:${s.step} | 坐标:(${s.x.toFixed(3)},${s.y.toFixed(3)}) | 损失:${s.loss.toFixed(3)} | 梯度模长:${s.gradNorm.toFixed(3)} | 特征值:[${s.eigenvalues[0].toFixed(3)},${s.eigenvalues[1].toFixed(3)}] | 地形:${s.topography}`
      ).join("\n");

      const runnersSummary = allResults.map((r: any) => 
        `优化器:${r.optimizerName} | 总步数:${r.steps.length} | 是否成功:${r.success} | 是否发散:${r.diverged} | 状态:${r.statusMessage}`
      ).join("\n");

      const systemPrompt = `You are an expert mathematician and a machine learning engineer specializing in multivariable calculus, optimization theory, and gradient descent algorithms (SGD, Momentum, AdaGrad, RMSprop, Adam).
Analyze the user's gradient descent path coordinates, local curvatures (Hessian matrix eigenvalues), and comparative optimizer race statistics.
Identify if any convergence issues exist (divergence, saddle points trapping, pathological canyon oscillation, or slow convergence).
Suggest clear, concrete mathematical recommendations in Simplified Chinese (简体中文).
All answers MUST strictly match the following JSON structure exactly:
{
  "anomalyDetected": boolean (indicating if anomalies like divergence, oscillation, excessive steps, or saddle traps occurred),
  "anomalyType": "divergence" | "saddle_point" | "oscillation" | "slow_convergence" | "none",
  "anomalyMessage": "detailed Chinese warning message if anomaly is detected, else empty",
  "terrainAnalysis": "detailed mathematical analysis of the local curvature conditions, Hessian condition numbers, Canyon steepness, or multi-saddle characteristics",
  "optimizerComparison": [
    {
      "optimizerId": "sgd" | "momentum" | "adagrad" | "rmsprop" | "adam",
      "prosAndCons": "critique of this optimizer's behavior in the current coordinate landscape",
      "efficiencyRank": number (1-5, with 1 being best)
    }
  ],
  "tuningRecommendations": [
    {
      "parameter": "parameter name e.g. '学习率 (Learning Rate)', '势能常数 (Beta 1)'",
      "suggestedValue": "recommended concrete numerical suggestion",
      "reason": "rigorous physical and mathematical backing based on curvature behavior"
    }
  ],
  "curvaturesExplanation": "scholarly yet intuitive explanation of the Hessian eigenvalues spectra at this locus"
}`;

      const prompt = `
=== 用户实验基本配置 ===
数学方程：${preset.name}
初始参数坐标: (${config.initialX}, ${config.initialY})
配置学习率 (Alpha): ${config.learningRate}
最大迭代步数: ${config.maxSteps}

=== 当前优化器 [${activeResult.optimizerName}] 迭代轨迹摘要 ===
总步数: ${activeResult.steps.length}
收敛状态：${activeResult.statusMessage}
轨迹详情 (前 50 步)：
${pathSummary}

=== 多优化器平行赛跑对比 ===
${runnersSummary}

请基于上述真实迭代行为、Hessian 特征值谱以及局部曲率条件评估该地貌，并在 JSON 中给出深度的深度调参洞察和诊断拦截。
`;

      // Direct Client Browser Request!
      let parsedData: AIInsightResponse;
      
      if (llmProvider === "gemini") {
        const baseUrl = customBaseUrl.trim() || "https://generativelanguage.googleapis.com";
        const url = `${baseUrl}/v1beta/models/${llmModel}:generateContent?key=${activeKey}`;
        
        const reqBody = {
          contents: [{ parts: [{ text: `${systemPrompt}\n\n${prompt}` }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                anomalyDetected: { type: "BOOLEAN" },
                anomalyType: { type: "STRING" },
                anomalyMessage: { type: "STRING" },
                terrainAnalysis: { type: "STRING" },
                optimizerComparison: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      optimizerId: { type: "STRING" },
                      prosAndCons: { type: "STRING" },
                      efficiencyRank: { type: "INTEGER" }
                    },
                    required: ["optimizerId", "prosAndCons", "efficiencyRank"]
                  }
                },
                tuningRecommendations: {
                  type: "ARRAY",
                  items: {
                    type: "OBJECT",
                    properties: {
                      parameter: { type: "STRING" },
                      suggestedValue: { type: "STRING" },
                      reason: { type: "STRING" }
                    },
                    required: ["parameter", "suggestedValue", "reason"]
                  }
                },
                curvaturesExplanation: { type: "STRING" }
              },
              required: ["anomalyDetected", "terrainAnalysis", "optimizerComparison", "tuningRecommendations", "curvaturesExplanation"]
            }
          }
        };

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reqBody)
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Gemini API 请求失败 (HTTP ${response.status}): ${errText || "未知错误"}`);
        }

        const geminiRes = await response.json();
        const textResponse = geminiRes.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textResponse) {
          throw new Error("Gemini API 返回了空内容。");
        }
        parsedData = JSON.parse(textResponse);
      } else {
        // DeepSeek Provider (supports reasoning models like deepseek-reasoner which is DeepSeek-R1)
        const baseUrl = customBaseUrl.trim() || "https://api.deepseek.com/v1";
        const url = `${baseUrl}/chat/completions`;
        
        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${activeKey}`
          },
          body: JSON.stringify({
            model: llmModel,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: prompt }
            ],
            temperature: 0.1
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`DeepSeek API 请求失败 (HTTP ${response.status}): ${errText || "未知错误"}`);
        }

        const dsRes = await response.json();
        let content = dsRes.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error("DeepSeek API 返回了空内容。");
        }
        
        // Resilient extraction of JSON from markdown code block
        const markdownMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (markdownMatch) {
          content = markdownMatch[1];
        }
        
        try {
          parsedData = JSON.parse(content.trim());
        } catch (jsonErr) {
          console.error("DeepSeek raw content was:", content);
          throw new Error("无法将 DeepSeek 返回的内容解析为有效 JSON 格式。如使用了 R1 深度思考，请确保响应中包含正确的 JSON 文本结构。");
        }
      }
      
      // Ensure necessary schema keys are present
      if (!parsedData.optimizerComparison || !parsedData.tuningRecommendations || !parsedData.terrainAnalysis) {
        throw new Error("API 返回的数据缺少必要的可视化字段，请重试。");
      }
      
      setAiResponse(parsedData);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "未能成功加载 AI 智能洞察，请检查密钥配置、网络连通性。");
    } finally {
      setLoading(false);
    }
  };

  const handleSendChat = async () => {
    const userText = chatInput.trim();
    if (!userText || chatLoading) return;

    setChatInput("");
    setChatError("");
    setChatLoading(true);

    const updatedHistory = [...chatHistory, { role: "user" as const, content: userText }];
    setChatHistory(updatedHistory);

    try {
      const activeKey = getConfiguredApiKey();
      if (!activeKey) {
        throw new Error("请先点击右上角 ⚙️ 齿轮图标，输入并保存您的大模型 API 密钥。");
      }

      const pathSummary = (activeResult?.steps || []).slice(0, 30).map((s: any) => 
        `步数:${s.step} | (${s.x.toFixed(3)},${s.y.toFixed(3)}) | 损失:${s.loss.toFixed(3)}`
      ).join("\n") || "无迭代轨迹";

      const tuningSummary = aiResponse 
        ? `
[先前的 AI 诊断与调参结论简报]：
- 异常警告：${aiResponse.anomalyDetected ? aiResponse.anomalyMessage : "无异常"}
- 局部地貌：${aiResponse.terrainAnalysis}
- 算法推荐参数：${aiResponse.tuningRecommendations.map(r => `${r.parameter}: ${r.suggestedValue} (${r.reason})`).join(", ")}
` 
        : "";

      const systemPrompt = `You are an expert mathematician and a machine learning engineer specializing in multivariable calculus, optimization theory, and gradient descent algorithms (SGD, Momentum, AdaGrad, RMSprop, Adam).
You are discussing the user's optimization and calculus experiment inside a visual plotting simulator.
Mathematical Surface Equation: ${preset.name}
Optimizer Configs: Init=(${config.initialX}, ${config.initialY}), Learning Rate=${config.learningRate}, Max Steps=${config.maxSteps}
Active Optimizer Trajectory: ${activeResult?.optimizerName || "None"}
Steps Count: ${activeResult?.steps.length || 0}
Convergence Status: ${activeResult?.statusMessage || "N/A"}
Sample coordinates sequence:
${pathSummary}
${tuningSummary}

Answer the user's specific mathematical question or suggestion clearly, rigorously, and directly in Simplified Chinese (简体中文). Keep your answer professional, academic yet intuitive, concise, and related to optimization or multivariable derivatives. Do NOT output JSON! Just return raw markdown/text.`;

      if (llmProvider === "gemini") {
        const baseUrl = customBaseUrl.trim() || "https://generativelanguage.googleapis.com";
        const url = `${baseUrl}/v1beta/models/${llmModel}:generateContent?key=${activeKey}`;

        const historyText = updatedHistory.map(msg => 
          msg.role === "user" ? `User: ${msg.content}` : `Assistant: ${msg.content}`
        ).join("\n");

        const promptText = `${systemPrompt}\n\n[对话记录与当前追问]\n${historyText}\n\nAssistant (解答)：`;

        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              temperature: 0.2
            }
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Gemini API 请求失败 (HTTP ${response.status}): ${errText || "未知错误"}`);
        }

        const geminiRes = await response.json();
        const textResponse = geminiRes.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!textResponse) {
          throw new Error("Gemini API 返回了空解答。");
        }

        setChatHistory([...updatedHistory, { role: "assistant" as const, content: textResponse }]);
      } else {
        const baseUrl = customBaseUrl.trim() || "https://api.deepseek.com/v1";
        const url = `${baseUrl}/chat/completions`;

        const messages = [
          { role: "system", content: systemPrompt },
          ...updatedHistory.map(msg => ({
            role: msg.role === "user" ? "user" : "assistant",
            content: msg.content
          }))
        ];

        const response = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${activeKey}`
          },
          body: JSON.stringify({
            model: llmModel,
            messages: messages,
            temperature: 0.2
          })
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`DeepSeek API 请求失败 (HTTP ${response.status}): ${errText || "未知错误"}`);
        }

        const dsRes = await response.json();
        const content = dsRes.choices?.[0]?.message?.content;
        if (!content) {
          throw new Error("DeepSeek API 返回了空解答。");
        }

        setChatHistory([...updatedHistory, { role: "assistant" as const, content: content }]);
      }
    } catch (err: any) {
      console.error(err);
      setChatError(err.message || "解答出错，请检查配置或重试。");
    } finally {
      setChatLoading(false);
    }
  };

  // Immediate local checks to trigger a front-end alert popup if needed (Anomaly Intercept)
  const getLocalAnomalyWarning = () => {
    if (!activeResult) return null;
    if (activeResult.diverged) {
      return {
        type: "发散溢出 (Divergence)",
        msg: "警告！当且坐标梯度爆炸或步长更新过大。参数已溢出安全网。建议降低学习率（Learning Rate）或切换为带自适应步长的 RMSprop/Adam 优化器。",
        color: "bg-rose-50 border-rose-100 text-rose-800"
      };
    }
    if (activeResult.stuck) {
      return {
        type: "鞍点受困 (Saddle Trap)",
        msg: "警告！当前一阶梯度下降停滞，但 Hessian 矩阵特征值显示相反符号。您已受困于马鞍形的脊鞍点。传统 SGD 一步也动弹不得，建议引入惯性动量（如 Momentum）或自适应变步长的 Adam 跨越该简并障碍。",
        color: "bg-amber-50 border-amber-100 text-amber-800"
      };
    }
    return null;
  };

  const localAnomaly = getLocalAnomalyWarning();

  const isDirectMode = !!getConfiguredApiKey();
  const currentModelLabel = isDirectMode
    ? llmProvider === "gemini"
      ? `Gemini (${llmModel === "gemini-2.5-flash" ? "2.5 Flash" : llmModel})`
      : `DeepSeek (${llmModel === "deepseek-reasoner" ? "R1" : "V3"})`
    : "未检测到 API 密钥";

  return (
    <div className="glass-card bg-white/90 p-5 flex flex-col h-full" id="ai_insights_card">
      {/* Module Title */}
      <div className="flex items-center justify-between gap-3 mb-4 pb-3 border-b border-slate-100 shrink-0">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-5 h-5 text-indigo-500 fill-indigo-100 animate-pulse" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-widest font-display">
            AI 洞察助手 / Insights
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors ${
            isDirectMode 
              ? "bg-emerald-50 text-emerald-600 border-emerald-100/70" 
              : "bg-rose-50 text-rose-500 border-rose-100/70"
          }`}>
            {currentModelLabel}
          </span>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-1.5 rounded-lg border transition-all ${
              showSettings 
                ? "bg-indigo-50 border-indigo-200 text-indigo-600" 
                : "bg-white border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50"
            }`}
            title="配制大模型 / Configure LLM"
          >
            <Settings className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Save Success Status Indicator */}
      {saveStat && (
        <div className="mb-4 p-2.5 text-center text-xs font-semibold bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-lg animate-fade-in shrink-0">
          {saveStat}
        </div>
      )}

      {/* LLM Configuration Popover Settings Panel */}
      {showSettings && (
        <div className="mb-4 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3 shadow-inner shrink-0 text-xs">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-700">大模型配置 / LLM Settings</h4>
            <button 
              onClick={() => setShowSettings(false)}
              className="text-[10px] text-slate-400 hover:text-slate-600 underline font-semibold font-mono"
            >
              CLOSE
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Model Provider selection */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">大模型渠道 (Provider)</label>
              <select
                value={llmProvider}
                onChange={(e) => {
                  const p = e.target.value as "gemini" | "deepseek";
                  setLlmProvider(p);
                  setLlmModel(p === "gemini" ? "gemini-2.5-flash" : "deepseek-reasoner");
                  setCustomBaseUrl(p === "deepseek" ? "https://api.deepseek.com/v1" : "");
                }}
                className="w-full text-xs p-2 bg-white border border-slate-200 rounded-md outline-none focus:border-indigo-500 cursor-pointer text-slate-700 font-medium"
              >
                <option value="gemini">Google Gemini</option>
                <option value="deepseek">DeepSeek (R1 / V3)</option>
              </select>
            </div>

            {/* Model identifier selection */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">精选模型 (Model)</label>
              {llmProvider === "gemini" ? (
                <select
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-md outline-none focus:border-indigo-500 cursor-pointer text-slate-700 font-medium"
                >
                  <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  <option value="gemini-2.5-pro">Gemini 2.5 Pro (逻辑更强)</option>
                </select>
              ) : (
                <select
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-200 rounded-md outline-none focus:border-indigo-500 cursor-pointer text-slate-700 font-medium"
                >
                  <option value="deepseek-reasoner">DeepSeek R1 (深度思考版)</option>
                  <option value="deepseek-chat">DeepSeek V3 (通用版)</option>
                </select>
              )}
            </div>
          </div>

          {/* Custom base URL (especially important for proxying API keys to deepseek or gemini) */}
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">自定义 API Base URL (可选)</label>
              <span className="text-[9px] text-slate-400 font-medium">默认使用官方标准端点</span>
            </div>
            <input
              type="text"
              value={customBaseUrl}
              onChange={(e) => setCustomBaseUrl(e.target.value)}
              placeholder={llmProvider === "gemini" ? "https://generativelanguage.googleapis.com" : "https://api.deepseek.com/v1"}
              className="w-full text-xs p-2 bg-white border border-slate-200 rounded-md outline-none font-mono focus:border-indigo-500"
            />
          </div>

          {/* API key field */}
          <div className="space-y-1 font-sans">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              输入 API Key <span className="text-rose-500 font-bold">*</span>
            </label>
            <div className="relative">
              <input
                type="password"
                value={savedApiKey}
                onChange={(e) => setSavedApiKey(e.target.value)}
                placeholder={isDirectMode ? "••••••••••••••••••••••••••••••••" : "粘贴或键盘键入您的 API Key..."}
                className="w-full text-xs p-2 pr-12 bg-white border border-slate-200 rounded-md outline-none font-mono focus:border-indigo-500"
              />
              {savedApiKey && (
                <button
                  type="button"
                  onClick={() => setSavedApiKey("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-rose-500 hover:text-rose-700 font-bold uppercase tracking-wider"
                >
                  CLEAR
                </button>
              )}
            </div>
            <p className="text-[9px] text-slate-400 leading-normal">
              密钥将保存于您本地浏览器 (LocalStorage) 中，纯静态前端直连 API 避免服务器转交。
            </p>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={handleSaveSettings}
              disabled={!savedApiKey}
              className="px-3.5 py-1.5 bg-indigo-600 font-bold text-[10px] uppercase tracking-wider text-white rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              保存并应用 / Apply
            </button>
            {isDirectMode && (
              <button
                onClick={handleClearAllSettings}
                className="px-3.5 py-1.5 bg-slate-200 text-slate-600 font-bold text-[10px] uppercase tracking-wider rounded-md hover:bg-slate-300 transition-colors"
              >
                清除保存 / Clear
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. Anomaly Interceptor Warnings (Client side / instant evaluation) */}
      {localAnomaly && (
        <div className={`p-4 rounded-xl border mb-4 flex items-start gap-3 shadow-xs shrink-0 ${localAnomaly.color}`}>
          <AlertOctagon className="w-5 h-5 shrink-0 animate-bounce text-rose-600 mt-0.5" />
          <div className="text-xs space-y-1">
            <h4 className="font-bold flex items-center gap-1.5 uppercase font-mono tracking-wide">
              自动异常拦截报警: {localAnomaly.type}
            </h4>
            <p className="leading-relaxed leading-medium">{localAnomaly.msg}</p>
          </div>
        </div>
      )}

      {/* Loader */}
      {loading && (
        <div className="p-8 flex flex-col items-center justify-center text-center gap-3 bg-slate-50 border border-dashed border-slate-200 rounded-xl my-4 shrink-0">
          <RefreshCw className="w-8 h-8 text-indigo-500 animate-spin" />
          <div className="space-y-1.5">
            <p className="text-xs font-semibold text-slate-700">正在传输微分流并求解流形...</p>
            <p className="text-[10px] text-slate-400 italic font-mono max-w-sm">
              {llmProvider === "gemini" ? "Gemini" : "DeepSeek"} 正在分析优化轨迹、局部曲率特征谱，并根据多优化器竞争表现输出调参公式。
            </p>
          </div>
        </div>
      )}

      {/* Errors */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-lg my-3 flex items-center gap-2 shrink-0">
          <AlertOctagon className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Core Content Wrapper (Scrollable area) */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 min-h-[140px] max-h-[380px] lg:max-h-[480px] scrollbar-thin">
        {/* Standard non-loaded prompt screen */}
        {!aiResponse && !loading && (
          <div className="p-5 bg-gradient-to-br from-indigo-50/20 to-slate-50/50 rounded-xl border border-slate-100 text-center flex flex-col items-center justify-center min-h-[150px]">
            <Sparkles className="w-6 h-6 text-indigo-400 mb-1.5 animate-pulse" />
            <p className="text-xs font-bold text-slate-700">待计算高阶分析地貌报告</p>
            <p className="text-[11px] text-slate-400 mt-1 max-w-xs leading-relaxed">
              点击下方一键计算，提取所有优化轨线的局部 Hessian 曲率模长与五路算法对比评价。
            </p>

            <button
              onClick={requestAiAnalysis}
              disabled={!activeResult || activeResult.steps.length === 0}
              className="mt-4 px-4 py-1.5 bg-indigo-600 font-bold text-[11px] text-white rounded-lg shadow-sm hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 fill-white" />
              一键计算 AI 深度曲率报告
            </button>
          </div>
        )}

        {/* AI response details content */}
        {aiResponse && !loading && (
          <div className="space-y-4 text-xs font-medium text-slate-700">
            {/* Anomaly diagnostic pop alarm inside AI response */}
            {aiResponse.anomalyDetected && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-900 flex gap-2">
                <AlertOctagon className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">AI 异常诊断：</span>
                  <span>{aiResponse.anomalyMessage || "发现梯度下降不稳定现象，强烈推荐根据下方调参参数进行衰减控制。"}</span>
                </div>
              </div>
            )}

            {/* Curvatures Explanation */}
            <div className="bg-gradient-to-br from-indigo-50/40 to-violet-50/40 p-4 rounded-xl border border-indigo-100 text-indigo-950">
              <span className="text-[10px] text-indigo-500 font-bold uppercase tracking-wider block mb-1">
                Hessian 局部曲率学原理解析:
              </span>
              <p className="leading-relaxed font-normal">
                <MathRenderer text={aiResponse.curvaturesExplanation} />
              </p>
            </div>

            {/* Terrain analysis */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-150">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                求解域流形地貌学评估 (Terrain Manifold Analysis):
              </span>
              <p className="leading-relaxed font-normal text-slate-700">
                <MathRenderer text={aiResponse.terrainAnalysis} />
              </p>
            </div>

            {/* Smart Tuning recommendations */}
            <div className="space-y-2">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Lightbulb className="w-4.5 h-4.5 text-amber-500" />
                智能自动调参公式建议 (Smart Parameters Recommendations)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {aiResponse.tuningRecommendations.map((rec, idx) => (
                  <div key={idx} className="p-3 bg-white border border-slate-150 rounded-lg shadow-2xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{rec.parameter}</span>
                      <span className="px-2 py-0.5 rounded bg-emerald-50 text-[10px] font-mono text-emerald-700 border border-emerald-100">
                        {rec.suggestedValue}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 leading-relaxed font-normal">
                      <MathRenderer text={rec.reason} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Comparative optimizer races ranks */}
            <div className="space-y-2.5">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <BarChart2 className="w-4.5 h-4.5 text-indigo-500" />
                多优化器赛跑姿态审查 (Optimizers Comparative Critique)
              </span>
              <div className="divide-y divide-slate-100 bg-white border border-slate-150 rounded-xl overflow-hidden">
                {aiResponse.optimizerComparison
                  .sort((a, b) => a.efficiencyRank - b.efficiencyRank)
                  .map((comp) => {
                    const optLabels: { [key: string]: string } = {
                      sgd: "纯一阶 SGD",
                      momentum: "惯性 Momentum",
                      adagrad: "自适应 AdaGrad",
                      rmsprop: "分阶均值 RMSprop",
                      adam: "双矩估计 Adam"
                    };
                    return (
                      <div key={comp.optimizerId} className="p-3 flex items-start gap-3.5 hover:bg-slate-50/50">
                        {/* Rank indicator badge */}
                        <span className="w-5 h-5 shrink-0 rounded-full font-bold font-mono text-xs flex items-center justify-center bg-indigo-50 text-indigo-700">
                          {comp.efficiencyRank}
                        </span>
                        <div className="space-y-1">
                          <span className="font-bold text-slate-800 uppercase text-[11px]">
                            {optLabels[comp.optimizerId] || comp.optimizerId.toUpperCase()}
                          </span>
                          <div className="text-[11px] text-slate-500 font-normal leading-relaxed">
                            <MathRenderer text={comp.prosAndCons} />
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>

            {/* Re-poll trigger button */}
            <div className="pt-2">
              <button
                onClick={requestAiAnalysis}
                className="w-full py-2 bg-slate-50 hover:bg-slate-100 rounded-lg text-slate-600 font-semibold border border-slate-200 transition-colors flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                重新计算并刷新分析报告
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 💬 对话研讨与高级追问系列 - Persistent at the bottom of the card, initially displayed from the start */}
      <div className="mt-4 border-t border-slate-100 pt-4 space-y-3 shrink-0" id="ai_insights_chat_section">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
            <span className="text-[11px] text-indigo-950 font-bold uppercase tracking-wider block">
              💬 问答与学术追问 / Academic Q&A Conversation
            </span>
          </div>
          {chatHistory.length > 0 && (
            <button
              type="button"
              onClick={() => setChatHistory([])}
              className="text-[10px] text-slate-400 hover:text-rose-500 transition-colors font-medium underline cursor-pointer"
            >
              清空记录 / Clear
            </button>
          )}
        </div>

        {/* Chat History Container */}
        <div className="max-h-[180px] overflow-y-auto space-y-2.5 p-3.5 bg-slate-50/80 border border-slate-150 rounded-xl scrollbar-thin flex flex-col">
          {chatHistory.length === 0 ? (
            <p className="text-[11px] text-slate-400 text-center py-4 italic leading-relaxed">
              您可以在下方直接向 <span className="font-bold font-mono text-indigo-600">{llmProvider === "gemini" ? "Gemini" : "DeepSeek"}</span> 追问关于当前二次型 Hessian 局部阵、鞍点指数分布或算法超参数对当前迭代的影响。
            </p>
          ) : (
            chatHistory.map((msg, idx) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={idx}
                  className={`flex flex-col gap-1 p-3 rounded-lg max-w-[90%] text-xs border ${
                    isUser
                      ? "bg-indigo-50/70 border-indigo-100/50 text-indigo-950 self-end ml-auto"
                      : llmProvider === "gemini"
                        ? "bg-violet-50/60 border-violet-150 text-violet-950 mr-auto"
                        : "bg-teal-50/60 border-teal-150 text-teal-950 mr-auto"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-bold text-[10px] uppercase font-mono tracking-wide mb-0.5">
                    {isUser ? (
                      <span className="text-indigo-600">👤 您 (User)</span>
                    ) : llmProvider === "gemini" ? (
                      <span className="text-violet-600">🤖 Gemini 智能助手</span>
                    ) : (
                      <span className="text-teal-600">🤖 DeepSeek 智能副驾</span>
                    )}
                  </div>
                  <div className="leading-relaxed whitespace-pre-wrap font-normal text-slate-700">
                    <MathRenderer text={msg.content} />
                  </div>
                </div>
              );
            })
          )}

          {/* Chat Loader */}
          {chatLoading && (
            <div className={`p-3 rounded-lg mr-auto text-xs border max-w-[90%] animate-pulse ${
              llmProvider === "gemini"
                ? "bg-violet-50/60 border-violet-150 text-violet-950"
                : "bg-teal-50/60 border-teal-150 text-teal-950"
            }`}>
              <p className="font-bold text-[10px] text-slate-500 font-mono">
                ⏳ {llmProvider === "gemini" ? "Gemini" : "DeepSeek"} 正在思考并推演中...
              </p>
              <span className="text-slate-400">正在分析最新追问，请稍候...</span>
            </div>
          )}

          {chatError && (
            <div className="p-2.5 border border-rose-100 bg-rose-50 text-rose-800 text-[11px] rounded-lg mt-2 font-normal leading-normal">
              🚨 {chatError}
            </div>
          )}
        </div>

        {/* Chat Input Box */}
        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendChat();
              }
            }}
            disabled={chatLoading}
            placeholder={`向 ${llmProvider === "gemini" ? "Gemini" : "DeepSeek"} 发送您的高级追问问题...`}
            className="flex-1 text-xs p-2.5 bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-500 disabled:opacity-50"
          />
          <button
            type="button"
            onClick={handleSendChat}
            disabled={chatLoading || !chatInput.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs rounded-lg transition-colors shadow-xs disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          >
            发送
          </button>
        </div>
      </div>
    </div>
  );
}
