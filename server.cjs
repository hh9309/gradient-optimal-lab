var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  const getAiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in environment variables.");
    }
    return new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  };
  app.post("/api/ai-chat", async (req, res) => {
    try {
      const { apiKey, model, systemPrompt, userPrompt, history } = req.body;
      const keyToUse = apiKey || process.env.GEMINI_API_KEY;
      if (!keyToUse) {
        return res.status(400).json({
          success: false,
          error: "\u672A\u68C0\u6D4B\u5230 API Key\uFF0C\u8BF7\u5148\u5728\u524D\u7AEF\u53F3\u4E0A\u89D2\u9F7F\u8F6E\u56FE\u6807\u4E2D\u8BBE\u7F6E\u60A8\u7684 API-Key\u3002"
        });
      }
      if (model === "deepseek-v4-pro") {
        const dsRes = await fetch("https://api.deepseek.com/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${keyToUse}`
          },
          body: JSON.stringify({
            model: "deepseek-v4-pro",
            messages: [
              { role: "system", content: systemPrompt || "\u4F60\u662F\u4E00\u4F4D\u6700\u4F18\u5316\u7406\u8BBA\u4E0E\u6DF1\u5EA6\u5B66\u4E60\u4E13\u5BB6\u3002" },
              ...(history || []).map((h) => ({
                role: h.role === "user" ? "user" : "assistant",
                content: h.content
              })),
              { role: "user", content: userPrompt }
            ],
            temperature: 0.7
          })
        });
        if (!dsRes.ok) {
          const errData = await dsRes.json().catch(() => ({}));
          throw new Error(errData.error?.message || `DeepSeek API \u9519\u8BEF HTTP ${dsRes.status}`);
        }
        const data = await dsRes.json();
        const reply = data.choices?.[0]?.message?.content || "DeepSeek \u8FD4\u56DE\u4E3A\u7A7A\u3002";
        return res.json({ success: true, reply });
      } else {
        const ai = new import_genai.GoogleGenAI({
          apiKey: keyToUse,
          httpOptions: {
            headers: { "User-Agent": "aistudio-build" }
          }
        });
        const fullPrompt = `${systemPrompt ? `[\u7CFB\u7EDF\u6307\u4EE4]: ${systemPrompt}

` : ""}${history && history.length > 0 ? `[\u5386\u53F2\u5BF9\u8BDD]:
${history.map((h) => `${h.role}: ${h.content}`).join("\n")}

` : ""}[\u7528\u6237\u63D0\u95EE]: ${userPrompt}`;
        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: fullPrompt,
          config: {
            temperature: 0.7
          }
        });
        return res.json({
          success: true,
          reply: response.text || "Gemini \u8BCA\u65AD\u56DE\u590D\u4E3A\u7A7A\u3002"
        });
      }
    } catch (error) {
      console.error("AI Service Error:", error);
      return res.status(500).json({
        success: false,
        error: error?.message || "AI \u670D\u52A1\u5904\u7406\u5F02\u5E38\uFF0C\u8BF7\u68C0\u67E5 API Key \u914D\u7F6E\u3002"
      });
    }
  });
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Gradient Lab Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
