import express from "express";
import {
  askToAssistant,
  createTelegramConnectSession,
  deleteConversation,
  disconnectTelegram,
  getCurrentUser,
  renameConversation,
  setAssistantState,
  updateAssistant,
  uploadChatAsset,
  updateModel,
} from "../Controllers/user.controller.js";
import isAuth from "../Middlewares/isAuth.js";
import upload from "../Middlewares/multer.js";
const userRouter = express.Router();

userRouter.get("/current", isAuth, getCurrentUser);
userRouter.post(
  "/update",
  isAuth,
  upload.single("assistantImage"),
  updateAssistant
);
userRouter.post("/ask", isAuth, askToAssistant);
userRouter.post("/conversation/rename", isAuth, renameConversation);
userRouter.post("/conversation/delete", isAuth, deleteConversation);
userRouter.post("/telegram/connect", isAuth, createTelegramConnectSession);
userRouter.post("/telegram/disconnect", isAuth, disconnectTelegram);
userRouter.post("/upload", isAuth, upload.single("asset"), uploadChatAsset);
userRouter.post("/model", isAuth, updateModel);
userRouter.post("/assistant-state", isAuth, setAssistantState);
export default userRouter;
