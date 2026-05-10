let telegramBotInstance = null;

export const registerTelegramBot = (bot) => {
  telegramBotInstance = bot;
};

export const getTelegramBot = () => telegramBotInstance;

export const sendTelegramMessage = async (chatId, message) => {
  if (!telegramBotInstance) {
    throw new Error("Telegram bot is not initialized.");
  }

  if (!chatId) {
    throw new Error("Telegram chat ID is required.");
  }

  return telegramBotInstance.sendMessage(String(chatId), String(message || ""));
};
