import { commandRegistry } from "./commandRegistry.js";
import { sendTelegramMessage } from "../Services/telegram.service.js";

const normalizeText = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const escapeRegex = (value = "") => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const LAPTOP_TARGET_TOKENS = ["laptop", "pc", "computer", "desktop", "system"];
const PHONE_TARGET_TOKENS = ["phone", "mobile", "android", "iphone", "cellphone"];

const tokenize = (value = "") =>
  normalizeText(value)
    .split(" ")
    .map((token) => token.trim())
    .filter(Boolean);

const damerauLevenshtein = (source = "", target = "") => {
  const sourceLength = source.length;
  const targetLength = target.length;

  if (!sourceLength) {
    return targetLength;
  }

  if (!targetLength) {
    return sourceLength;
  }

  const matrix = Array.from({ length: sourceLength + 1 }, () =>
    Array(targetLength + 1).fill(0)
  );

  for (let row = 0; row <= sourceLength; row += 1) {
    matrix[row][0] = row;
  }

  for (let column = 0; column <= targetLength; column += 1) {
    matrix[0][column] = column;
  }

  for (let row = 1; row <= sourceLength; row += 1) {
    for (let column = 1; column <= targetLength; column += 1) {
      const cost = source[row - 1] === target[column - 1] ? 0 : 1;

      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost
      );

      if (
        row > 1 &&
        column > 1 &&
        source[row - 1] === target[column - 2] &&
        source[row - 2] === target[column - 1]
      ) {
        matrix[row][column] = Math.min(
          matrix[row][column],
          matrix[row - 2][column - 2] + 1
        );
      }
    }
  }

  return matrix[sourceLength][targetLength];
};

const tokensRoughlyMatch = (messageToken, keywordToken) => {
  if (messageToken === keywordToken) {
    return true;
  }

  const longestLength = Math.max(messageToken.length, keywordToken.length);
  if (longestLength <= 3) {
    return false;
  }

  const maxDistance = longestLength >= 7 ? 2 : 1;
  return damerauLevenshtein(messageToken, keywordToken) <= maxDistance;
};

const matchesKeywordTokens = (normalizedMessage, keyword) => {
  const messageTokens = tokenize(normalizedMessage);
  const keywordTokens = tokenize(keyword);

  if (!keywordTokens.length) {
    return false;
  }

  return keywordTokens.every((keywordToken) =>
    messageTokens.some((messageToken) =>
      tokensRoughlyMatch(messageToken, keywordToken)
    )
  );
};

const matchesKeyword = (normalizedMessage, keyword) => {
  const normalizedKeyword = normalizeText(keyword);
  const keywordRegex = escapeRegex(normalizedKeyword).replace(/\s+/g, "\\s+");
  const keywordPattern = new RegExp(`(^|\\b)${keywordRegex}(\\b|$)`, "i");
  if (keywordPattern.test(normalizedMessage)) {
    return true;
  }

  return matchesKeywordTokens(normalizedMessage, keyword);
};

const mentionsAnyTarget = (normalizedMessage, targets = []) => {
  const tokens = tokenize(normalizedMessage);
  return targets.some((target) =>
    tokens.some((token) => tokensRoughlyMatch(token, target))
  );
};

const buildUnsupportedTargetResponse = (userMessage, command) => ({
  action: command.name,
  type: "chat",
  parameters: {},
  userInput: userMessage,
  response:
    "I understood that as a phone command. Right now I can control the laptop and send Telegram messages to the phone, but I cannot control phone power or phone apps.",
});

const buildPhoneAppResponse = (userMessage, command, appName) => ({
  action: command.name,
  type: "chat",
  parameters: { forwardedToPhone: true, appName },
  userInput: userMessage,
  response: `Sent a command to your phone to open ${appName}. Check your Telegram for the notification.`,
});

const isAuthorizedCommandSource = (userContext = {}, command) => {
  if (!command.requiresAuthorization) {
    return true;
  }

  const ownerTelegramChatId = process.env.OWNER_TELEGRAM_CHAT_ID;
  const ownerUserId = process.env.OWNER_USER_ID;
  const telegramChatId = userContext.telegramChatId
    ? String(userContext.telegramChatId)
    : "";

  if (userContext.channel === "telegram") {
    return Boolean(
      ownerTelegramChatId && telegramChatId && telegramChatId === String(ownerTelegramChatId)
    );
  }

  if (ownerUserId) {
    return String(userContext.userId || "") === String(ownerUserId);
  }

  return Boolean(userContext.userId);
};

const buildUnauthorizedResponse = (userMessage, command, userContext = {}) => {
  if (userContext.channel === "telegram") {
    return {
      action: command.name,
      type: "ignore",
      parameters: {},
      userInput: userMessage,
      response: "",
      ignore: true,
    };
  }

  return {
    action: command.name,
    type: "chat",
    parameters: {},
    userInput: userMessage,
    response: "This command is blocked for this user.",
  };
};

export const processAssistantCommand = async (userMessage, userContext = {}) => {
  const normalizedMessage = normalizeText(userMessage);
  const mentionsLaptop = mentionsAnyTarget(normalizedMessage, LAPTOP_TARGET_TOKENS);
  const mentionsPhone = mentionsAnyTarget(normalizedMessage, PHONE_TARGET_TOKENS);

  for (const command of commandRegistry) {
    const matches = command.keywords.some((keyword) =>
      matchesKeyword(normalizedMessage, keyword)
    );

    if (!matches) {
      continue;
    }

    if (command.targetDevice === "laptop" && mentionsPhone && !mentionsLaptop) {
      if (!isAuthorizedCommandSource(userContext, command)) {
        return buildUnauthorizedResponse(userMessage, command, userContext);
      }
      const targetChatId = process.env.OWNER_TELEGRAM_CHAT_ID;
      const appName = command.name.replace(/^(open|close)-/, "");
      const telegramMsg = `[PHONE_ACTION] ${command.name}: ${userMessage}`;
      if (targetChatId) {
        try { sendTelegramMessage(targetChatId, telegramMsg); } catch {}
      }
      return buildPhoneAppResponse(userMessage, command, appName);
    }

    if (!isAuthorizedCommandSource(userContext, command)) {
      return buildUnauthorizedResponse(userMessage, command, userContext);
    }

    const parameters = command.extractParameters
      ? command.extractParameters({
          userMessage,
          normalizedMessage,
          command,
          userContext,
        })
      : {};

    return command.handler({
      userMessage,
      normalizedMessage,
      parameters,
      userContext,
      command,
    });
  }

  return null;
};
