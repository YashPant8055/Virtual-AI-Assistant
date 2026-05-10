import mongoose from "mongoose";

const conversationMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const conversationThreadSchema = new mongoose.Schema(
  {
    conversationId: {
      type: String,
      required: true,
    },
    title: {
      type: String,
      default: "New chat",
    },
    messages: [conversationMessageSchema],
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    assistantName: {
      type: String,
    },
    assistantImage: {
      type: String,
    },
    selectedModel: {
      type: String,
      default: "openrouter/free",
    },
    voiceHistory: [
      {
        type: String,
      },
    ],
    chatHistory: [
      {
        type: String,
      },
    ],
    voiceConversations: [conversationThreadSchema],
    chatConversations: [conversationThreadSchema],
    telegramChatId: {
      type: String,
      unique: true,
      sparse: true,
    },
    telegramUsername: {
      type: String,
      trim: true,
    },
    telegramLinkedAt: {
      type: Date,
    },
    telegramLinkCode: {
      type: String,
      trim: true,
    },
    telegramLinkCodeExpiresAt: {
      type: Date,
    },
    telegramHistory: [
      {
        type: String,
      },
    ],
    assistantHistory: [
      {
        type: String,
      },
    ],
    telegramConversations: [conversationThreadSchema],
    assistantEnabled: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const User = mongoose.models.User || mongoose.model("User", userSchema);

export default User;
