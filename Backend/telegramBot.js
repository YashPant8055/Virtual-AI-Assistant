import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import TelegramBot from "node-telegram-bot-api";
import { resolveAssistantReply } from "./Services/assistant.service.js";
import User from "./Models/user.model.js";
import { randomBytes } from "crypto";
import {
  appendSharedAssistantHistory,
  ensureUserHistories,
  normalizeHistory,
} from "./Services/userAssistantState.service.js";
import { registerTelegramBot } from "./Services/telegram.service.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PID_FILE = path.join(__dirname, ".telegram-bot.pid");

const acquirePidLock = () => {
  try {
    if (fs.existsSync(PID_FILE)) {
      const oldPid = parseInt(fs.readFileSync(PID_FILE, "utf8").trim(), 10);
      try {
        process.kill(oldPid, 0);
        console.log(`[telegram] Another instance is already running (PID ${oldPid}). Refusing to start.`);
        return false;
      } catch {
        fs.unlinkSync(PID_FILE);
        console.log("[telegram] Removed stale PID file from previous instance.");
      }
    }
    fs.writeFileSync(PID_FILE, String(process.pid));
    return true;
  } catch (err) {
    console.error("[telegram] PID lock error:", err.message);
    return true;
  }
};

const releasePidLock = () => {
  try {
    if (fs.existsSync(PID_FILE)) {
      const pid = parseInt(fs.readFileSync(PID_FILE, "utf8").trim(), 10);
      if (pid === process.pid) {
        fs.unlinkSync(PID_FILE);
      }
    }
  } catch {
    // ignore
  }
};

const getTelegramIdentity = (msg) => {
  const telegramUsername = msg.from?.username?.trim();
  const chatId = String(msg.chat.id);
  const displayName =
    msg.from?.first_name ||
    msg.from?.username ||
    msg.chat?.first_name ||
    "Telegram User";

  return {
    telegramUsername,
    chatId,
    displayName,
  };
};

const parseTelegramLinkCode = (text = "") => {
  const normalizedText = text.trim();
  const startMatch = normalizedText.match(/^\/start\s+link_([A-Z0-9-]+)$/i);
  if (startMatch) {
    return startMatch[1];
  }

  const linkMatch = normalizedText.match(/^\/link\s+([A-Z0-9-]+)$/i);
  if (linkMatch) {
    return linkMatch[1];
  }

  return null;
};

const linkTelegramAccount = async ({
  bot,
  chatId,
  telegramUsername,
  displayName,
  linkCode,
}) => {
  const now = new Date();
  const existingByChatId = await User.findOne({ telegramChatId: chatId });

  if (existingByChatId) {
    await bot.sendMessage(
      chatId,
      "This Telegram chat is already linked to a platform account."
    );
    return true;
  }

  const user = await User.findOne({
    telegramLinkCode: linkCode,
    telegramLinkCodeExpiresAt: { $gt: now },
  });

  if (!user) {
    await bot.sendMessage(
      chatId,
      "Invalid or expired connection code. Please click Connect Telegram in the app again."
    );
    return true;
  }

  user.telegramChatId = chatId;
  user.telegramUsername = telegramUsername || displayName;
  user.telegramLinkedAt = now;
  user.telegramLinkCode = undefined;
  user.telegramLinkCodeExpiresAt = undefined;
  ensureUserHistories(user);
  await user.save();

  await bot.sendMessage(
    chatId,
    `Telegram connected successfully to ${user.assistantName || "your assistant"}. You can talk to your assistant here now.`
  );
  return true;
};

let botInstance = null;
let pollingRetryTimeout = null;
let pollingRetryCount = 0;
const POLLING_MAX_RETRIES = 3;

const restartPolling = async () => {
  if (!botInstance) return;

  try {
    await botInstance.stopPolling();
  } catch {
    // stopPolling throws if already stopped — ignore
  }

  await new Promise((resolve) => setTimeout(resolve, 5000));

  try {
    await botInstance.startPolling();
    pollingRetryCount = 0;
    console.log("[telegram] Polling restarted successfully.");
  } catch (err) {
    console.error("[telegram] Failed to restart polling:", err.message);
  }
};

const gracefulShutdown = () => {
  console.log("[telegram] Shutting down bot polling...");
  clearTimeout(pollingRetryTimeout);
  if (botInstance) {
    botInstance.stopPolling().catch(() => {});
    botInstance = null;
  }
  releasePidLock();
};

process.on("exit", releasePidLock);

