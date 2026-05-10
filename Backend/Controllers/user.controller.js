import uploadOnCloudinary from "../Config/cloudinary.js";
import { AVAILABLE_MODELS } from "../gemini.js";
import User from "../Models/user.model.js";
import { resolveAssistantReply } from "../Services/assistant.service.js";
import { randomBytes } from "crypto";
import {
  appendSharedAssistantHistory,
  ensureUserHistories,
  normalizeConversationMessages,
  normalizeConversations,
  normalizeHistory,
} from "../Services/userAssistantState.service.js";

const logAssistantEvent = (requestId, stage, payload) => {
  console.log(`[assistant:${requestId}] ${stage}`, payload);
};

const getHistoryKey = (mode) => (mode === "chat" ? "chatHistory" : "voiceHistory");
const getConversationKey = (mode) =>
  mode === "chat" ? "chatConversations" : "voiceConversations";
const getConversationCollectionKey = (mode) => {
  if (mode === "telegram") {
    return "telegramConversations";
  }

  return getConversationKey(mode);
};
const DEFAULT_MODEL_ID = "openrouter/free";
const normalizeModelId = (modelId) => {
  const modelExists = AVAILABLE_MODELS.some((model) => model.id === modelId);
  return modelExists ? modelId : DEFAULT_MODEL_ID;
};

const buildTelegramBotLink = (code) => {
  const botUsername = process.env.TELEGRAM_BOT_USERNAME;

  if (!botUsername) {
    return null;
  }

  return `https://t.me/${botUsername}?start=link_${code}`;
};

const generateTelegramLinkCode = () =>
  `TG-${randomBytes(3).toString("hex").toUpperCase()}`;

export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(400).json({ message: "user not found" });
    }

    ensureUserHistories(user);
    if (user.isModified()) {
      await user.save();
    }

    return res.status(200).json(user);
  } catch (error) {
    return res.status(400).json({ message: "get current user error" });
  }
};

export const updateAssistant = async (req, res) => {
  try {
    const { assistantName, imageUrl } = req.body;
    let assistantImage;

    if (req.file) {
      assistantImage = await uploadOnCloudinary(req.file.path, {
        folder: "virtual-ai/avatars",
      });
    } else {
      assistantImage = imageUrl;
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        assistantName,
        assistantImage,
      },
      { new: true }
    ).select("-password");

    return res.status(200).json(user);
  } catch (error) {
    return res.status(400).json({ message: "updateAssistantError user error" });
  }
};

export const createTelegramConnectSession = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    ensureUserHistories(user);

    if (user.telegramChatId) {
      return res.status(200).json({
        connected: true,
        telegramChatId: user.telegramChatId,
        telegramUsername: user.telegramUsername || "",
        botLink: buildTelegramBotLink(user.telegramLinkCode) || null,
        instructions:
          "Open Telegram and start a conversation with our official assistant bot.",
      });
    }

    const linkCode = generateTelegramLinkCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    user.telegramLinkCode = linkCode;
    user.telegramLinkCodeExpiresAt = expiresAt;
    await user.save();

    return res.status(200).json({
      connected: false,
      linkCode,
      expiresAt,
      botLink: buildTelegramBotLink(linkCode),
      instructions:
        "Open Telegram and start a conversation with our official assistant bot.",
    });
  } catch (error) {
    return res.status(500).json({
      message: `telegram connect session error ${error.message}`,
    });
  }
};

export const setAssistantState = async (req, res) => {
  try {
    const { enabled } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      { assistantEnabled: enabled },
      { new: true }
    ).select("-password");
    return res.status(200).json({ assistantEnabled: user.assistantEnabled });
  } catch (error) {
    return res.status(500).json({ message: `assistant state error: ${error.message}` });
  }
};

export const disconnectTelegram = async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    user.telegramChatId = undefined;
    user.telegramUsername = undefined;
    user.telegramLinkedAt = undefined;
    user.telegramLinkCode = undefined;
    user.telegramLinkCodeExpiresAt = undefined;
    await user.save();

    return res.status(200).json({
      message: "Telegram disconnected successfully.",
    });
  } catch (error) {
    return res.status(500).json({
      message: `telegram disconnect error ${error.message}`,
    });
  }
};

export const uploadChatAsset = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "asset file is required" });
    }

    const assetUrl = await uploadOnCloudinary(req.file.path, {
      folder: "virtual-ai/chat-assets",
    });

    return res.status(200).json({
      url: assetUrl,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error) {
    return res.status(500).json({
      message: `chat asset upload error ${error.message}`,
    });
  }
};

export const renameConversation = async (req, res) => {
  try {
    const { mode = "chat", conversationId, title } = req.body;

    if (!conversationId || !title?.trim()) {
      return res.status(400).json({ message: "conversationId and title are required" });
    }

    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    ensureUserHistories(user);
    const conversationKey = getConversationCollectionKey(mode);
    const conversation = user[conversationKey]?.find(
      (item) => item.conversationId === conversationId
    );

    if (!conversation) {
      return res.status(404).json({ message: "conversation not found" });
    }

    conversation.title = title.trim().slice(0, 80);
    await user.save();

    return res.status(200).json({
      conversationId,
      title: conversation.title,
      mode,
    });
  } catch (error) {
    return res.status(500).json({ message: `rename conversation error ${error.message}` });
  }
};

