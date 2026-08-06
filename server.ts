import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Gemini AI Initialization
  const getAiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables.");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // Generic API Endpoint for AI Chat & Diagnosis (Supports custom API Key & Model selection)
  app.post("/api/ai-chat", async (req, res) => {
    try {
      const { apiKey, model, systemPrompt, userPrompt, history } = req.body;
      const keyToUse = apiKey || process.env.GEMINI_API_KEY;

      if (!keyToUse) {
        return res.status(400).json({
          success: false,
          error: "未检测到 API Key，请先在前端右上角齿轮图标中设置您的 API-Key。",
        });
      }

      if (model === "deepseek-v4-pro") {
        // DeepSeek API integration
        const dsRes = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${keyToUse}`,
          },
          body: JSON.stringify({
            model: "deepseek-v4-pro",
            messages: [
              { role: "system", content: systemPrompt || "你是一位最优化理论与深度学习专家。" },
              ...(history || []).map((h: any) => ({
                role: h.role === "user" ? "user" : "assistant",
                content: h.content,
              })),
              { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
          }),
        });

        if (!dsRes.ok) {
          const errData = await dsRes.json().catch(() => ({}));
          throw new Error(errData.error?.message || `DeepSeek API 错误 HTTP ${dsRes.status}`);
        }

        const data = await dsRes.json();
        const reply = data.choices?.[0]?.message?.content || "DeepSeek 返回为空。";
        return res.json({ success: true, reply });
      } else {
        // Gemini AI integration
        const ai = new GoogleGenAI({
          apiKey: keyToUse,
          httpOptions: {
            headers: { "User-Agent": "aistudio-build" },
          },
        });

        const fullPrompt = `${systemPrompt ? `[系统指令]: ${systemPrompt}\n\n` : ''}${
          history && history.length > 0
            ? `[历史对话]:\n${history.map((h: any) => `${h.role}: ${h.content}`).join('\n')}\n\n`
            : ''
        }[用户提问]: ${userPrompt}`;

        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: fullPrompt,
          config: {
            temperature: 0.7,
          },
        });

        return res.json({
          success: true,
          reply: response.text || "Gemini 诊断回复为空。",
        });
      }
    } catch (error: any) {
      console.error("AI Service Error:", error);
      return res.status(500).json({
        success: false,
        error: error?.message || "AI 服务处理异常，请检查 API Key 配置。",
      });
    }
  });

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Vite middleware for dev / static for prod
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Gradient Lab Server running on http://localhost:${PORT}`);
  });
}

startServer();
