/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize GoogleGenAI lazily
let aiInstance: GoogleGenAI | null = null;
function getGenAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured on the server.");
    }
    aiInstance = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiInstance;
}

// AI Insights endpoint
app.post("/api/ai-insights", async (req, res) => {
  try {
    const { formulaName, config, activeResult, allResults } = req.body;

    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY environment variable is not configured on the server."
      });
    }

    const ai = getGenAI();

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
All answers MUST strictly match the provided response JSON schema.`;

    const prompt = `
=== 用户实验基本配置 ===
数学方程：${formulaName}
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

    // Query Gemini 3.5 Flash with structured schema
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            anomalyDetected: {
              type: Type.BOOLEAN,
              description: "是否阻断/检测到异常行为（如发散、震荡、极度缓慢、鞍点受困）"
            },
            anomalyType: {
              type: Type.STRING,
              description: "异常类型，可以是 divergence, saddle_point, oscillation, slow_convergence, 或者是 none"
            },
            anomalyMessage: {
              type: Type.STRING,
              description: "针对异常拦截的中文预警报警信息"
            },
            terrainAnalysis: {
              type: Type.STRING,
              description: "针对该求解点及极值附近地形的高阶学术剖析（例如 Hessian 病态条件、峡谷陡峭程度、鞍点分布）"
            },
            optimizerComparison: {
              type: Type.ARRAY,
              description: "多优化器多路赛跑特征比较",
              items: {
                type: Type.OBJECT,
                properties: {
                  optimizerId: { type: Type.STRING, description: "优化器ID：sgd, momentum, adagrad, rmsprop, adam" },
                  prosAndCons: { type: Type.STRING, description: "该优化器在此地形下的优缺点与求导轨迹风格" },
                  efficiencyRank: { type: Type.INTEGER, description: "效率排名 (从1到5，1为最高效最稳定)" }
                },
                required: ["optimizerId", "prosAndCons", "efficiencyRank"]
              }
            },
            tuningRecommendations: {
              type: Type.ARRAY,
              description: "AI智能自动调参推荐策略",
              items: {
                type: Type.OBJECT,
                properties: {
                  parameter: { type: Type.STRING, description: "待调参数，例如 '学习率 (Learning Rate)', '权重衰减 (Weight Decay)', '初始点选址'" },
                  suggestedValue: { type: Type.STRING, description: "智能推荐设定的参数取值建议" },
                  reason: { type: Type.STRING, description: "为什么这样调整，结合曲线局部特征的科学论据" }
                },
                required: ["parameter", "suggestedValue", "reason"]
              }
            },
            curvaturesExplanation: {
              type: Type.STRING,
              description: "关于 Hessian 矩阵特征值谱在此点含义的学术易懂解释（为何代表平坦、局域洼地或两端受拉的马鞍）"
            }
          },
          required: [
            "anomalyDetected",
            "terrainAnalysis",
            "optimizerComparison",
            "tuningRecommendations",
            "curvaturesExplanation"
          ]
        }
      }
    });

    const textOutput = response.text || "{}";
    res.setHeader("Content-Type", "application/json");
    res.send(textOutput);
  } catch (error: any) {
    console.error("Gemini API Error in proxy server:", error);
    res.status(500).json({
      error: "服务器处理 AI 洞察时发生故障",
      details: error.message || error,
    });
  }
});

// Integrate Vite middleware in development
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Gradient optimization server running on port ${PORT}`);
  });
}

setupServer();
