import moment from "moment";

export const getDateHandler = async ({ userMessage, command }) => ({
  action: command.name,
  type: "get-date",
  parameters: {},
  userInput: userMessage,
  response: `Current date is ${moment().format("YYYY-MM-DD")}.`,
});

export const getTimeHandler = async ({ userMessage, command }) => ({
  action: command.name,
  type: "get-time",
  parameters: {},
  userInput: userMessage,
  response: `Current time is ${moment().format("hh:mm A")}.`,
});