export const deleteConversation = async (req, res) => {
  try {
    const { mode = "chat", conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({ message: "conversationId is required" });
    }

    const user = await User.findById(req.userId).select("-password");
    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    ensureUserHistories(user);
    const conversationKey = getConversationCollectionKey(mode);
    const existingConversations = Array.isArray(user[conversationKey])
      ? user[conversationKey]
      : [];

    user[conversationKey] = existingConversations.filter(
      (item) => item.conversationId !== conversationId
    );
    await user.save();

    return res.status(200).json({
      conversationId,
      mode,
    });
  } catch (error) {
    return res.status(500).json({ message: `delete conversation error ${error.message}` });
  }
};

export const askToAssistant = async (req, res) => {
  const requestId = Date.now().toString(36);

  try {
    const { command, mode = "voice", conversationId, model } = req.body;
    const historyKey = getHistoryKey(mode);
    const conversationKey = getConversationKey(mode);

    logAssistantEvent(requestId, "request_received", {
      userId: req.userId,
      command,
      mode,
    });

    if (
      !command ||
      typeof command !== "string" ||
      command.trim().length === 0
    ) {
      logAssistantEvent(requestId, "invalid_command", { command });
      return res.status(400).json({
        response: "Please say something so I can help you.",
      });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      logAssistantEvent(requestId, "user_not_found", { userId: req.userId });
      return res.status(404).json({ response: "User not found" });
    }

    ensureUserHistories(user);
    let conversation =
      user[conversationKey].find((item) => item.conversationId === conversationId) ||
      null;

    if (!conversation) {
      conversation = {
        conversationId: randomBytes(6).toString("hex"),
        title: command.trim().slice(0, 60) || "New chat",
        messages: [],
      };
      user[conversationKey].push(conversation);
    }

    const activeConversationId = conversation.conversationId;
    const activeConversationTitle = conversation.title || "New chat";

    conversation.messages = normalizeConversationMessages([
      ...(conversation.messages || []),
      { role: "user", content: command },
    ]);
    user[conversationKey] = normalizeConversations(user[conversationKey]);

    user[historyKey].push(`user: ${command}`);
    user[historyKey] = normalizeHistory(user[historyKey]);
    const conversationHistory = conversation.messages.map(
      (message) => `${message.role}: ${message.content}`
    );
    const sharedHistory = appendSharedAssistantHistory(user, [`user: ${command}`]);

    const userName = user.name || "User";
    const assistantName = user.assistantName || "Assistant";
    const selectedModel = normalizeModelId(model || user.selectedModel);

    logAssistantEvent(requestId, "prompt_context", {
      userName,
      assistantName,
      historyItems: conversationHistory.length,
      sharedHistoryItems: sharedHistory.length,
      selectedModel,
    });

    const responsePayload = await resolveAssistantReply({
      assistantName,
      userName,
      command,
      history: conversationHistory,
      sharedHistory,
      channel: mode === "voice" ? "voice" : "chat",
      userId: user._id?.toString?.() || req.userId,
      model: selectedModel,
    });

    const storedConversation = user[conversationKey].find(
      (item) => item.conversationId === activeConversationId
    );

    const conversationToUpdate =
      storedConversation ||
      {
        conversationId: activeConversationId,
        title: activeConversationTitle,
        messages: [],
      };

    conversationToUpdate.messages = normalizeConversationMessages([
      ...(conversationToUpdate.messages || []),
      { role: "assistant", content: responsePayload.response },
    ]);
    if (!storedConversation) {
      user[conversationKey].push(conversationToUpdate);
    }
    user[historyKey].push(`assistant: ${responsePayload.response}`);
    user[historyKey] = normalizeHistory(user[historyKey]);
    appendSharedAssistantHistory(user, [`assistant: ${responsePayload.response}`]);
    user[conversationKey] = normalizeConversations(user[conversationKey]);
    await user.save();

    logAssistantEvent(requestId, "response_sent", responsePayload);
    return res.json({
      ...responsePayload,
      conversationId: activeConversationId,
    });
  } catch (error) {
    logAssistantEvent(requestId, "request_failed", {
      message: error.message,
      stack: error.stack,
    });
    return res.status(500).json({ response: "ask assistant error" });
  }
};

export const updateModel = async (req, res) => {
  try {
    const { model } = req.body;
    const selectedModel = normalizeModelId(model);

    if (!model || selectedModel !== model) {
      return res.status(400).json({ message: "valid model is required" });
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      { selectedModel },
      { new: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "user not found" });
    }

    return res.status(200).json({ selectedModel: user.selectedModel });
  } catch (error) {
    return res.status(500).json({ message: `update model error ${error.message}` });
  }
};
