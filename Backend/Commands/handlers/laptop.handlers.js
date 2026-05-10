import {
  closeChromeOnLaptop,
  openAppOnLaptop,
  openChromeOnLaptop,
  openUrlOnLaptop,
  openVSCodeOnLaptop,
  restartLaptop,
  shutdownLaptop,
  sleepLaptop,
} from "../../Services/deviceAction.service.js";

const buildResult = ({ action, type, userInput, parameters = {}, response }) => ({
  action,
  type,
  parameters,
  userInput,
  response,
});

export const sleepLaptopHandler = async ({ userMessage, command }) => {
  await sleepLaptop();
  return buildResult({
    action: command.name,
    type: "sleep-laptop",
    userInput: userMessage,
    response: "Putting laptop to sleep.",
  });
};

export const shutdownLaptopHandler = async ({ userMessage, command }) => {
  await shutdownLaptop();
  return buildResult({
    action: command.name,
    type: "shutdown-laptop",
    userInput: userMessage,
    response: "Shutting down the laptop.",
  });
};

export const restartLaptopHandler = async ({ userMessage, command }) => {
  await restartLaptop();
  return buildResult({
    action: command.name,
    type: "restart-laptop",
    userInput: userMessage,
    response: "Restarting the laptop.",
  });
};

export const openChromeHandler = async ({ userMessage, command, userContext }) => {
  await openChromeOnLaptop();

  return buildResult({
    action: command.name,
    type: userContext.channel === "telegram" ? "open-chrome" : "chat",
    userInput: userMessage,
    response: "Opening Chrome.",
  });
};

export const openYoutubeHandler = async ({
  userMessage,
  command,
  userContext,
}) => {
  if (userContext.channel === "telegram") {
    await openChromeOnLaptop("https://www.youtube.com/");
  }

  return buildResult({
    action: command.name,
    type: userContext.channel === "telegram" ? "open-youtube" : "youtube-open",
    userInput: userMessage,
    response: "Opening YouTube.",
  });
};

export const openFacebookHandler = async ({
  userMessage,
  command,
  userContext,
}) => {
  if (userContext.channel === "telegram") {
    await openChromeOnLaptop("https://www.facebook.com/");
  }

  return buildResult({
    action: command.name,
    type: userContext.channel === "telegram" ? "open-facebook" : "facebook-open",
    userInput: userMessage,
    response: "Opening Facebook.",
  });
};

export const openInstagramHandler = async ({
  userMessage,
  command,
  userContext,
}) => {
  if (userContext.channel === "telegram") {
    await openChromeOnLaptop("https://www.instagram.com/");
  }

  return buildResult({
    action: command.name,
    type: userContext.channel === "telegram" ? "open-instagram" : "instagram-open",
    userInput: userMessage,
    response: "Opening Instagram.",
  });
};

export const openGoogleHandler = async ({
  userMessage,
  command,
  userContext,
}) => {
  if (userContext.channel === "telegram") {
    await openChromeOnLaptop("https://www.google.com/");
  }

  return buildResult({
    action: command.name,
    type: userContext.channel === "telegram" ? "open-google" : "google-search",
    userInput: "google",
    response: "Opening Google.",
  });
};

export const openGmailHandler = async ({
  userMessage,
  command,
  userContext,
}) => {
  if (userContext.channel === "telegram") {
    await openChromeOnLaptop("https://mail.google.com/");
  }

  return buildResult({
    action: command.name,
    type: userContext.channel === "telegram" ? "open-gmail" : "chat",
    userInput: userMessage,
    response: "Opening Gmail.",
  });
};

export const openVSCodeHandler = async ({ userMessage, command }) => {
  await openVSCodeOnLaptop();

  return buildResult({
    action: command.name,
    type: command.name,
    userInput: userMessage,
    response: "Opening Visual Studio Code.",
  });
};

export const openNotepadHandler = async ({ userMessage, command }) => {
  await openAppOnLaptop("notepad.exe");

  return buildResult({
    action: command.name,
    type: command.name,
    userInput: userMessage,
    response: "Opening Notepad.",
  });
};

export const openCalculatorHandler = async ({ userMessage, command }) => {
  await openAppOnLaptop("calc.exe");

  return buildResult({
    action: command.name,
    type: command.name,
    userInput: userMessage,
    response: "Opening Calculator.",
  });
};

export const openExplorerHandler = async ({ userMessage, command }) => {
  await openAppOnLaptop("explorer.exe");

  return buildResult({
    action: command.name,
    type: command.name,
    userInput: userMessage,
    response: "Opening File Explorer.",
  });
};

const closeChromeFamilyResult = ({ userMessage, command, response }) =>
  buildResult({
    action: command.name,
    type: command.name,
    userInput: userMessage,
    response,
  });

export const closeChromeHandler = async ({ userMessage, command }) => {
  await closeChromeOnLaptop();

  return closeChromeFamilyResult({
    userMessage,
    command,
    response: "Closing Chrome.",
  });
};

export const closeYoutubeHandler = async ({ userMessage, command }) => {
  await closeChromeOnLaptop();

  return closeChromeFamilyResult({
    userMessage,
    command,
    response: "Closing YouTube in Chrome.",
  });
};

export const closeFacebookHandler = async ({ userMessage, command }) => {
  await closeChromeOnLaptop();

  return closeChromeFamilyResult({
    userMessage,
    command,
    response: "Closing Facebook in Chrome.",
  });
};

export const closeInstagramHandler = async ({ userMessage, command }) => {
  await closeChromeOnLaptop();

  return closeChromeFamilyResult({
    userMessage,
    command,
    response: "Closing Instagram in Chrome.",
  });
};

export const closeGoogleHandler = async ({ userMessage, command }) => {
  await closeChromeOnLaptop();

  return closeChromeFamilyResult({
    userMessage,
    command,
    response: "Closing Google in Chrome.",
  });
};

export const closeGmailHandler = async ({ userMessage, command }) => {
  await closeChromeOnLaptop();

  return closeChromeFamilyResult({
    userMessage,
    command,
    response: "Closing Gmail in Chrome.",
  });
};

export const googleSearchHandler = async ({
  userMessage,
  command,
  parameters,
  userContext,
}) => {
  const query = parameters.query?.trim();
  const searchUrl = query
    ? `https://www.google.com/search?q=${encodeURIComponent(query)}`
    : "https://www.google.com/";

  if (userContext.channel === "telegram") {
    await openUrlOnLaptop(searchUrl);
  }

  return buildResult({
    action: command.name,
    type: "google-search",
    userInput: query || userMessage,
    parameters: { query: query || "" },
    response: query ? `Searching Google for ${query}.` : "Opening Google search.",
  });
};

export const youtubeSearchHandler = async ({
  userMessage,
  command,
  parameters,
  userContext,
}) => {
  const query = parameters.query?.trim();
  const searchUrl = query
    ? `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`
    : "https://www.youtube.com/";

  if (userContext.channel === "telegram") {
    await openUrlOnLaptop(searchUrl);
  }

  return buildResult({
    action: command.name,
    type: "youtube-search",
    userInput: query || userMessage,
    parameters: { query: query || "" },
    response: query ? `Searching YouTube for ${query}.` : "Opening YouTube.",
  });
};
