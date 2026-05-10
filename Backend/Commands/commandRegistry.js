import { getDateHandler, getTimeHandler } from "./handlers/dateTime.handlers.js";
import {
  closeChromeHandler,
  closeFacebookHandler,
  closeGmailHandler,
  closeGoogleHandler,
  closeInstagramHandler,
  closeYoutubeHandler,
  googleSearchHandler,
  openCalculatorHandler,
  openChromeHandler,
  openExplorerHandler,
  openFacebookHandler,
  openGmailHandler,
  openGoogleHandler,
  openInstagramHandler,
  openNotepadHandler,
  openVSCodeHandler,
  openYoutubeHandler,
  restartLaptopHandler,
  shutdownLaptopHandler,
  sleepLaptopHandler,
  youtubeSearchHandler,
} from "./handlers/laptop.handlers.js";
import { sendPhoneMessageHandler } from "./handlers/sendPhoneMessage.handler.js";

const stripCommandPrefix = (message, keywords = []) => {
  const normalized = String(message || "").trim();
  const escapedKeywords = keywords
    .filter(Boolean)
    .sort((left, right) => right.length - left.length)
    .map((keyword) => keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

  if (!escapedKeywords.length) {
    return normalized;
  }

  const pattern = new RegExp(`^(?:${escapedKeywords.join("|")})\\s*(?:for\\s+)?`, "i");
  return normalized.replace(pattern, "").trim();
};

const extractMessageBody = (message, keywords = []) => {
  const stripped = stripCommandPrefix(message, keywords);
  return stripped.replace(/^(that|saying|with|to)\s+/i, "").trim();
};

export const commandRegistry = [
  {
    name: "sleep-laptop",
    keywords: [
      "sleep laptop",
      "put laptop to sleep",
      "sleep the laptop",
      "sleep pc",
      "sleep my pc",
      "put my pc to sleep",
      "put my pc in sleep",
      "put computer to sleep",
      "sleep computer",
    ],
    requiresAuthorization: true,
    targetDevice: "laptop",
    handler: sleepLaptopHandler,
  },
  {
    name: "shutdown-laptop",
    keywords: [
      "shutdown laptop",
      "shut down laptop",
      "turn off laptop",
      "shutdown pc",
      "shut down pc",
      "turn off pc",
      "shutdown computer",
      "turn off computer",
    ],
    requiresAuthorization: true,
    targetDevice: "laptop",
    handler: shutdownLaptopHandler,
  },
  {
    name: "restart-laptop",
    keywords: [
      "restart laptop",
      "reboot laptop",
      "restart pc",
      "reboot pc",
      "restart computer",
      "reboot computer",
    ],
    requiresAuthorization: true,
    targetDevice: "laptop",
    handler: restartLaptopHandler,
  },
  {
    name: "open-chrome",
    keywords: ["open chrome", "launch chrome", "start chrome"],
    targetDevice: "laptop",
    handler: openChromeHandler,
  },
  {
    name: "open-vscode",
    keywords: ["open vscode", "open vs code", "launch vscode", "launch vs code", "start vscode"],
    targetDevice: "laptop",
    handler: openVSCodeHandler,
  },
  {
    name: "open-notepad",
    keywords: ["open notepad", "launch notepad", "start notepad"],
    targetDevice: "laptop",
    handler: openNotepadHandler,
  },
  {
    name: "open-calculator",
    keywords: ["open calculator", "launch calculator", "start calculator", "open calc"],
    targetDevice: "laptop",
    handler: openCalculatorHandler,
  },
  {
    name: "open-explorer",
    keywords: ["open file explorer", "open explorer", "launch explorer", "start explorer"],
    targetDevice: "laptop",
    handler: openExplorerHandler,
  },
  {
    name: "close-chrome",
    keywords: ["close chrome", "stop chrome", "exit chrome"],
    targetDevice: "laptop",
    handler: closeChromeHandler,
  },
  {
    name: "open-youtube",
    keywords: ["open youtube", "launch youtube", "start youtube"],
    targetDevice: "laptop",
    handler: openYoutubeHandler,
  },
  {
    name: "close-youtube",
    keywords: ["close youtube", "stop youtube", "exit youtube"],
    targetDevice: "laptop",
    handler: closeYoutubeHandler,
  },
  {
    name: "open-facebook",
    keywords: ["open facebook", "launch facebook", "start facebook"],
    targetDevice: "laptop",
    handler: openFacebookHandler,
  },
  {
    name: "close-facebook",
    keywords: ["close facebook", "stop facebook", "exit facebook"],
    targetDevice: "laptop",
    handler: closeFacebookHandler,
  },
  {
    name: "open-instagram",
    keywords: ["open instagram", "launch instagram", "start instagram"],
    targetDevice: "laptop",
    handler: openInstagramHandler,
  },
  {
    name: "close-instagram",
    keywords: ["close instagram", "stop instagram", "exit instagram"],
    targetDevice: "laptop",
    handler: closeInstagramHandler,
  },
  {
    name: "open-google",
    keywords: ["open google", "launch google", "start google"],
    targetDevice: "laptop",
    handler: openGoogleHandler,
  },
  {
    name: "close-google",
    keywords: ["close google", "stop google", "exit google"],
    targetDevice: "laptop",
    handler: closeGoogleHandler,
  },
  {
    name: "open-gmail",
    keywords: ["open gmail", "launch gmail", "start gmail"],
    targetDevice: "laptop",
    handler: openGmailHandler,
  },
  {
    name: "close-gmail",
    keywords: ["close gmail", "stop gmail", "exit gmail"],
    targetDevice: "laptop",
    handler: closeGmailHandler,
  },
  {
    name: "send-phone-message",
    keywords: [
      "send phone message",
      "send message to my phone",
      "message my phone",
      "notify my phone",
    ],
    requiresAuthorization: true,
    targetDevice: "phone",
    extractParameters: ({ userMessage, command }) => ({
      message: extractMessageBody(userMessage, command.keywords),
    }),
    handler: sendPhoneMessageHandler,
  },
  {
    name: "get-date",
    keywords: ["get date", "what is the date", "today's date", "current date"],
    handler: getDateHandler,
  },
  {
    name: "get-time",
    keywords: ["get time", "what time is it", "current time", "time now"],
    handler: getTimeHandler,
  },
  {
    name: "google-search",
    keywords: ["google search", "search google for", "search for"],
    targetDevice: "laptop",
    extractParameters: ({ userMessage, command }) => ({
      query: stripCommandPrefix(userMessage, command.keywords),
    }),
    handler: googleSearchHandler,
  },
  {
    name: "youtube-search",
    keywords: ["youtube search", "search youtube for", "play on youtube", "find on youtube"],
    targetDevice: "laptop",
    extractParameters: ({ userMessage, command }) => ({
      query: stripCommandPrefix(userMessage, command.keywords),
    }),
    handler: youtubeSearchHandler,
  },
];
