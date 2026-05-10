import moment from "moment";
import geminiResponse from "../gemini.js";

const SUPPORTED_ACTION_TYPES = new Set([
  "chat",
  "get-date",
  "get-time",
  "get-day",
  "get-month",
  "google-search",
  "youtube-search",
  "youtube-play",
  "youtube-open",
  "calculator-open",
  "instagram-open",
  "facebook-open",
  "weather-show",
]);

const GENERIC_FAILURE_PATTERNS = [
  /sorry,\s*i could not generate a response\.?/i,
  /sorry,\s*something went wrong/i,
  /i could not understand the assistant response/i,
  /invalid json/i,
];

const trimHistory = (history = [], maxItems = 8) =>
  (Array.isArray(history) ? history : []).filter(Boolean).slice(-maxItems);

const looksLikeGenericFailure = (value = "") =>
  typeof value === "string" &&
  GENERIC_FAILURE_PATTERNS.some((pattern) => pattern.test(value.trim()));

export const normalizeSpokenCommand = (command = "", channel = "chat") => {
  const originalCommand = String(command || "").trim();

  if (!originalCommand || channel !== "voice") {
    return originalCommand;
  }

  const normalizedCommand = originalCommand
    .replace(/\bit it\b/gi, "it")
    .replace(/\bknow about\b/gi, "know about")
    .replace(/\s+/g, " ")
    .trim();

  const rewrites = [
    {
      pattern: /^i want to know about\s+(.+)$/i,
      map: (match) => `Tell me about ${match[1].trim()}`,
    },
    {
      pattern: /^i want to know\s+(.+)$/i,
      map: (match) => `Tell me ${match[1].trim()}`,
    },
    {
      pattern: /^can you tell me about\s+(.+)$/i,
      map: (match) => `Tell me about ${match[1].trim()}`,
    },
    {
      pattern: /^do you know about\s+(.+)$/i,
      map: (match) => `Tell me about ${match[1].trim()}`,
    },
    {
      pattern: /^i want information about\s+(.+)$/i,
      map: (match) => `Tell me about ${match[1].trim()}`,
    },
  ];

  for (const rewrite of rewrites) {
    const match = normalizedCommand.match(rewrite.pattern);
    if (match) {
      return rewrite.map(match);
    }
  }

  return normalizedCommand;
};

