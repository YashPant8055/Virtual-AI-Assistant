import { OpenRouter } from "@openrouter/sdk";

const AI_TIMEOUT_MS = 60000;

const AVAILABLE_MODELS = [
  { id: "openrouter/free", name: "Auto (Best Free)" },
  { id: "meta-llama/llama-3.3-70b-instruct:free", name: "Llama 3.3 70B" },
  { id: "google/gemma-4-26b-a4b-it:free", name: "Gemma 4 26B" },
  { id: "google/gemma-4-31b-it:free", name: "Gemma 4 31B" },
  { id: "qwen/qwen3-next-80b-a3b-instruct:free", name: "Qwen 3 80B" },
  { id: "openai/gpt-oss-120b:free", name: "GPT-OSS 120B" },
  { id: "openai/gpt-oss-20b:free", name: "GPT-OSS 20B" },
  { id: "inclusionai/ring-2.6-1t:free", name: "Ring 2.6" },
  { id: "baidu/cobuddy:free", name: "Baidu Cobuddy" },
  { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free", name: "Nemotron Omni" },
  { id: "poolside/laguna-xs.2:free", name: "Laguna XS" },
  { id: "minimax/minimax-m2.5:free", name: "MiniMax M2.5" },
];

let openrouter;
const getClient = () => {
  if (!openrouter) {
    openrouter = new OpenRouter({
      apiKey: process.env.OPENROUTER_API_KEY || "",
    });
  }
  return openrouter;
};

const geminiResponse = async (
  userMessage,
  {
    maxTokens = 500,
    temperature = 0.15,
    requireJson = true,
    systemPrompt = "You are a helpful virtual voice assistant.",
    model = "openrouter/free",
  } = {}
) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      throw new Error("Server configuration error: OPENROUTER_API_KEY not set");
    }

    const client = getClient();
    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ];

    const stream = await client.chat.send({
      chatRequest: {
        model,
        messages,
        temperature,
        maxTokens,
        stream: true,
        ...(requireJson ? { responseFormat: { type: "json_object" } } : {}),
      },
    }, { timeoutMs: AI_TIMEOUT_MS });

    let response = "";
    let reasoningTokens = 0;

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        response += content;
      }
      if (chunk.usage) {
        reasoningTokens = chunk.usage.reasoningTokens || 0;
      }
    }

    const finalContent = response.trim();

    console.log("OpenRouter success:", { model, reasoningTokens, length: finalContent.length });

    return finalContent;
  } catch (error) {
    console.error("OpenRouter request failed:", { model, message: error.message, status: error.status, stack: error.stack?.split("\n")[0] });
    return "";
  }
};

export default geminiResponse;
export { AVAILABLE_MODELS };