import { randomBytes } from "crypto";

const MAX_CHANNEL_HISTORY_ITEMS = 12;
const MAX_SHARED_HISTORY_ITEMS = 24;
const MAX_CONVERSATIONS = 20;

export const normalizeHistory = (
  history = [],
  maxItems = MAX_CHANNEL_HISTORY_ITEMS
) => {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .map((item) => {
      if (typeof item === "string") {
        return item;
      }

      if (item && typeof item === "object") {
        const role = item.role || "system";
        const content = item.content || "";
        return `${role}: ${content}`;
      }

      return "";
    })
    .filter(Boolean)
    .slice(-maxItems);
};

export const buildConversationsFromHistory = (history = []) => {
  if (!Array.isArray(history) || history.length === 0) {
    return [];
  }

  const conversations = [];
  let currentConversation = null;

  history.forEach((item) => {
    const role = /^assistant:/i.test(item)
      ? "assistant"
      : /^user:/i.test(item)
      ? "user"
      : "system";
    const content = item.replace(/^(user|assistant):\s*/i, "").trim() || item;

    if (role === "user" || !currentConversation) {
      if (currentConversation) {
        conversations.push(currentConversation);
      }

      currentConversation = {
        conversationId: randomBytes(6).toString("hex"),
        title: content.slice(0, 60) || "New chat",
        messages: [{ role, content }],
      };
      return;
    }

    currentConversation.messages.push({ role, content });
  });

  if (currentConversation) {
    conversations.push(currentConversation);
  }

  return conversations.slice(-MAX_CONVERSATIONS);
};

export const normalizeConversationMessages = (messages = []) =>
  (Array.isArray(messages) ? messages : [])
    .filter((message) => message?.content)
    .map((message) => ({
      role: message.role || "assistant",
      content: message.content,
    }));

export const normalizeConversations = (conversations = []) =>
  (Array.isArray(conversations) ? conversations : [])
    .filter((conversation) => conversation?.conversationId)
    .map((conversation) => ({
      conversationId: conversation.conversationId,
      title: conversation.title || "New chat",
      messages: normalizeConversationMessages(conversation.messages),
    }))
    .filter((conversation) => conversation.messages.length > 0);

const buildSharedHistoryFromChannels = (user) =>
  normalizeHistory(
    [
      ...(Array.isArray(user.voiceHistory) ? user.voiceHistory : []),
      ...(Array.isArray(user.chatHistory) ? user.chatHistory : []),
      ...(Array.isArray(user.telegramHistory) ? user.telegramHistory : []),
    ],
    MAX_SHARED_HISTORY_ITEMS
  );

export const appendSharedAssistantHistory = (user, entries = []) => {
  user.assistantHistory = normalizeHistory(
    [...(Array.isArray(user.assistantHistory) ? user.assistantHistory : []), ...entries],
    MAX_SHARED_HISTORY_ITEMS
  );

  return user.assistantHistory;
};

export const ensureUserHistories = (user) => {
  if (!Array.isArray(user.voiceHistory)) {
    user.voiceHistory = [];
  }

  if (!Array.isArray(user.chatHistory)) {
    user.chatHistory = [];
  }

  if (!Array.isArray(user.telegramHistory)) {
    user.telegramHistory = [];
  }

  if (!Array.isArray(user.assistantHistory)) {
    user.assistantHistory = [];
  }

  if (!Array.isArray(user.voiceConversations)) {
    user.voiceConversations = [];
  }

  if (!Array.isArray(user.chatConversations)) {
    user.chatConversations = [];
  }

  if (!Array.isArray(user.telegramConversations)) {
    user.telegramConversations = [];
  }

  if (user.chatConversations.length === 0 && user.chatHistory.length > 0) {
    user.chatConversations = buildConversationsFromHistory(user.chatHistory);
  }

  if (user.voiceConversations.length === 0 && user.voiceHistory.length > 0) {
    user.voiceConversations = buildConversationsFromHistory(user.voiceHistory);
  }

  if (user.telegramConversations.length === 0 && user.telegramHistory.length > 0) {
    user.telegramConversations = buildConversationsFromHistory(user.telegramHistory);
  }

  user.chatConversations = normalizeConversations(user.chatConversations);
  user.voiceConversations = normalizeConversations(user.voiceConversations);
  user.telegramConversations = normalizeConversations(user.telegramConversations);

  if (user.assistantHistory.length === 0) {
    user.assistantHistory = buildSharedHistoryFromChannels(user);
  } else {
    user.assistantHistory = normalizeHistory(
      user.assistantHistory,
      MAX_SHARED_HISTORY_ITEMS
    );
  }

  if (Array.isArray(user.history) && user.history.length > 0) {
    if (user.voiceHistory.length === 0) {
      user.voiceHistory = normalizeHistory(user.history);
    }
    user.history = [];
  }
};
