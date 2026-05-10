import axios from "axios";
import React, { useCallback, useEffect, useState } from "react";
import { AVAILABLE_MODELS } from "./modelOptions";
import { userDataContext as UserDataContext } from "./userDataContext";

const MODEL_STORAGE_KEY = "virtual-ai-selected-model";

function UserContext({ children }) {
  const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:8000";
  const [userData, setUserData] = useState(null);
  const [frontendImage, setFrontendImage] = useState(null);
  const [backendImage, setBackendImage] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedModel, setSelectedModel] = useState(() => {
    return localStorage.getItem(MODEL_STORAGE_KEY) || "openrouter/free";
  });

  const handleCurrentUser = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/user/current`, {
        withCredentials: true,
      });
      setUserData(result.data);
    } catch {
      setUserData(null);
    }
  };

  const getGeminiResponse = async (
    command,
    mode = "voice",
    conversationId = null,
    model = null
  ) => {
    const result = await axios.post(
      `${serverUrl}/api/user/ask`,
      { command, mode, conversationId, model: model || selectedModel },
      { withCredentials: true }
    );
    return result.data;
  };

  const changeModel = useCallback(async (modelId) => {
    setSelectedModel(modelId);
    localStorage.setItem(MODEL_STORAGE_KEY, modelId);
    try {
      await axios.post(
        `${serverUrl}/api/user/model`,
        { model: modelId },
        { withCredentials: true }
      );
    } catch {
      // silently fail
    }
  }, [serverUrl]);

  const createTelegramConnectSession = async () => {
    const result = await axios.post(
      `${serverUrl}/api/user/telegram/connect`,
      {},
      { withCredentials: true }
    );
    return result.data;
  };

  const disconnectTelegram = async () => {
    const result = await axios.post(
      `${serverUrl}/api/user/telegram/disconnect`,
      {},
      { withCredentials: true }
    );
    return result.data;
  };

  const renameConversation = async (mode, conversationId, title) => {
    const result = await axios.post(
      `${serverUrl}/api/user/conversation/rename`,
      { mode, conversationId, title },
      { withCredentials: true }
    );
    return result.data;
  };

  const deleteConversation = async (mode, conversationId) => {
    const result = await axios.post(
      `${serverUrl}/api/user/conversation/delete`,
      { mode, conversationId },
      { withCredentials: true }
    );
    return result.data;
  };

  const setAssistantState = useCallback(async (enabled) => {
    try {
      await axios.post(
        `${serverUrl}/api/user/assistant-state`,
        { enabled },
        { withCredentials: true }
      );
    } catch {
      // silently fail
    }
  }, [serverUrl]);

  useEffect(() => {
    handleCurrentUser();
  }, []);

  const value = {
    serverUrl,
    userData,
    setUserData,
    backendImage,
    setBackendImage,
    frontendImage,
    setFrontendImage,
    selectedImage,
    setSelectedImage,
    selectedModel,
    changeModel,
    getGeminiResponse,
    createTelegramConnectSession,
    disconnectTelegram,
    renameConversation,
    deleteConversation,
    setAssistantState,
  };

  return (
    <UserDataContext.Provider value={value}>
      {children}
    </UserDataContext.Provider>
  );
}

export default UserContext;