export const startTelegramBot = () => {
  if (botInstance) {
    console.log("[telegram] Bot already running, skipping duplicate start.");
    return botInstance;
  }

  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    console.log("[telegram] TELEGRAM_BOT_TOKEN not found. Telegram bot not started.");
    return null;
  }

  if (!acquirePidLock()) {
    return null;
  }

  const bot = new TelegramBot(token, {
    polling: {
      params: { timeout: 10 },
    },
  });
  botInstance = bot;
  registerTelegramBot(bot);

  process.on("SIGINT", gracefulShutdown);
  process.on("SIGTERM", gracefulShutdown);

  bot.on("message", async (msg) => {
    const userText = msg.text?.trim();
    const { telegramUsername, chatId, displayName } = getTelegramIdentity(msg);

    if (!userText) {
      await bot.sendMessage(chatId, "Please send a text message so I can help you.");
      return;
    }

    const linkCode = parseTelegramLinkCode(userText);

    if (linkCode) {
      await linkTelegramAccount({
        bot,
        chatId,
        telegramUsername,
        displayName,
        linkCode,
      });
      return;
    }

    const linkedUser = await User.findOne({ telegramChatId: chatId });

    if (userText.startsWith("/start") && !linkedUser) {
      await bot.sendMessage(
        chatId,
        "Hello, I am the official platform assistant bot. Please click Connect Telegram inside the app settings first, then return here."
      );
      return;
    }

    try {
      if (!linkedUser) {
        await bot.sendMessage(
          chatId,
          "This Telegram chat is not connected to any platform account yet. Open the app and use Connect Telegram first."
        );
        return;
      }

      if (linkedUser.assistantEnabled === false) {
        await bot.sendMessage(
          chatId,
          "Your assistant is currently paused. Open the app and turn the assistant on to continue chatting here."
        );
        return;
      }

      ensureUserHistories(linkedUser);

      const updatedHistory = normalizeHistory([
        ...(linkedUser.telegramHistory || []),
        `user: ${userText}`,
      ]);
      const sharedHistory = appendSharedAssistantHistory(linkedUser, [
        `user: ${userText}`,
      ]);
      let activeConversation =
        linkedUser.telegramConversations?.[linkedUser.telegramConversations.length - 1] ||
        null;

      if (!activeConversation) {
        activeConversation = {
          conversationId: randomBytes(6).toString("hex"),
          title: userText.slice(0, 60) || "Telegram chat",
          messages: [],
        };
        linkedUser.telegramConversations.push(activeConversation);
      }

      activeConversation.messages = [
        ...(activeConversation.messages || []),
        { role: "user", content: userText },
      ];

      const assistantReply = await resolveAssistantReply({
        assistantName: linkedUser.assistantName || "Telegram Assistant",
        userName: linkedUser.name || displayName,
        command: userText,
        history: activeConversation.messages.map(
          (message) => `${message.role}: ${message.content}`
        ),
        sharedHistory,
        channel: "telegram",
        userId: linkedUser._id?.toString?.() || "",
        telegramChatId: chatId,
        model: linkedUser.selectedModel || "openrouter/free",
      });

      if (assistantReply?.ignore) {
        linkedUser.telegramUsername = telegramUsername || linkedUser.telegramUsername;
        linkedUser.telegramHistory = updatedHistory;
        await linkedUser.save();
        return;
      }

      linkedUser.telegramUsername = telegramUsername || linkedUser.telegramUsername;
      linkedUser.telegramHistory = normalizeHistory([
        ...updatedHistory,
        `assistant: ${assistantReply.response}`,
      ]);
      appendSharedAssistantHistory(linkedUser, [
        `assistant: ${assistantReply.response}`,
      ]);
      activeConversation.messages = [
        ...(activeConversation.messages || []),
        { role: "assistant", content: assistantReply.response },
      ];
      await linkedUser.save();

      await bot.sendMessage(chatId, assistantReply.response);
    } catch (error) {
      console.error("[telegram] message handling failed:", error);
      await bot.sendMessage(
        chatId,
        "Sorry, something went wrong while processing your message."
      );
    }
  });

  bot.on("polling_error", async (error) => {
    console.error("[telegram] polling error:", error.message);

    if (error.message.includes("409")) {
      pollingRetryCount++;

      if (pollingRetryCount > POLLING_MAX_RETRIES) {
        console.log("[telegram] Too many 409 conflicts. Another server instance is already polling with this bot token.");
        console.log("[telegram] Close all other terminal windows running the backend and restart.");
        return;
      }

      console.log(`[telegram] 409 conflict (attempt ${pollingRetryCount}/${POLLING_MAX_RETRIES}). Stopping polling and retrying in 5s...`);

      clearTimeout(pollingRetryTimeout);
      pollingRetryTimeout = setTimeout(restartPolling, 100);
    }
  });

  console.log("[telegram] Bot polling started.");
  return bot;
};
