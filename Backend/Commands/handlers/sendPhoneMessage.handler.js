import { sendTelegramMessage } from "../../Services/telegram.service.js";

export const sendPhoneMessageHandler = async ({
  userMessage,
  command,
  parameters,
}) => {
  const targetChatId = process.env.OWNER_TELEGRAM_CHAT_ID;
  const message = parameters.message?.trim();

  if (!targetChatId) {
    throw new Error("OWNER_TELEGRAM_CHAT_ID is not configured.");
  }

  if (!message) {
    return {
      action: command.name,
      type: "send-phone-message",
      parameters,
      userInput: userMessage,
      response: "Tell me what message to send to your phone.",
    };
  }

  await sendTelegramMessage(targetChatId, message);

  return {
    action: command.name,
    type: "send-phone-message",
    parameters: { message },
    userInput: userMessage,
    response: "Sent the message to your phone on Telegram.",
  };
};
