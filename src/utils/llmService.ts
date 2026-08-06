export type LLMModel = 'gemini-3.6-flash' | 'deepseek-v4-pro';

export interface LLMConfig {
  apiKey: string;
  selectedModel: LLMModel;
}

const API_KEY_STORAGE_KEY = 'gradient_lab_llm_api_key';
const MODEL_STORAGE_KEY = 'gradient_lab_llm_model';

export const getStoredLLMConfig = (): LLMConfig => {
  const apiKey = localStorage.getItem(API_KEY_STORAGE_KEY) || '';
  const selectedModel = (localStorage.getItem(MODEL_STORAGE_KEY) as LLMModel) || 'gemini-3.6-flash';
  return { apiKey, selectedModel };
};

export const setStoredLLMConfig = (config: LLMConfig) => {
  localStorage.setItem(API_KEY_STORAGE_KEY, config.apiKey.trim());
  localStorage.setItem(MODEL_STORAGE_KEY, config.selectedModel);
};

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  modelUsed?: string;
}

/**
 * Call LLM for Diagnosis Report or Q&A Chat
 */
export async function callLLM(params: {
  apiKey: string;
  model: LLMModel;
  systemPrompt: string;
  userPrompt: string;
  history?: Array<{ role: 'user' | 'assistant'; content: string }>;
}): Promise<string> {
  const { apiKey, model, systemPrompt, userPrompt, history = [] } = params;

  if (!apiKey || !apiKey.trim()) {
    throw new Error('请先在右上角齿轮设置中输入您的 API-Key！');
  }

  const cleanApiKey = apiKey.trim();

  // 1. Try server backend API proxy first (if server is active)
  try {
    const serverRes = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: cleanApiKey,
        model,
        systemPrompt,
        userPrompt,
        history,
      }),
    });

    if (serverRes.ok) {
      const data = await serverRes.json();
      if (data.success && data.reply) {
        return data.reply;
      }
    }
  } catch (e) {
    // Backend server not available (e.g. running on static GitHub Pages), fall through to direct browser fetch
    console.info('Backend API unavailable, falling back to direct browser fetch.', e);
  }

  // 2. Client-side Direct API Fetch for GitHub Pages Deployment
  if (model === 'gemini-3.6-flash') {
    return callGeminiDirect(cleanApiKey, systemPrompt, userPrompt, history);
  } else {
    return callDeepSeekDirect(cleanApiKey, systemPrompt, userPrompt, history);
  }
}

/**
 * Direct Gemini API call from browser
 */
async function callGeminiDirect(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  // Use gemini-2.5-flash endpoint for Google GenAI v1beta REST API
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  // Build content structure with history
  const contents = [
    {
      role: 'user',
      parts: [{ text: `[系统指令/背景知识]\n${systemPrompt}` }],
    },
    ...history.map((h) => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }],
    })),
    {
      role: 'user',
      parts: [{ text: userPrompt }],
    },
  ];

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      generationConfig: {
        temperature: 0.7,
      },
    }),
  });

  if (!response.ok) {
    const errObj = await response.json().catch(() => ({}));
    const msg = errObj.error?.message || `Gemini API HTTP 错误 ${response.status}`;
    if (response.status === 400 || response.status === 403) {
      throw new Error(`Gemini API Key 无效或权限不足 (${msg})`);
    }
    throw new Error(`Gemini API 错误: ${msg}`);
  }

  const data = await response.json();
  const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!reply) {
    throw new Error('Gemini 返回内容为空，请检查 Prompt 或 API 状态。');
  }

  return reply;
}

/**
 * Direct DeepSeek API call from browser
 */
async function callDeepSeekDirect(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  history: Array<{ role: 'user' | 'assistant'; content: string }>
): Promise<string> {
  const url = 'https://api.deepseek.com/chat/completions';

  const messages = [
    { role: 'system', content: systemPrompt },
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: userPrompt },
  ];

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-v4-pro', // or fallback deepseek-chat
      messages,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const errObj = await response.json().catch(() => ({}));
    const msg = errObj.error?.message || `DeepSeek API HTTP 错误 ${response.status}`;
    if (response.status === 401 || response.status === 403) {
      throw new Error(`DeepSeek API Key 验证失败 (${msg})`);
    }
    throw new Error(`DeepSeek API 错误: ${msg}`);
  }

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content;
  if (!reply) {
    throw new Error('DeepSeek 返回内容为空，请重试。');
  }

  return reply;
}
