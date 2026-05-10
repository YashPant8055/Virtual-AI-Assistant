import { processAssistantCommand } from "../Commands/processAssistantCommand.js";
import {
  normalizeSpokenCommand,
  resolveChatReply,
} from "./assistantChat.service.js";

export const resolveAssistantReply = async ({
  assistantName = "Assistant",
  userName = "User",
  command,
  history = [],
  sharedHistory = [],
  channel = "chat",
  userId = "",
  telegramChatId = "",
  model = "openrouter/free",
}) => {
  const normalizedCommand = normalizeSpokenCommand(command, channel);
  const commandResult = await processAssistantCommand(normalizedCommand, {
    assistantName,
    userName,
    userId,
    telegramChatId,
    channel,
  });

  if (commandResult) {
    return {
      ...commandResult,
      message: commandResult.response,
      userInput: commandResult.userInput || normalizedCommand,
    };
  }

  return resolveChatReply({
    assistantName,
    userName,
    command: normalizedCommand,
    history,
    sharedHistory,
    channel,
    model,
  });
};
