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
var import_genai = require("@google/genai");
var import_dotenv = __toESM(require("dotenv"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "10mb" }));
var aiInstance = null;
function getGenAI() {
  if (!aiInstance) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not configured on the server.");
    }
    aiInstance = new import_genai.GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });
  }
  return aiInstance;
}
app.post("/api/ai-insights", async (req, res) => {
  try {
    const { formulaName, config, activeResult, allResults } = req.body;
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        error: "GEMINI_API_KEY environment variable is not configured on the server."
      });
    }
    const ai = getGenAI();
    const pathSummary = activeResult.steps.slice(0, 50).map(
      (s) => `\u6B65\u6570:${s.step} | \u5750\u6807:(${s.x.toFixed(3)},${s.y.toFixed(3)}) | \u635F\u5931:${s.loss.toFixed(3)} | \u68AF\u5EA6\u6A21\u957F:${s.gradNorm.toFixed(3)} | \u7279\u5F81\u503C:[${s.eigenvalues[0].toFixed(3)},${s.eigenvalues[1].toFixed(3)}] | \u5730\u5F62:${s.topography}`
    ).join("\n");
    const runnersSummary = allResults.map(
      (r) => `\u4F18\u5316\u5668:${r.optimizerName} | \u603B\u6B65\u6570:${r.steps.length} | \u662F\u5426\u6210\u529F:${r.success} | \u662F\u5426\u53D1\u6563:${r.diverged} | \u72B6\u6001:${r.statusMessage}`
    ).join("\n");
    const systemPrompt = `You are an expert mathematician and a machine learning engineer specializing in multivariable calculus, optimization theory, and gradient descent algorithms (SGD, Momentum, AdaGrad, RMSprop, Adam).
Analyze the user's gradient descent path coordinates, local curvatures (Hessian matrix eigenvalues), and comparative optimizer race statistics.
Identify if any convergence issues exist (divergence, saddle points trapping, pathological canyon oscillation, or slow convergence).
Suggest clear, concrete mathematical recommendations in Simplified Chinese (\u7B80\u4F53\u4E2D\u6587).
All answers MUST strictly match the provided response JSON schema.`;
    const prompt = `
=== \u7528\u6237\u5B9E\u9A8C\u57FA\u672C\u914D\u7F6E ===
\u6570\u5B66\u65B9\u7A0B\uFF1A${formulaName}
\u521D\u59CB\u53C2\u6570\u5750\u6807: (${config.initialX}, ${config.initialY})
\u914D\u7F6E\u5B66\u4E60\u7387 (Alpha): ${config.learningRate}
\u6700\u5927\u8FED\u4EE3\u6B65\u6570: ${config.maxSteps}

=== \u5F53\u524D\u4F18\u5316\u5668 [${activeResult.optimizerName}] \u8FED\u4EE3\u8F68\u8FF9\u6458\u8981 ===
\u603B\u6B65\u6570: ${activeResult.steps.length}
\u6536\u655B\u72B6\u6001\uFF1A${activeResult.statusMessage}
\u8F68\u8FF9\u8BE6\u60C5 (\u524D 50 \u6B65)\uFF1A
${pathSummary}

=== \u591A\u4F18\u5316\u5668\u5E73\u884C\u8D5B\u8DD1\u5BF9\u6BD4 ===
${runnersSummary}

\u8BF7\u57FA\u4E8E\u4E0A\u8FF0\u771F\u5B9E\u8FED\u4EE3\u884C\u4E3A\u3001Hessian \u7279\u5F81\u503C\u8C31\u4EE5\u53CA\u5C40\u90E8\u66F2\u7387\u6761\u4EF6\u8BC4\u4F30\u8BE5\u5730\u8C8C\uFF0C\u5E76\u5728 JSON \u4E2D\u7ED9\u51FA\u6DF1\u5EA6\u7684\u6DF1\u5EA6\u8C03\u53C2\u6D1E\u5BDF\u548C\u8BCA\u65AD\u62E6\u622A\u3002
`;
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            anomalyDetected: {
              type: import_genai.Type.BOOLEAN,
              description: "\u662F\u5426\u963B\u65AD/\u68C0\u6D4B\u5230\u5F02\u5E38\u884C\u4E3A\uFF08\u5982\u53D1\u6563\u3001\u9707\u8361\u3001\u6781\u5EA6\u7F13\u6162\u3001\u978D\u70B9\u53D7\u56F0\uFF09"
            },
            anomalyType: {
              type: import_genai.Type.STRING,
              description: "\u5F02\u5E38\u7C7B\u578B\uFF0C\u53EF\u4EE5\u662F divergence, saddle_point, oscillation, slow_convergence, \u6216\u8005\u662F none"
            },
            anomalyMessage: {
              type: import_genai.Type.STRING,
              description: "\u9488\u5BF9\u5F02\u5E38\u62E6\u622A\u7684\u4E2D\u6587\u9884\u8B66\u62A5\u8B66\u4FE1\u606F"
            },
            terrainAnalysis: {
              type: import_genai.Type.STRING,
              description: "\u9488\u5BF9\u8BE5\u6C42\u89E3\u70B9\u53CA\u6781\u503C\u9644\u8FD1\u5730\u5F62\u7684\u9AD8\u9636\u5B66\u672F\u5256\u6790\uFF08\u4F8B\u5982 Hessian \u75C5\u6001\u6761\u4EF6\u3001\u5CE1\u8C37\u9661\u5CED\u7A0B\u5EA6\u3001\u978D\u70B9\u5206\u5E03\uFF09"
            },
            optimizerComparison: {
              type: import_genai.Type.ARRAY,
              description: "\u591A\u4F18\u5316\u5668\u591A\u8DEF\u8D5B\u8DD1\u7279\u5F81\u6BD4\u8F83",
              items: {
                type: import_genai.Type.OBJECT,
                properties: {
                  optimizerId: { type: import_genai.Type.STRING, description: "\u4F18\u5316\u5668ID\uFF1Asgd, momentum, adagrad, rmsprop, adam" },
                  prosAndCons: { type: import_genai.Type.STRING, description: "\u8BE5\u4F18\u5316\u5668\u5728\u6B64\u5730\u5F62\u4E0B\u7684\u4F18\u7F3A\u70B9\u4E0E\u6C42\u5BFC\u8F68\u8FF9\u98CE\u683C" },
                  efficiencyRank: { type: import_genai.Type.INTEGER, description: "\u6548\u7387\u6392\u540D (\u4ECE1\u52305\uFF0C1\u4E3A\u6700\u9AD8\u6548\u6700\u7A33\u5B9A)" }
                },
                required: ["optimizerId", "prosAndCons", "efficiencyRank"]
              }
            },
            tuningRecommendations: {
              type: import_genai.Type.ARRAY,
              description: "AI\u667A\u80FD\u81EA\u52A8\u8C03\u53C2\u63A8\u8350\u7B56\u7565",
              items: {
                type: import_genai.Type.OBJECT,
                properties: {
                  parameter: { type: import_genai.Type.STRING, description: "\u5F85\u8C03\u53C2\u6570\uFF0C\u4F8B\u5982 '\u5B66\u4E60\u7387 (Learning Rate)', '\u6743\u91CD\u8870\u51CF (Weight Decay)', '\u521D\u59CB\u70B9\u9009\u5740'" },
                  suggestedValue: { type: import_genai.Type.STRING, description: "\u667A\u80FD\u63A8\u8350\u8BBE\u5B9A\u7684\u53C2\u6570\u53D6\u503C\u5EFA\u8BAE" },
                  reason: { type: import_genai.Type.STRING, description: "\u4E3A\u4EC0\u4E48\u8FD9\u6837\u8C03\u6574\uFF0C\u7ED3\u5408\u66F2\u7EBF\u5C40\u90E8\u7279\u5F81\u7684\u79D1\u5B66\u8BBA\u636E" }
                },
                required: ["parameter", "suggestedValue", "reason"]
              }
            },
            curvaturesExplanation: {
              type: import_genai.Type.STRING,
              description: "\u5173\u4E8E Hessian \u77E9\u9635\u7279\u5F81\u503C\u8C31\u5728\u6B64\u70B9\u542B\u4E49\u7684\u5B66\u672F\u6613\u61C2\u89E3\u91CA\uFF08\u4E3A\u4F55\u4EE3\u8868\u5E73\u5766\u3001\u5C40\u57DF\u6D3C\u5730\u6216\u4E24\u7AEF\u53D7\u62C9\u7684\u9A6C\u978D\uFF09"
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
  } catch (error) {
    console.error("Gemini API Error in proxy server:", error);
    res.status(500).json({
      error: "\u670D\u52A1\u5668\u5904\u7406 AI \u6D1E\u5BDF\u65F6\u53D1\u751F\u6545\u969C",
      details: error.message || error
    });
  }
});
async function setupServer() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Gradient optimization server running on port ${PORT}`);
  });
}
setupServer();
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
//# sourceMappingURL=server.cjs.map