const buildLocalFallbackReply = ({
  assistantName,
  userName,
  command,
  channel = "chat",
}) => {
  const c = String(command || "").trim().toLowerCase();
  const greet = (msg) => ({ action: "chat", type: "chat", userInput: command, message: msg, response: msg });
  const name = userName || "there";

  if (/^(hi|hello|hey|yo|sup)\b/.test(c))
    return greet(`Hello ${name}, I'm ${assistantName}. How can I help you?`);

  if (/how(?:'s| is) (?:it )?going|how are you|how r you|what'?s up|sup\b/.test(c))
    return greet(`I'm doing great, thanks! How can I assist you today?`);

  if (/who are you|tell me about yourself|what are you|your name|introduce your/.test(c))
    return greet(`I'm ${assistantName}, your AI virtual assistant. I can answer questions, search the web, open apps, check weather, manage tasks, and more.`);

  if (/thank(s| you)?|thanks a lot|thank you so much|appreciate it|thanks!/.test(c))
    return greet(`You're welcome${name === "there" ? "" : `, ${name}`}! Happy to help.`);

  if (/bye|goodbye|see you|talk to you later|see ya|cya|gotta go|i\'?m off/.test(c))
    return greet(`Goodbye${name === "there" ? "" : `, ${name}`}! Feel free to come back anytime.`);

  if (/what can you do|what are your capabilities|help|features|what do you do|how can you help/.test(c))
    return greet(`I can do lots of things:\n• Answer questions & explain topics\n• Search Google and YouTube\n• Open/close apps (Chrome, VS Code, Notepad, etc.)\n• Check date, time, and weather\n• Control your laptop (sleep, shutdown, restart)\n• Send messages to your phone\n• Chat naturally like ChatGPT!\n\nWhat would you like to try?`);

  if (/how old are you|what'?s your age|when were you (created|born|made)/.test(c))
    return greet(`I'm a virtual assistant, so I don't age — but my code keeps getting better every day!`);

  if (/where are you from|where do you (live|come from)|your (home|origin)/.test(c))
    return greet(`I live in the cloud, ready to help you anytime, anywhere!`);

  if (/tell me a joke|make me laugh|say something funny|joke|humor me/.test(c))
    return greet(`Why don't scientists trust atoms? Because they make up everything! 😄 Want another one?`);

  if (/i'?m bored|i am bored|entertain me/.test(c))
    return greet(`Try asking me a fun question, tell me to tell you a joke, or ask about any topic you're curious about!`);

  if (/what is my name|do you know my name|who am i/.test(c))
    return greet(`Your name is ${name}${name === "there" ? " — but I don't know your name yet. You can tell me!" : "!"}`);

  if (/i love you|i like you|you'?re (great|awesome|amazing|the best)/.test(c))
    return greet(`That's very kind${name === "there" ? "" : `, ${name}`}! I'm here whenever you need me.`);

  if (/you'?re (bad|terrible|useless|dumb|stupid)/.test(c))
    return greet(`I'm sorry I didn't meet your expectations. I'm still learning! Tell me what you need and I'll do my best.`);

  if (/yes|yeah|yep|sure|okay|ok|alright|go ahead/.test(c))
    return greet(`Great! What would you like me to do?`);

  if (/no|nope|nah|not really|no thanks/.test(c))
    return greet(`Okay${name === "there" ? "" : `, ${name}`}! Let me know if you need anything.`);

  if (/what'?s (the )?weather|how is the weather|weather (today|now)|is it (cold|hot|rainy|sunny)/.test(c))
    return greet(`I can check the weather if you tell me a specific city or location. For example: "What's the weather in London?"`);

  if (/what is (\d+)\s*[+\-*\/]\s*\d+|calculate|math|((add|subtract|multiply|divide)\s)/.test(c))
    return greet(`I can help with calculations! Try asking something like "What is 15 times 7?"`);

  if (/good morning|good evening|good afternoon/.test(c))
    return greet(`Good ${c.includes("morning") ? "morning" : c.includes("evening") ? "evening" : "afternoon"}${name === "there" ? "" : `, ${name}`}! How can I help you today?`);

  return greet(
    channel === "voice"
      ? `I couldn't quite process that. Try rephrasing or ask me something else!`
      : `I didn't quite understand that. Could you rephrase or ask me something else?`
  );
};

const buildPlainAnswerPrompt = ({
  assistantName,
  userName,
  command,
  history = [],
  sharedHistory = [],
  channel = "chat",
}) => `
You are a smart virtual assistant named "${assistantName}" helping "${userName}".
Channel: "${channel}".

Active conversation:
${trimHistory(history).length ? trimHistory(history).join("\n") : "No previous conversation."}

Shared context:
${trimHistory(sharedHistory, 10).length ? trimHistory(sharedHistory, 10).join("\n") : "No shared context."}

Answer the user's latest message naturally in plain text.
Resolve references like "this anime", "that one", "he", "it", or "this character" from the active conversation.
Do not mention JSON.
Do not say you failed to generate a response.
If channel is "voice", keep the answer short and direct unless the user explicitly asks for detail.
If the user asks for a letter, leave application, email, message, essay, or formatted writing, format it clearly with line breaks and sections instead of one dense paragraph.

User message:
"""${command}"""
`;

const buildAssistantPrompt = ({
  assistantName,
  userName,
  command,
  history = [],
  sharedHistory = [],
  channel = "chat",
  retryMode = false,
}) => `
You are a smart virtual assistant named "${assistantName}" for the user "${userName}".
Current interaction channel: "${channel}".

You can do two kinds of work:
1. Command actions for apps/web/tasks
2. General chat help like ChatGPT for writing, explaining, brainstorming, summarizing, and everyday questions

Recent active conversation to prioritize:
${trimHistory(history).length ? trimHistory(history).join("\n") : "No previous conversation."}

Shared user context across web and Telegram:
${trimHistory(sharedHistory, 10).length ? trimHistory(sharedHistory, 10).join("\n") : "No shared cross-channel history."}

Read the user's latest message and respond ONLY with one valid JSON object.
Do not add markdown. Do not add code fences. Do not add text before or after the JSON.

Return exactly these keys:
- "type": one of [
  "chat",
  "get-date",
  "get-time",
  "get-day",
  "get-month",
  "google-search",
  "youtube-search",
  "youtube-play",
  "youtube-open",
  "calculator-open",
  "instagram-open",
  "facebook-open",
  "weather-show"
]
- "userInput": cleaned version of the user's request
- "response": the assistant reply

Rules:
- Use "chat" for normal questions and productivity help.
- Use "chat" for tasks like writing emails, messages, captions, summaries, study help, explanations, coding help, and general conversation.
- For "chat", give a genuinely useful answer, not a short placeholder.
- Use command/action types only when the user clearly wants to open/search/play/check date or time.
- Keep "response" natural and directly helpful.
- If channel is "voice", keep "response" brief and fast to speak: usually 1 or 2 short sentences unless the user explicitly asks for a detailed explanation.
- For voice responses, answer directly first and avoid long intros, filler, or repeated self-introductions.
- For follow-up questions like "this", "that", "he", "she", "it", "this anime", "this movie", or "that character", resolve the reference from the recent active conversation first.
- If the user asks about the main character, plot, episode, or similar follow-up, answer using the current topic from the conversation instead of asking the user to repeat everything.
- Never reply with placeholders like "Sorry, I could not generate a response."
- If the request is genuinely ambiguous, ask one short clarifying question in "response".
${retryMode ? '- Your previous attempt failed. Use the conversation context and return one valid JSON object now.' : ""}

User message:
"""${command}"""
`;

const normalizeAssistantResult = ({ command, rawResult }) => {
  if (!rawResult || typeof rawResult !== "string") {
    return {
      action: "chat",
      type: "chat",
      userInput: command,
      message: "Sorry, I could not understand the assistant response.",
      response: "Sorry, I could not understand the assistant response.",
    };
  }

  const jsonMatch = rawResult.match(/{[\s\S]*}/);
  if (!jsonMatch) {
    return {
      action: "chat",
      type: "chat",
      userInput: command,
      message: rawResult,
      response: rawResult,
    };
  }

  let parsedResult;
  try {
    parsedResult = JSON.parse(jsonMatch[0]);
  } catch {
    return {
      action: "chat",
      type: "chat",
      userInput: command,
      message: "I understood your request, but the model returned invalid JSON.",
      response: "I understood your request, but the model returned invalid JSON.",
    };
  }

  const type = parsedResult.type;
  if (!SUPPORTED_ACTION_TYPES.has(type)) {
    return {
      action: "chat",
      type: "chat",
      userInput: command,
      message: parsedResult.response || "I understood your request.",
      response: parsedResult.response || "I understood your request.",
    };
  }

  switch (type) {
    case "get-date":
      return {
        action: type,
        type,
        userInput: parsedResult.userInput || command,
        message: `current date is ${moment().format("YYYY-MM-DD")}`,
        response: `current date is ${moment().format("YYYY-MM-DD")}`,
      };
    case "get-time":
      return {
        action: type,
        type,
        userInput: parsedResult.userInput || command,
        message: `current time is ${moment().format("hh:mm A")}`,
        response: `current time is ${moment().format("hh:mm A")}`,
      };
    case "get-day":
      return {
        action: type,
        type,
        userInput: parsedResult.userInput || command,
        message: `today is ${moment().format("dddd")}`,
        response: `today is ${moment().format("dddd")}`,
      };
    case "get-month":
      return {
        action: type,
        type,
        userInput: parsedResult.userInput || command,
        message: `today is ${moment().format("MMMM")}`,
        response: `today is ${moment().format("MMMM")}`,
      };
    default:
      return {
        action: type,
        type,
        userInput: parsedResult.userInput || command,
        message: parsedResult.response || "I understood your request.",
        response: parsedResult.response || "I understood your request.",
      };
  }
};

const isGood = (text) => text && !looksLikeGenericFailure(text);

const tryAiOnce = async (kind, params) => {
  const { assistantName, userName, command, history, sharedHistory, channel, model, requireJson, maxTokens, temperature, systemPrompt, promptBuilder, retryMode } = params;
  const answer = await geminiResponse(
    promptBuilder({ assistantName, userName, command, history, sharedHistory, channel, retryMode }),
    { maxTokens, temperature, requireJson, systemPrompt, model }
  );
  if (kind === "json") {
    return normalizeAssistantResult({ command, rawResult: answer }).response;
  }
  return answer.trim();
};

export const resolveChatReply = async ({
  assistantName = "Assistant",
  userName = "User",
  command,
  history = [],
  sharedHistory = [],
  channel = "chat",
  model = "openrouter/free",
}) => {
  const plain = await tryAiOnce("plain", {
    assistantName, userName, command, history, sharedHistory, channel, model,
    requireJson: false,
    maxTokens: channel === "voice" ? 260 : 420,
    temperature: 0.2,
    systemPrompt: "You are a helpful assistant. Answer naturally and directly in plain text.",
    promptBuilder: buildPlainAnswerPrompt,
  });

  if (isGood(plain)) {
    return { action: "chat", type: "chat", userInput: command, message: plain, response: plain };
  }

  const json = await tryAiOnce("json", {
    assistantName, userName, command, history, sharedHistory, channel, model,
    requireJson: true,
    maxTokens: channel === "voice" ? 280 : 500,
    temperature: 0.3,
    systemPrompt: "You are a helpful assistant. Return valid JSON with type and response.",
    promptBuilder: buildAssistantPrompt,
    retryMode: true,
  });

  if (isGood(json)) {
    return { action: "chat", type: "chat", userInput: command, message: json, response: json };
  }

  return buildLocalFallbackReply({ assistantName, userName, command, channel });
};
