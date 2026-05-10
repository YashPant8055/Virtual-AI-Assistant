import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { CgMenuRight } from "react-icons/cg";
import { FaTelegramPlane } from "react-icons/fa";
import {
  IoAdd,
  IoAttachOutline,
  IoChevronDown,
  IoClose,
  IoDownloadOutline,
  IoEllipsisHorizontal,
  IoImageOutline,
  IoMicOutline,
  IoPower,
  IoSend,
  IoStop,
} from "react-icons/io5";
import { PiSidebarSimpleFill } from "react-icons/pi";
import { RxCross1 } from "react-icons/rx";
import aiImg from "../assets/ai.gif";
import userImg from "../assets/user.gif";
import { userDataContext } from "../context/userDataContext";
import { AVAILABLE_MODELS } from "../context/modelOptions";

function Home() {
  const ASSISTANT_STATE_STORAGE_KEY = "virtual-ai-assistant-enabled";
  const VOICE_RESTART_DELAY_MS = 250;
  const VOICE_ERROR_RESTART_DELAY_MS = 500;
  const VOICE_IDLE_RESTART_DELAY_MS = 350;
  const VOICE_WAKE_RETRY_DELAY_MS = 180;
  const VOICE_GREETING_DELAY_MS = 300;
  const VOICE_INTERRUPT_ARM_DELAY_MS = 180;
  const {
    userData,
    serverUrl,
    setUserData,
    getGeminiResponse,
    renameConversation,
    deleteConversation,
    selectedModel,
    changeModel,
    setAssistantState,
  } =
    useContext(userDataContext);
  const navigate = useNavigate();
  const [mode, setMode] = useState("voice");
  const [listening, setListening] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [voiceThinking, setVoiceThinking] = useState(false);
  const [userText, setUserText] = useState("");
  const [aiText, setAiText] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [ham, setHam] = useState(false);
  const [assistantEnabled, setAssistantEnabled] = useState(() => {
    const storedValue = window.localStorage.getItem(ASSISTANT_STATE_STORAGE_KEY);
    return storedValue === null ? true : storedValue === "true";
  });
  const [desktopSidebarOpen, setDesktopSidebarOpen] = useState(true);
  const [sidebarView, setSidebarView] = useState("assistant");
  const [selectedThreadKey, setSelectedThreadKey] = useState(null);
  const [activeConversationId, setActiveConversationId] = useState(null);
  const [isDraftChat, setIsDraftChat] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [threadMenuOpen, setThreadMenuOpen] = useState(null);
  const [renameModal, setRenameModal] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [shareModalLink, setShareModalLink] = useState(null);
  const [shareStatus, setShareStatus] = useState("");
  const [renameValue, setRenameValue] = useState("");
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [installStatus, setInstallStatus] = useState("");
  const [modelDropdownOpen, setModelDropdownOpen] = useState(false);
  const [composerMenuOpen, setComposerMenuOpen] = useState(false);
  const [pendingAssets, setPendingAssets] = useState([]);
  const [uploadingAsset, setUploadingAsset] = useState(false);
  const [recordingVoiceNote, setRecordingVoiceNote] = useState(false);
  const recognitionRef = useRef(null);
  const threadMenuRef = useRef(null);
  const modelDropdownRef = useRef(null);
  const fileInputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const isSpeakingRef = useRef(false);
  const isRecognizingRef = useRef(false);
  const isWaitingForResponseRef = useRef(false);
  const selectedModelRef = useRef(selectedModel);
  selectedModelRef.current = selectedModel;
  const voiceConversationIdRef = useRef(null);
  const requestAssistantRef = useRef(null);
  const userDataRef = useRef(userData);
  const hasPlayedVoiceGreetingRef = useRef(false);
  const spokenResponseRef = useRef("");
  const greetedSessionKeyRef = useRef("");
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);
  const synth = window.speechSynthesis;
  const chatConversations = useMemo(
    () => userData?.chatConversations || [],
    [userData?.chatConversations]
  );
  const voiceConversations = useMemo(
    () => userData?.voiceConversations || [],
    [userData?.voiceConversations]
  );
  const telegramConversations = useMemo(
    () => userData?.telegramConversations || [],
    [userData?.telegramConversations]
  );
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
  const currentOrigin = window.location.origin;

  const isVoiceMode = mode === "voice";
  const assistantWakeName =
    (userData?.assistantName || "Assistant").trim() || "Assistant";

  const extractWakeCommand = useCallback((transcript) => {
    const wakeName = (userDataRef.current?.assistantName || "Assistant").trim();

    if (!wakeName) {
      return transcript.trim();
    }

    const escapedWakeName = wakeName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const wakePattern = new RegExp(
      `^(?:hey|hi|hello)?\\s*${escapedWakeName}[\\s,!.?-]*(.*)$`,
      "i"
    );
    const match = transcript.trim().match(wakePattern);

    if (!match) {
      return null;
    }

    return match[1]?.trim() || "";
  }, []);

  const startRecognition = useCallback(() => {
    if (
      !assistantEnabled ||
      !isVoiceMode ||
      !recognitionRef.current ||
      isSpeakingRef.current ||
      isRecognizingRef.current
    ) {
      return;
    }

    try {
      recognitionRef.current.start();
    } catch (error) {
      if (error.name !== "InvalidStateError") {
        console.error("Speech recognition start failed:", error);
      }
    }
  }, [assistantEnabled, isVoiceMode]);

  const startInterruptRecognition = useCallback(() => {
    if (
      !assistantEnabled ||
      !isVoiceMode ||
      !recognitionRef.current ||
      isRecognizingRef.current
    ) {
      return;
    }

    try {
      recognitionRef.current.start();
    } catch (error) {
      if (error.name !== "InvalidStateError") {
        console.error("Interrupt recognition start failed:", error);
      }
    }
  }, [assistantEnabled, isVoiceMode]);

  const shouldIgnoreSpeechEcho = useCallback((transcript) => {
    const spokenResponse = spokenResponseRef.current.trim().toLowerCase();
    const normalizedTranscript = transcript.trim().toLowerCase();

    if (!spokenResponse || !normalizedTranscript) {
      return false;
    }

    if (spokenResponse.includes(normalizedTranscript)) {
      return true;
    }

    const spokenWords = new Set(spokenResponse.split(/\s+/).filter(Boolean));
    const transcriptWords = normalizedTranscript.split(/\s+/).filter(Boolean);

    if (!transcriptWords.length) {
      return false;
    }

    const matchingWords = transcriptWords.filter((word) => spokenWords.has(word)).length;
    return matchingWords / transcriptWords.length >= 0.8;
  }, []);

  const speak = useCallback(
    (text) => {
      if (!text?.trim()) {
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "en-US";
      utterance.rate = 1.05;
      utterance.pitch = 1;

      const voices = synth.getVoices();
      const preferredVoice = voices.find((voice) => voice.lang.startsWith("en"));
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      spokenResponseRef.current = text;
      isSpeakingRef.current = true;
      setSpeaking(true);

      utterance.onend = () => {
        spokenResponseRef.current = "";
        isSpeakingRef.current = false;
        setSpeaking(false);
        setVoiceThinking(false);
        if (assistantEnabled && isVoiceMode) {
          setTimeout(startRecognition, VOICE_RESTART_DELAY_MS);
        }
      };

      utterance.onerror = (event) => {
        console.error("Speech synthesis failed:", event.error);
        spokenResponseRef.current = "";
        isSpeakingRef.current = false;
        setSpeaking(false);
        setVoiceThinking(false);
        if (assistantEnabled && isVoiceMode) {
          setTimeout(startRecognition, VOICE_ERROR_RESTART_DELAY_MS);
        }
      };

      synth.cancel();
      synth.speak(utterance);
      setTimeout(startInterruptRecognition, VOICE_INTERRUPT_ARM_DELAY_MS);
    },
    [
      assistantEnabled,
      isVoiceMode,
      startInterruptRecognition,
      startRecognition,
      synth,
    ]
  );

  const applyAssistantAction = useCallback(({ type, userInput, response }) => {
    if (type === "google-search" && userInput) {
      window.open(
        `https://www.google.com/search?q=${encodeURIComponent(userInput)}`,
        "_blank"
      );
    }

    if (type === "youtube-search" || type === "youtube-play") {
      if (userInput) {
        window.open(
          `https://www.youtube.com/results?search_query=${encodeURIComponent(
            userInput
          )}`,
          "_blank"
        );
      }
    }

    if (type === "youtube-open") {
      window.open("https://www.youtube.com/", "_blank");
    }

    if (type === "calculator-open") {
      window.open("https://www.google.com/search?q=calculator", "_blank");
    }

    if (type === "instagram-open") {
      window.open("https://www.instagram.com/", "_blank");
    }

    if (type === "facebook-open") {
      window.open("https://www.facebook.com/", "_blank");
    }

    if (type === "weather-show") {
      window.open("https://www.google.com/search?q=weather", "_blank");
    }

    return response;
  }, []);

  const requestAssistant = useCallback(
    async (prompt, sourceMode, conversationId = null, explicitModel = null) => {
      const serverResponse = await getGeminiResponse(
        prompt,
        sourceMode,
        conversationId,
        explicitModel || selectedModel
      );
      const parsedResponse =
        typeof serverResponse === "string"
          ? JSON.parse(serverResponse.replace(/```json\n?|\n?```/g, "").trim())
          : serverResponse;

      const safeResponse =
        parsedResponse?.response
          ? parsedResponse
          : {
              type: "chat",
              userInput: prompt,
              response:
                "I received your request but could not process it properly.",
            };
      const resolvedConversationId =
        parsedResponse?.conversationId || conversationId || null;

      applyAssistantAction(safeResponse);

      if (sourceMode === "voice") {
        voiceConversationIdRef.current = resolvedConversationId;
        setActiveConversationId(resolvedConversationId);
        setSelectedThreadKey(resolvedConversationId);
        setVoiceThinking(false);
        setAiText(safeResponse.response);
        setUserText("");
        speak(safeResponse.response);
      }

      if (sourceMode === "chat") {
        setActiveConversationId(parsedResponse?.conversationId || conversationId || null);
        setChatMessages((current) => [
          ...current,
          { role: "assistant", content: safeResponse.response },
        ]);
      }

      setUserData((current) => {
        if (!current) {
          return current;
        }

        const historyKey = sourceMode === "chat" ? "chatHistory" : "voiceHistory";
        const conversationKey =
          sourceMode === "chat" ? "chatConversations" : "voiceConversations";
        const existingHistory = Array.isArray(current[historyKey])
          ? current[historyKey]
          : [];
        const existingConversations = Array.isArray(current[conversationKey])
          ? current[conversationKey]
          : [];
        const nextConversationId =
          resolvedConversationId || `temp-${Date.now()}`;
        const matchingConversation = existingConversations.find(
          (conversation) => conversation.conversationId === nextConversationId
        );
        const nextMessages = [
          ...(matchingConversation?.messages || []),
          { role: "user", content: prompt },
          { role: "assistant", content: safeResponse.response },
        ];
        const nextConversation = {
          conversationId: nextConversationId,
          title: matchingConversation?.title || prompt.slice(0, 60) || "New chat",
          messages: nextMessages,
        };

        return {
          ...current,
          [historyKey]: [
            ...existingHistory,
            `user: ${prompt}`,
            `assistant: ${safeResponse.response}`,
          ].slice(-12),
          [conversationKey]: [
            ...existingConversations.filter(
              (conversation) => conversation.conversationId !== nextConversationId
            ),
            nextConversation,
          ],
        };
      });
    },
    [applyAssistantAction, getGeminiResponse, setUserData, speak, selectedModel]
  );

  requestAssistantRef.current = requestAssistant;

  useEffect(() => {
    userDataRef.current = userData;
  }, [userData]);

  useEffect(() => {
    const sessionGreetingKey =
      userData?._id || userData?.email || userData?.name || "";

    if (!sessionGreetingKey) {
      return;
    }

    if (greetedSessionKeyRef.current !== sessionGreetingKey) {
      greetedSessionKeyRef.current = sessionGreetingKey;
      hasPlayedVoiceGreetingRef.current = false;
    }
  }, [userData]);

  const uploadChatAsset = useCallback(
    async (file) => {
      const formData = new FormData();
      formData.append("asset", file);

      const result = await axios.post(`${serverUrl}/api/user/upload`, formData, {
        withCredentials: true,
      });

      return result.data;
    },
    [serverUrl]
  );

  const handleFileSelected = useCallback(
    async (event) => {
      const file = event.target.files?.[0];
      event.target.value = "";

      if (!file) {
        return;
      }

      setUploadingAsset(true);
      setComposerMenuOpen(false);

      try {
        const uploadedAsset = await uploadChatAsset(file);
        setPendingAssets((current) => [
          ...current,
          {
            id: `${Date.now()}-${file.name}`,
            url: uploadedAsset.url,
            name: uploadedAsset.originalName || file.name,
            mimeType: uploadedAsset.mimeType || file.type,
          },
        ]);
      } catch (error) {
        console.error("Chat asset upload failed:", error);
      } finally {
        setUploadingAsset(false);
      }
    },
    [uploadChatAsset]
  );

  const removePendingAsset = useCallback((assetId) => {
    setPendingAssets((current) => current.filter((asset) => asset.id !== assetId));
  }, []);

  const buildChatContent = useCallback((prompt, assets = []) => {
    const assetLines = assets.map((asset) => {
      const kind = asset.mimeType?.startsWith("audio/")
        ? "Voice note"
        : asset.mimeType?.startsWith("image/")
        ? "Image"
        : "File";

      return `[${kind}: ${asset.name}](${asset.url})`;
    });

    return [prompt, ...assetLines].filter(Boolean).join("\n\n");
  }, []);

  const toggleVoiceNoteRecording = useCallback(async () => {
    if (recordingVoiceNote) {
      mediaRecorderRef.current?.stop();
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      setChatMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "Voice recording is not supported in this browser.",
        },
      ]);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      recordedChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecordingVoiceNote(false);

        const audioBlob = new Blob(recordedChunksRef.current, {
          type: recorder.mimeType || "audio/webm",
        });
        const voiceFile = new File([audioBlob], `voice-note-${Date.now()}.webm`, {
          type: audioBlob.type,
        });

        setUploadingAsset(true);
        try {
          const uploadedAsset = await uploadChatAsset(voiceFile);
          setPendingAssets((current) => [
            ...current,
            {
              id: `${Date.now()}-voice-note`,
              url: uploadedAsset.url,
              name: uploadedAsset.originalName || voiceFile.name,
              mimeType: uploadedAsset.mimeType || voiceFile.type,
            },
          ]);
        } catch (error) {
          console.error("Voice note upload failed:", error);
        } finally {
          setUploadingAsset(false);
          recordedChunksRef.current = [];
        }
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setRecordingVoiceNote(true);
    } catch (error) {
      console.error("Voice recording failed:", error);
      setRecordingVoiceNote(false);
    }
  }, [recordingVoiceNote, uploadChatAsset]);

  const handleChatSubmit = useCallback(async () => {
    if (!assistantEnabled) {
      return;
    }

    const prompt = chatInput.trim();
    if ((!prompt && pendingAssets.length === 0) || chatLoading || uploadingAsset) {
      return;
    }

    const assetsForMessage = pendingAssets;
    const messageContent = buildChatContent(prompt, assetsForMessage);
    const latestChatConversation =
      chatConversations[chatConversations.length - 1]?.conversationId || null;
    const nextConversationId = isDraftChat
      ? null
      : activeConversationId || latestChatConversation;
    setSelectedThreadKey(nextConversationId || null);
    setIsDraftChat(false);
    setChatLoading(true);
    setChatMessages((current) => [...current, { role: "user", content: messageContent }]);
    setChatInput("");
    setPendingAssets([]);
    setComposerMenuOpen(false);

    try {
      await requestAssistant(messageContent, "chat", nextConversationId);
    } catch (error) {
      console.error("Chat request failed:", error);
      setChatMessages((current) => [
        ...current,
        {
          role: "assistant",
          content: "Sorry, I am having trouble processing your request right now.",
        },
      ]);
    } finally {
      setChatLoading(false);
    }
  }, [
    activeConversationId,
    assistantEnabled,
    chatConversations,
    chatInput,
    chatLoading,
    buildChatContent,
    isDraftChat,
    pendingAssets,
    requestAssistant,
    uploadingAsset,
  ]);

  const handleLogOut = async () => {
    try {
      await axios.get(`${serverUrl}/api/auth/logout`, {
        withCredentials: true,
      });
    } catch {
      return undefined;
    } finally {
      setUserData(null);
      navigate("/signin");
    }
  };

  const stopAssistant = useCallback(() => {
    setAssistantEnabled(false);
    setListening(false);
    setUserText("");
    setAiText("Assistant paused");
    isRecognizingRef.current = false;
    isSpeakingRef.current = false;
    synth.cancel();
    recognitionRef.current?.stop();
  }, [synth]);

  const startAssistant = useCallback(() => {
    setAssistantEnabled(true);
    setAiText("Assistant active");
    if (isVoiceMode) {
      setTimeout(startRecognition, 200);
    }
  }, [isVoiceMode, startRecognition]);

  const toggleAssistant = useCallback(() => {
    if (assistantEnabled) {
      stopAssistant();
      return;
    }

    startAssistant();
  }, [assistantEnabled, startAssistant, stopAssistant]);

  const handleNewChat = useCallback(() => {
    voiceConversationIdRef.current = null;
    setSelectedThreadKey(null);
    setActiveConversationId(null);
    setIsDraftChat(true);
    setChatMessages([]);
    setChatInput("");
    setUserText("");
    setAiText("");
    setThreadMenuOpen(null);
    setProfileMenuOpen(false);
    setHam(false);
  }, []);
  const closeProfileMenu = useCallback(() => {
    setProfileMenuOpen(false);
  }, []);
  const buildConversationShareLink = useCallback(
    ({ conversationId, mode: conversationMode, source = "assistant" }) => {
      const shareUrl = new URL(window.location.pathname, currentOrigin);
      shareUrl.searchParams.set("mode", conversationMode);
      shareUrl.searchParams.set("conversation", conversationId);
      shareUrl.searchParams.set("source", source);
      return shareUrl.toString();
    },
    [currentOrigin]
  );
  const getConversationKeyByMode = useCallback((mode) => {
    if (mode === "telegram") {
      return "telegramConversations";
    }

    if (mode === "voice") {
      return "voiceConversations";
    }

    return "chatConversations";
  }, []);
  const handleRenameConversation = useCallback(async () => {
    if (!renameModal || !renameValue.trim()) {
      return;
    }

    await renameConversation(
      renameModal.mode,
      renameModal.conversationId,
      renameValue
    );
    setUserData((current) => {
      if (!current) return current;
      const conversationKey = getConversationKeyByMode(renameModal.mode);
      return {
        ...current,
        [conversationKey]: (current[conversationKey] || []).map((conversation) =>
          conversation.conversationId === renameModal.conversationId
            ? { ...conversation, title: renameValue.trim().slice(0, 80) }
            : conversation
        ),
      };
    });
    setRenameModal(null);
    setRenameValue("");
  }, [getConversationKeyByMode, renameConversation, renameModal, renameValue, setUserData]);
  const handleDeleteConversation = useCallback(async () => {
    if (!deleteModal) {
      return;
    }

    await deleteConversation(deleteModal.mode, deleteModal.conversationId);
    setUserData((current) => {
      if (!current) return current;
      const conversationKey = getConversationKeyByMode(deleteModal.mode);
      return {
        ...current,
        [conversationKey]: (current[conversationKey] || []).filter(
          (conversation) => conversation.conversationId !== deleteModal.conversationId
        ),
      };
    });
    if (selectedThreadKey === deleteModal.threadKey) {
      setSelectedThreadKey(null);
      setActiveConversationId(null);
      setChatMessages([]);
    }
    setDeleteModal(null);
  }, [deleteConversation, deleteModal, getConversationKeyByMode, selectedThreadKey, setUserData]);
  const handleShareConversation = useCallback(async (shareLink) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Shared conversation",
          url: shareLink,
        });
        setShareStatus("Conversation link shared.");
        return;
      }

      await navigator.clipboard.writeText(shareLink);
      setShareStatus("Conversation link copied.");
    } catch {
      setShareModalLink(shareLink);
      setShareStatus("");
    } finally {
      window.setTimeout(() => setShareStatus(""), 2500);
    }
  }, []);

  const handleInstallApp = useCallback(
    async () => {
      if (isStandalone) {
        setInstallStatus("App is already installed.");
        return;
      }

      if (installPromptEvent) {
        installPromptEvent.prompt();
        const { outcome } = await installPromptEvent.userChoice;
        setInstallPromptEvent(null);
        setInstallStatus(
          outcome === "accepted"
            ? "Installing app."
            : "Install prompt dismissed."
        );
        return;
      }

      setInstallStatus(
        "If the install prompt does not appear, use your browser menu to install or add this app to the home screen."
      );
    },
    [installPromptEvent, isStandalone]
  );

  useEffect(() => {
    window.localStorage.setItem(
      ASSISTANT_STATE_STORAGE_KEY,
      String(assistantEnabled)
    );
    setAssistantState(assistantEnabled);
  }, [assistantEnabled, setAssistantState]);

  useEffect(() => {
    if (!isVoiceMode) {
      setListening(false);
      isRecognizingRef.current = false;
      recognitionRef.current?.stop();
      synth.cancel();
      setSpeaking(false);
      setVoiceThinking(false);
      hasPlayedVoiceGreetingRef.current = false;
    } else if (assistantEnabled) {
      setTimeout(startRecognition, VOICE_WAKE_RETRY_DELAY_MS);
    }
  }, [assistantEnabled, isVoiceMode, startRecognition, synth]);

  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setInstallPromptEvent(event);
      setInstallStatus("App can be installed on this device.");
    };

    const handleAppInstalled = () => {
      setInstallPromptEvent(null);
      setInstallStatus("App installed successfully.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setAiText("Speech recognition is not supported in this browser.");
      return undefined;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognitionRef.current = recognition;

    let isMounted = true;

    recognition.onstart = () => {
      isRecognizingRef.current = true;
      setListening(!isSpeakingRef.current);
      setVoiceThinking(false);
    };

    recognition.onend = () => {
      isRecognizingRef.current = false;
      if (!isSpeakingRef.current) {
        setListening(false);
      }
      if (isMounted && assistantEnabled && isVoiceMode && !isSpeakingRef.current && !isWaitingForResponseRef.current) {
        setTimeout(startRecognition, VOICE_IDLE_RESTART_DELAY_MS);
      }
    };

    recognition.onerror = (event) => {
      console.warn("Recognition error:", event.error);
      isRecognizingRef.current = false;
      if (!isSpeakingRef.current) {
        setListening(false);
      }
      if (
        isMounted &&
        assistantEnabled &&
        isVoiceMode &&
        event.error !== "aborted" &&
        !isSpeakingRef.current &&
        !isWaitingForResponseRef.current
      ) {
        setTimeout(startRecognition, VOICE_ERROR_RESTART_DELAY_MS);
      }
    };

    recognition.onresult = async (event) => {
      const transcript =
        event.results[event.results.length - 1][0].transcript.trim();

      if (!transcript) {
        return;
      }

      const isInterruptingSpeech = isSpeakingRef.current;

      if (isInterruptingSpeech && shouldIgnoreSpeechEcho(transcript)) {
        return;
      }

      let nextCommand = transcript;

      if (isInterruptingSpeech) {
        const wakeCommand = extractWakeCommand(transcript);

        if (wakeCommand === null) {
          return;
        }

        recognition.stop();
        isRecognizingRef.current = false;
        setListening(false);
        synth.cancel();
        spokenResponseRef.current = "";
        isSpeakingRef.current = false;
        setSpeaking(false);
        setVoiceThinking(true);

        if (!wakeCommand) {
          setUserText(transcript);
          setAiText(`${assistantWakeName} is listening.`);
          setVoiceThinking(false);
          if (assistantEnabled && isVoiceMode) {
            setTimeout(startRecognition, VOICE_WAKE_RETRY_DELAY_MS);
          }
          return;
        }

        nextCommand = wakeCommand;
      } else {
        recognition.stop();
        isRecognizingRef.current = false;
        setListening(false);
        const wakeCommand = extractWakeCommand(transcript);

        if (wakeCommand === null) {
          setUserText("");
          setAiText(`Say "${assistantWakeName}" before your command.`);
          setVoiceThinking(false);
          if (assistantEnabled && isVoiceMode) {
            setTimeout(startRecognition, VOICE_WAKE_RETRY_DELAY_MS);
          }
          return;
        }

        if (!wakeCommand) {
          setUserText(transcript);
          setAiText(`${assistantWakeName} is listening.`);
          setVoiceThinking(false);
          if (assistantEnabled && isVoiceMode) {
            setTimeout(startRecognition, VOICE_WAKE_RETRY_DELAY_MS);
          }
          return;
        }

        nextCommand = wakeCommand;
        setVoiceThinking(true);
      }

      setUserText(transcript);
      setAiText("");
      isWaitingForResponseRef.current = true;

      try {
        await requestAssistantRef.current?.(
          nextCommand,
          "voice",
          voiceConversationIdRef.current,
          selectedModelRef.current
        );
      } catch (error) {
        console.error("Assistant request failed:", error);
        const fallbackResponse =
          "Sorry, I am having trouble processing your request right now.";
        setVoiceThinking(false);
        setAiText(fallbackResponse);
        setUserText("");
        speak(fallbackResponse);
      } finally {
        isWaitingForResponseRef.current = false;
      }
    };

    const startTimeout =
      assistantEnabled && isVoiceMode
        ? setTimeout(startRecognition, VOICE_IDLE_RESTART_DELAY_MS)
        : null;

    return () => {
      isMounted = false;
      if (startTimeout) {
        clearTimeout(startTimeout);
      }
      recognition.stop();
      synth.cancel();
      setListening(false);
      isRecognizingRef.current = false;
      isSpeakingRef.current = false;
      setSpeaking(false);
      setVoiceThinking(false);
    };
  }, [
    assistantEnabled,
    assistantWakeName,
    extractWakeCommand,
    isVoiceMode,
    speak,
    shouldIgnoreSpeechEcho,
    startRecognition,
    synth,
  ]);

  const voiceVisualState = !assistantEnabled
    ? "stopped"
    : listening
    ? "listening"
    : voiceThinking
    ? "thinking"
    : speaking
    ? "speaking"
    : "idle";

  useEffect(() => {
    if (!assistantEnabled || !isVoiceMode) {
      hasPlayedVoiceGreetingRef.current = false;
      return undefined;
    }

    if (hasPlayedVoiceGreetingRef.current) {
      return undefined;
    }

    const greetingTimeout = setTimeout(() => {
      const currentUser = userDataRef.current;
      const greeting = currentUser?.name
        ? `Hello ${currentUser.name}, I am ${
            currentUser.assistantName || "your assistant"
          }. What can I help you with?`
        : "Hello. What can I help you with?";

      hasPlayedVoiceGreetingRef.current = true;
      setAiText(greeting);
      speak(greeting);
    }, VOICE_GREETING_DELAY_MS);

    return () => {
      clearTimeout(greetingTimeout);
    };
  }, [assistantEnabled, isVoiceMode, speak]);

  const powerButtonClass = `h-[54px] px-[18px] flex items-center justify-center gap-[10px] rounded-full border cursor-pointer transition-all backdrop-blur-md ${
    assistantEnabled
      ? "bg-emerald-400/18 text-emerald-100 border-emerald-300/35 shadow-lg shadow-emerald-950/25 hover:bg-emerald-400/24"
      : "bg-red-400/18 text-red-100 border-red-300/35 shadow-lg shadow-red-950/25 hover:bg-red-400/24"
  }`;
  const mobileGlassButtonClass =
    "w-full sm:w-auto min-w-0 h-[54px] rounded-full cursor-pointer text-[17px] text-white font-semibold border border-white/15 bg-white/8 backdrop-blur-md shadow-lg shadow-black/20 hover:bg-white/14 transition-all px-[20px]";
  const mobileInstallButtonClass =
    "w-full sm:w-auto min-w-0 h-[54px] rounded-full cursor-pointer text-[17px] text-white font-semibold border border-cyan-300/35 bg-[linear-gradient(135deg,rgba(34,211,238,0.32),rgba(59,130,246,0.2))] shadow-[0_12px_30px_rgba(14,116,144,0.28)] hover:bg-[linear-gradient(135deg,rgba(34,211,238,0.4),rgba(59,130,246,0.26))] transition-all px-[20px]";
  const desktopGlassButtonClass =
    "min-w-0 w-full h-[42px] rounded-full cursor-pointer text-[13px] text-white font-medium border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.06))] shadow-lg shadow-black/15 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.09))] transition-all";
  const desktopInstallButtonClass =
    "min-w-0 w-full h-[42px] rounded-full cursor-pointer text-[13px] text-cyan-50 font-semibold border border-cyan-300/30 bg-[linear-gradient(135deg,rgba(34,211,238,0.24),rgba(59,130,246,0.16))] shadow-[0_10px_26px_rgba(8,145,178,0.24)] hover:bg-[linear-gradient(135deg,rgba(34,211,238,0.3),rgba(59,130,246,0.22))] transition-all";
  const desktopPowerButtonClass = `min-w-0 w-full h-[42px] px-[16px] flex items-center justify-center gap-[8px] rounded-full border cursor-pointer transition-all ${
    assistantEnabled
      ? "text-emerald-100 border-emerald-300/30 bg-[linear-gradient(180deg,rgba(52,211,153,0.20),rgba(52,211,153,0.10))] shadow-lg shadow-emerald-950/20 hover:bg-[linear-gradient(180deg,rgba(52,211,153,0.24),rgba(52,211,153,0.13))]"
      : "text-red-100 border-red-300/30 bg-[linear-gradient(180deg,rgba(248,113,113,0.20),rgba(248,113,113,0.10))] shadow-lg shadow-red-950/20 hover:bg-[linear-gradient(180deg,rgba(248,113,113,0.24),rgba(248,113,113,0.13))]"
  }`;
  const modeButtonClass = (currentMode) =>
    `min-w-[92px] h-[34px] rounded-full px-[14px] text-[13px] font-semibold transition-all ${
      mode === currentMode
        ? "bg-white/18 text-white border border-white/20 shadow-md shadow-black/20"
        : "bg-transparent text-white/65 border border-transparent hover:text-white hover:bg-white/8"
    }`;
  const desktopPanelHeight = "lg:h-full";
  const desktopSidebarClass = `hidden lg:flex w-[270px] shrink-0 rounded-[28px] lg:rounded-none border border-white/12 bg-white/6 backdrop-blur-xl shadow-2xl shadow-black/25 overflow-hidden flex-col ${desktopPanelHeight}`;
  const desktopMainPanelClass = `relative flex-1 min-w-0 rounded-[30px] lg:rounded-none border border-white/12 bg-white/6 backdrop-blur-xl shadow-2xl shadow-black/30 overflow-hidden flex flex-col ${desktopPanelHeight}`;
  const sidebarToggleButtonClass =
    "w-[30px] h-[72px] shrink-0 rounded-l-[14px] rounded-r-[6px] border border-white/12 border-r-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04))] text-white/72 flex items-center justify-center shadow-[0_10px_24px_rgba(0,0,0,0.22)] hover:text-white hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.08))] transition-all";
  const collapsedSidebarRailClass = `hidden lg:flex w-[56px] shrink-0 ${desktopPanelHeight} border-r border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] flex-col items-center py-[14px]`;
  const sidebarRevealButtonClass =
    "w-[36px] h-[36px] rounded-[10px] border border-white/10 bg-white/7 text-white/78 flex items-center justify-center hover:text-white hover:bg-white/12 transition-all";
  const modeSwitch = (
    <div className="flex items-center gap-[8px] max-[380px]:flex-col">
      <div className="flex w-full max-w-[250px] items-center gap-[6px] rounded-full border border-white/12 bg-white/6 backdrop-blur-xl p-[4px] shadow-xl shadow-black/25 max-[380px]:flex-col max-[380px]:rounded-[22px]">
        <button className={modeButtonClass("voice")} onClick={() => setMode("voice")}>
          Voice Mode
        </button>
        <button className={modeButtonClass("chat")} onClick={() => setMode("chat")}>
          Chat Mode
        </button>
      </div>
      <div className="relative" ref={modelDropdownRef}>
        <button
          onClick={() => setModelDropdownOpen((v) => !v)}
          className="flex items-center gap-[6px] h-[34px] rounded-full border border-white/12 bg-white/6 backdrop-blur-xl px-[10px] text-[11px] text-white/80 outline-none cursor-pointer hover:bg-white/10 hover:text-white transition-all whitespace-nowrap"
          title="Select AI model"
        >
          <svg className="w-[12px] h-[12px] text-cyan-300/70 shrink-0" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
          </svg>
          <span className="max-w-[90px] truncate">{AVAILABLE_MODELS.find((m) => m.id === selectedModel)?.name || "Model"}</span>
          <svg className={`w-[10px] h-[10px] text-white/50 shrink-0 transition-transform ${modelDropdownOpen ? "rotate-180" : ""}`} fill="currentColor" viewBox="0 0 24 24">
            <path d="M7 10l5 5 5-5z"/>
          </svg>
        </button>
        {modelDropdownOpen && (
          <div className="absolute right-0 top-[40px] w-[200px] rounded-[16px] border border-white/12 bg-[linear-gradient(180deg,rgba(17,24,39,0.98),rgba(10,16,30,0.98))] backdrop-blur-2xl shadow-[0_24px_70px_rgba(0,0,0,0.45)] p-[6px] z-50 flex flex-col gap-[2px]">
            {AVAILABLE_MODELS.map((m) => (
              <button
                key={m.id}
                onClick={() => { changeModel(m.id); setModelDropdownOpen(false); }}
                className={`w-full text-left px-[10px] py-[8px] rounded-[10px] text-[12px] transition-all ${
                  m.id === selectedModel
                    ? "bg-cyan-400/14 text-cyan-100 border border-cyan-300/20"
                    : "text-white/72 hover:bg-white/8 hover:text-white border border-transparent"
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
  const profileMenu = (
    <div className="absolute left-0 bottom-[48px] w-[220px] rounded-[18px] border border-white/12 bg-[linear-gradient(180deg,rgba(17,24,39,0.96),rgba(10,16,30,0.96))] backdrop-blur-xl shadow-[0_24px_70px_rgba(0,0,0,0.38)] p-[10px] flex flex-col gap-[8px] z-30">
      <button
        className={desktopPowerButtonClass}
        onClick={() => {
          toggleAssistant();
          closeProfileMenu();
        }}
        title={assistantEnabled ? "Stop assistant" : "Start assistant"}
      >
        <IoPower className="w-[15px] h-[15px]" />
        <span className="text-[13px] font-medium">
          {assistantEnabled ? "Assistant On" : "Assistant Off"}
        </span>
      </button>
      <button
        className={desktopGlassButtonClass}
        onClick={() => {
          navigate("/customize");
          closeProfileMenu();
        }}
      >
        Customize Assistant
      </button>
      <button
        className={desktopInstallButtonClass}
        onClick={() => {
          handleInstallApp();
          closeProfileMenu();
        }}
      >
        <span className="flex items-center justify-center gap-[8px]">
          <IoDownloadOutline className="w-[14px] h-[14px]" />
          Install App
        </span>
      </button>
      <button
        className={desktopGlassButtonClass}
        onClick={() => {
          closeProfileMenu();
          handleLogOut();
        }}
      >
        Log Out
      </button>
    </div>
  );
  const getHistoryPreview = (historyItem = "") => {
    const normalizedItem = historyItem.replace(/^(user|assistant):\s*/i, "").trim();
    if (!normalizedItem) {
      return "Conversation";
    }

    return normalizedItem.length > 42
      ? `${normalizedItem.slice(0, 42).trim()}...`
      : normalizedItem;
  };
  const getHistoryRole = (historyItem = "") => {
    if (historyItem === "assistant") {
      return "Assistant";
    }

    if (historyItem === "user") {
      return "You";
    }

    if (/^assistant:/i.test(historyItem)) {
      return "Assistant";
    }

    if (/^user:/i.test(historyItem)) {
      return "You";
    }

    return "Chat";
  };
  const renderSidebarHistoryItem = (thread, accent = "default") => {
    const accentClass =
      accent === "telegram"
        ? "border-cyan-300/10 bg-cyan-300/6 hover:bg-cyan-300/10"
        : "border-white/6 bg-white/[0.04] hover:bg-white/[0.08]";

    const badgeClass =
      accent === "telegram"
        ? "bg-cyan-300/14 text-cyan-100"
        : "bg-white/10 text-white/72";
    const isActive = selectedThreadKey === thread.key;

    return (
      <div
        key={`${accent}-${thread.key}`}
        className={`w-full rounded-[14px] border px-[11px] py-[10px] text-left transition-all ${
          isActive
            ? accent === "telegram"
              ? "border-cyan-300/28 bg-cyan-300/14"
              : "border-white/18 bg-white/12"
            : accentClass
        }`}
      >
        <div className="flex items-start gap-[8px] min-w-0">
          <button
            className="flex-1 min-w-0 text-left"
            onClick={() => {
              setSelectedThreadKey(thread.key);
              setActiveConversationId(thread.conversationId || null);
              if (accent !== "telegram" && isVoiceMode) {
                voiceConversationIdRef.current = thread.conversationId || null;
              }
              setIsDraftChat(false);
              if (accent !== "telegram") {
                setChatMessages([]);
              }
              setThreadMenuOpen(null);
            }}
          >
            <div className="flex items-center gap-[8px] min-w-0">
              <p className="flex-1 min-w-0 overflow-hidden text-ellipsis whitespace-nowrap text-[12px] text-white/86 font-medium">
                {getHistoryPreview(thread.title)}
              </p>
              <span className={`shrink-0 rounded-full px-[7px] py-[2px] text-[9px] font-medium ${badgeClass}`}>
                {thread.messages.length > 1
                  ? `${thread.messages.length} msgs`
                  : getHistoryRole(thread.messages[0]?.role || "")}
              </span>
            </div>
          </button>
          <div
            className="relative shrink-0 self-center"
            ref={threadMenuOpen === thread.conversationId ? threadMenuRef : null}
          >
            <button
              className="w-[24px] h-[24px] rounded-full text-white/55 hover:text-white hover:bg-white/8 flex items-center justify-center transition-all"
              onClick={() =>
                setThreadMenuOpen((current) =>
                  current === thread.conversationId ? null : thread.conversationId
                )
              }
              title="Conversation options"
            >
              <IoEllipsisHorizontal className="w-[14px] h-[14px]" />
            </button>
            {threadMenuOpen === thread.conversationId && (
              <div className="absolute right-0 top-[28px] w-[150px] rounded-[14px] border border-white/10 bg-[linear-gradient(180deg,rgba(17,24,39,0.98),rgba(10,16,30,0.98))] shadow-[0_18px_44px_rgba(0,0,0,0.34)] p-[6px] z-30 flex flex-col gap-[4px]">
                <button
                  className="h-[34px] rounded-[10px] text-[12px] text-white/82 hover:bg-white/8 transition-all text-left px-[10px]"
                  onClick={async () => {
                    const mode = accent === "telegram" ? "telegram" : isVoiceMode ? "voice" : "chat";
                    setRenameModal({
                      mode,
                      conversationId: thread.conversationId,
                    });
                    setRenameValue(thread.title || "");
                    setThreadMenuOpen(null);
                  }}
                >
                  Rename
                </button>
                <button
                  className="h-[34px] rounded-[10px] text-[12px] text-white/82 hover:bg-white/8 transition-all text-left px-[10px]"
                  onClick={async () => {
                    const mode = accent === "telegram" ? "voice" : isVoiceMode ? "voice" : "chat";
                    const source = accent === "telegram" ? "telegram" : "assistant";
                    const shareLink = buildConversationShareLink({
                      conversationId: thread.conversationId,
                      mode,
                      source,
                    });
                    await handleShareConversation(shareLink);
                    setThreadMenuOpen(null);
                  }}
                >
                  Share
                </button>
                <button
                  className="h-[34px] rounded-[10px] text-[12px] text-red-200 hover:bg-red-400/12 transition-all text-left px-[10px]"
                  onClick={() => {
                    const mode = accent === "telegram" ? "telegram" : isVoiceMode ? "voice" : "chat";
                    setDeleteModal({
                      mode,
                      conversationId: thread.conversationId,
                      threadKey: thread.key,
                      title: thread.title,
                    });
                    setThreadMenuOpen(null);
                  }}
                >
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  const assistantThreads = (
    isVoiceMode ? voiceConversations : chatConversations
  )
    .map((conversation) => ({
      key: conversation.conversationId,
      conversationId: conversation.conversationId,
      title: conversation.title,
      messages: conversation.messages || [],
    }))
    .reverse();
  const telegramThreads = telegramConversations
    .map((conversation) => ({
      key: conversation.conversationId,
      conversationId: conversation.conversationId,
      title: conversation.title,
      messages: conversation.messages || [],
    }))
    .reverse();
  const selectedAssistantThread =
    assistantThreads.find((thread) => thread.key === selectedThreadKey) || null;
  const displayedChatMessages = selectedAssistantThread
    ? selectedAssistantThread.messages
    : chatMessages;
  const getAttachmentFromLine = (line = "") => {
    const match = line.match(/^\[(Image|Voice note|File):\s*(.+?)\]\((https?:\/\/.+)\)$/i);

    if (!match) {
      return null;
    }

    return {
      type: match[1].toLowerCase(),
      name: match[2],
      url: match[3],
    };
  };
  const renderMessageContent = (content = "") => {
    const lines = String(content).split(/\n+/).filter(Boolean);

    return lines.map((line, index) => {
      const attachment = getAttachmentFromLine(line.trim());

      if (!attachment) {
        return <p key={`${line}-${index}`}>{line}</p>;
      }

      if (attachment.type === "image") {
        return (
          <a
            key={`${attachment.url}-${index}`}
            href={attachment.url}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-[14px] border border-white/10 bg-white/5"
          >
            <img
              src={attachment.url}
              alt={attachment.name}
              className="max-h-[400px] w-full object-contain"
            />
          </a>
        );
      }

      if (attachment.type === "voice note") {
        return (
          <div
            key={`${attachment.url}-${index}`}
            className="rounded-[14px] border border-white/10 bg-white/5 p-[10px]"
          >
            <p className="mb-[8px] text-[12px] text-white/58">{attachment.name}</p>
            <audio controls src={attachment.url} className="w-full" />
          </div>
        );
      }

      return (
        <a
          key={`${attachment.url}-${index}`}
          href={attachment.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-[8px] rounded-[12px] border border-white/10 bg-white/7 px-[12px] py-[9px] text-[13px] text-white/82 hover:bg-white/12"
        >
          <IoAttachOutline className="h-[16px] w-[16px]" />
          {attachment.name}
        </a>
      );
    });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const sharedConversationId = params.get("conversation");
    const sharedMode = params.get("mode");
    const sharedSource = params.get("source");

    if (!sharedConversationId) {
      return;
    }

    if (sharedMode === "chat" || sharedMode === "voice") {
      setMode(sharedMode);
    }

    if (sharedSource === "telegram") {
      setSidebarView("telegram");
      setDesktopSidebarOpen(true);
    }

    setActiveConversationId(sharedConversationId);
    setSelectedThreadKey(sharedConversationId);
    setIsDraftChat(false);
    if (sharedMode === "voice") {
      voiceConversationIdRef.current = sharedConversationId;
    }
  }, []);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        threadMenuRef.current &&
        !threadMenuRef.current.contains(event.target)
      ) {
        setThreadMenuOpen(null);
      }
      if (
        modelDropdownRef.current &&
        !modelDropdownRef.current.contains(event.target)
      ) {
        setModelDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayedChatMessages, chatLoading]);

  return (
    <div className="relative w-full min-h-[100vh] overflow-x-hidden bg-gradient-to-t from-[black] to-[#02023d] px-[10px] py-[10px] lg:px-0 lg:py-0">
      <CgMenuRight
        className="absolute right-[16px] top-[16px] z-30 h-[25px] w-[25px] text-white lg:hidden"
        onClick={() => setHam(true)}
      />

      <div
        className={`fixed inset-0 z-40 flex flex-col gap-[18px] overflow-y-auto bg-[#00000075] px-[20px] pt-[64px] pb-[20px] backdrop-blur-lg lg:hidden ${
          ham ? "translate-x-0" : "translate-x-full"
        } transition-transform duration-300`}
      >
        <RxCross1
          className="absolute right-[20px] top-[20px] h-[25px] w-[25px] text-white"
          onClick={() => setHam(false)}
        />
        <button className={mobileGlassButtonClass} onClick={handleLogOut}>
          Log Out
        </button>
        <button
          className={mobileGlassButtonClass}
          onClick={() => navigate("/customize")}
        >
          Customize your Assistant
        </button>
        <button
          className={mobileInstallButtonClass}
          onClick={handleInstallApp}
        >
          <span className="flex items-center justify-center gap-[8px]">
            <IoDownloadOutline className="w-[17px] h-[17px]" />
            Install App
          </span>
        </button>
        <button
          className={`${powerButtonClass} w-full sm:w-auto min-w-0`}
          onClick={toggleAssistant}
          title={assistantEnabled ? "Stop assistant" : "Start assistant"}
        >
          <IoPower className="w-[22px] h-[22px]" />
          <span className="text-[16px] font-semibold">
            {assistantEnabled ? "Turn Off" : "Turn On"}
          </span>
        </button>
        <div className="w-full h-[1px] bg-white/15"></div>
        {installStatus && (
          <p className="text-white/70 text-[13px] leading-[1.5]">
            {installStatus}
          </p>
        )}
        <button className={mobileGlassButtonClass} onClick={handleNewChat}>
          New Chat
        </button>
        <h1 className="text-white font-semibold text-[19px]">Your chats</h1>
        <div className="glass-scrollbar flex-1 min-h-0 w-full gap-[8px] overflow-y-auto pr-[4px] flex flex-col">
          {assistantThreads.map((thread) => renderSidebarHistoryItem(thread))}
        </div>
      </div>

      {renameModal && (
        <div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm flex items-center justify-center px-[20px]">
          <div className="w-full max-w-[420px] rounded-[26px] border border-white/12 bg-[linear-gradient(180deg,rgba(17,24,39,0.98),rgba(10,16,30,0.98))] shadow-[0_30px_90px_rgba(0,0,0,0.42)] p-[22px]">
            <h2 className="text-white text-[20px] font-semibold">Rename conversation</h2>
            <p className="text-white/60 text-[13px] mt-[6px]">
              Update the title for this conversation.
            </p>
            <input
              type="text"
              value={renameValue}
              onChange={(event) => setRenameValue(event.target.value)}
              className="mt-[18px] w-full h-[48px] rounded-[16px] border border-white/12 bg-white/6 px-[14px] text-white outline-none"
              placeholder="Conversation name"
              autoFocus
            />
            <div className="mt-[18px] flex justify-end gap-[10px]">
              <button
                className="h-[42px] px-[16px] rounded-full border border-white/10 bg-white/6 text-white/78"
                onClick={() => {
                  setRenameModal(null);
                  setRenameValue("");
                }}
              >
                Cancel
              </button>
              <button
                className="h-[42px] px-[18px] rounded-full border border-cyan-300/30 bg-cyan-300/14 text-cyan-100"
                onClick={handleRenameConversation}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteModal && (
        <div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm flex items-center justify-center px-[20px]">
          <div className="w-full max-w-[420px] rounded-[26px] border border-white/12 bg-[linear-gradient(180deg,rgba(17,24,39,0.98),rgba(10,16,30,0.98))] shadow-[0_30px_90px_rgba(0,0,0,0.42)] p-[22px]">
            <h2 className="text-white text-[20px] font-semibold">Delete conversation</h2>
            <p className="text-white/60 text-[13px] mt-[8px] leading-[1.6]">
              Are you sure you want to delete
              <span className="text-white"> {deleteModal.title || "this conversation"}</span>?
            </p>
            <div className="mt-[18px] flex justify-end gap-[10px]">
              <button
                className="h-[42px] px-[16px] rounded-full border border-white/10 bg-white/6 text-white/78"
                onClick={() => setDeleteModal(null)}
              >
                Cancel
              </button>
              <button
                className="h-[42px] px-[18px] rounded-full border border-red-300/30 bg-red-400/14 text-red-100"
                onClick={handleDeleteConversation}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {shareModalLink && (
        <div className="fixed inset-0 z-40 bg-black/55 backdrop-blur-sm flex items-center justify-center px-[20px]">
          <div className="w-full max-w-[460px] rounded-[26px] border border-white/12 bg-[linear-gradient(180deg,rgba(17,24,39,0.98),rgba(10,16,30,0.98))] shadow-[0_30px_90px_rgba(0,0,0,0.42)] p-[22px]">
            <h2 className="text-white text-[20px] font-semibold">Share conversation</h2>
            <p className="text-white/60 text-[13px] mt-[8px] leading-[1.6]">
              Copy or open this conversation link.
            </p>
            <input
              type="text"
              readOnly
              value={shareModalLink}
              className="mt-[18px] w-full h-[48px] rounded-[16px] border border-white/12 bg-white/6 px-[14px] text-white outline-none"
            />
            <div className="mt-[18px] flex justify-end gap-[10px]">
              <button
                className="h-[42px] px-[16px] rounded-full border border-white/10 bg-white/6 text-white/78"
                onClick={() => setShareModalLink(null)}
              >
                Close
              </button>
              <button
                className="h-[42px] px-[18px] rounded-full border border-cyan-300/30 bg-cyan-300/14 text-cyan-100"
                onClick={async () => {
                  await navigator.clipboard.writeText(shareModalLink);
                  setShareStatus("Conversation link copied.");
                  setShareModalLink(null);
                }}
              >
                Copy Link
              </button>
            </div>
          </div>
        </div>
      )}

      {shareStatus && (
        <div className="fixed bottom-[22px] left-1/2 -translate-x-1/2 z-40 rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(17,24,39,0.96),rgba(10,16,30,0.96))] px-[16px] py-[10px] text-[13px] text-white shadow-[0_18px_44px_rgba(0,0,0,0.34)]">
          {shareStatus}
        </div>
      )}

      <div className="flex w-full justify-center pt-[64px] pb-[12px] lg:h-[100vh] lg:min-h-0 lg:pt-0 lg:pb-0">
        {isVoiceMode ? (
          <div className="w-full flex gap-[10px] lg:gap-0 items-stretch">
            {desktopSidebarOpen ? (
              <aside className={desktopSidebarClass}>
                <div className="p-[14px] border-b border-white/10 flex items-start gap-[10px]">
                  <div className="flex-1 rounded-[22px] border border-white/10 bg-white/6 p-[14px]">
                    {sidebarView === "telegram" ? (
                      <>
                        <div className="flex items-center gap-[8px]">
                          <div className="w-[22px] h-[22px] rounded-full bg-cyan-400/16 text-cyan-200 flex items-center justify-center">
                            <FaTelegramPlane className="w-[11px] h-[11px]" />
                          </div>
                          <p className="text-white text-[15px] font-semibold">
                            Telegram Bot
                          </p>
                        </div>
                        <p className="text-white/55 text-[12px] mt-[6px]">
                          Telegram messages
                        </p>
                      </>
                    ) : (
                      <>
                        <p className="text-white text-[15px] font-semibold">
                          {userData?.assistantName}
                        </p>
                        <p className="text-white/55 text-[12px] mt-[4px]">
                          Voice workspace
                        </p>
                      </>
                    )}
                  </div>
                  <button
                    className={sidebarToggleButtonClass}
                    onClick={() => setDesktopSidebarOpen(false)}
                    title="Hide sidebar"
                  >
                    <PiSidebarSimpleFill className="w-[15px] h-[15px]" />
                  </button>
                </div>

                <div className="flex-1 min-h-0 p-[12px] flex flex-col gap-[10px]">
                  <div className="grid grid-cols-2 gap-[8px]">
                    <button
                      className={`h-[38px] rounded-[14px] border text-[12px] font-medium transition-all flex items-center justify-center gap-[7px] ${
                        sidebarView === "assistant"
                          ? "border-white/18 bg-white/12 text-white"
                          : "border-white/10 bg-white/5 text-white/65 hover:text-white hover:bg-white/8"
                      }`}
                      onClick={() => setSidebarView("assistant")}
                    >
                      <PiSidebarSimpleFill className="w-[13px] h-[13px]" />
                      Assistant
                    </button>
                    <button
                      className={`h-[38px] rounded-[14px] border text-[12px] font-medium transition-all flex items-center justify-center gap-[7px] ${
                        sidebarView === "telegram"
                          ? "border-cyan-300/24 bg-cyan-300/12 text-cyan-100"
                          : "border-cyan-300/10 bg-cyan-300/5 text-cyan-100/70 hover:text-cyan-100 hover:bg-cyan-300/10"
                      }`}
                      onClick={() => setSidebarView("telegram")}
                    >
                      <FaTelegramPlane className="w-[13px] h-[13px]" />
                      Telegram
                    </button>
                  </div>

                  {sidebarView === "telegram" ? (
                    <>
                      <div className="rounded-[18px] border border-cyan-300/12 bg-cyan-300/6 px-[12px] py-[10px]">
                        <p className="text-white text-[13px] font-medium">
                          {userData?.telegramUsername
                            ? `@${userData.telegramUsername}`
                            : "Official platform bot"}
                        </p>
                        <p className="text-white/55 text-[10px] mt-[3px]">
                          {userData?.telegramChatId
                            ? "Telegram connected"
                            : "Connect Telegram in settings"}
                        </p>
                      </div>

                      <div className="flex-1 min-h-0 border-t border-white/10 pt-[10px] flex flex-col">
                        <p className="text-white/52 text-[10px] uppercase tracking-[0.2em] px-[6px] mb-[8px]">
                          Your Telegram chats
                        </p>
                        <div className="glass-scrollbar flex-1 overflow-y-auto pr-[4px] flex flex-col gap-[6px]">
                          {telegramThreads.length ? (
                            telegramThreads.map((thread) =>
                              renderSidebarHistoryItem(thread, "telegram")
                            )
                          ) : (
                            <div className="rounded-[14px] border border-cyan-300/10 bg-cyan-300/6 px-[11px] py-[10px] text-[11px] text-white/52 leading-[1.45]">
                              No Telegram history yet.
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col gap-[8px]">
                        <p className="text-white/52 text-[10px] uppercase tracking-[0.2em] px-[6px]">
                          Assistant
                        </p>
                        <button className={desktopGlassButtonClass} onClick={handleNewChat}>
                          New Chat
                        </button>
                      </div>

                      <div className="flex-1 min-h-0 border-t border-white/10 pt-[10px] flex flex-col">
                        <p className="text-white/52 text-[10px] uppercase tracking-[0.2em] px-[6px] mb-[8px]">
                          Your chats
                        </p>
                        <div className="glass-scrollbar flex-1 overflow-y-auto pr-[4px] flex flex-col gap-[6px]">
                          {assistantThreads.length ? (
                            assistantThreads.map((thread) =>
                              renderSidebarHistoryItem(thread)
                            )
                          ) : (
                            <div className="rounded-[14px] border border-white/8 bg-white/5 px-[11px] py-[10px] text-[11px] text-white/52 leading-[1.45]">
                              No voice history yet.
                            </div>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  <div className="pt-[8px] border-t border-white/10 mt-auto relative">
                    {profileMenuOpen && profileMenu}
                    <button
                      className="w-[38px] h-[38px] rounded-full border border-white/10 bg-white/8 text-white/80 flex items-center justify-center text-[12px] font-semibold uppercase hover:bg-white/12 transition-all"
                      onClick={() => setProfileMenuOpen((current) => !current)}
                      title="Profile menu"
                    >
                      {userData?.name?.[0] || "U"}
                    </button>
                  </div>

                </div>
              </aside>
            ) : (
              <div className={collapsedSidebarRailClass}>
                <button
                  className={sidebarRevealButtonClass}
                  onClick={() => setDesktopSidebarOpen(true)}
                  title="Show sidebar"
                >
                  <PiSidebarSimpleFill className="w-[16px] h-[16px]" />
                </button>
                <div className="mt-[14px] w-[24px] h-[1px] bg-white/10"></div>
                <button
                  className="mt-[14px] w-[34px] h-[34px] rounded-[10px] border border-cyan-300/14 bg-cyan-300/8 text-cyan-100 flex items-center justify-center hover:bg-cyan-300/14 transition-all"
                  onClick={() => {
                    setSidebarView("telegram");
                    setDesktopSidebarOpen(true);
                  }}
                  title="Show Telegram panel"
                >
                  <FaTelegramPlane className="w-[14px] h-[14px]" />
                </button>
                <div className="mt-auto relative">
                  {profileMenuOpen && profileMenu}
                  <button
                    className="w-[34px] h-[34px] rounded-full border border-white/10 bg-white/8 text-white/80 flex items-center justify-center text-[11px] font-semibold uppercase"
                    onClick={() => setProfileMenuOpen((current) => !current)}
                    title="Profile menu"
                  >
                    {userData?.name?.[0] || "U"}
                  </button>
                </div>
              </div>
            )}

            <div className={`${desktopMainPanelClass} bg-[radial-gradient(circle_at_top,rgba(103,232,249,0.14),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.07),rgba(255,255,255,0.03))]`}>
              <div className="border-b border-white/10 px-[14px] pt-[14px] pb-[10px] sm:px-[20px] flex flex-col gap-[10px]">
                <div className="relative flex items-start justify-between gap-[14px]">
                  <div className="min-w-0 flex items-center">
                    <div className="hidden lg:flex">{modeSwitch}</div>
                  </div>
                  <div className="shrink-0 rounded-full border border-white/10 bg-white/6 px-[12px] py-[7px] text-[12px] text-white/80">
                    {assistantEnabled ? "Assistant active" : "Assistant stopped"}
                  </div>
                </div>
                <div className="flex justify-center lg:hidden">{modeSwitch}</div>
              </div>

              <div className="flex-1 min-h-0 px-[14px] sm:px-[20px] py-[14px] sm:py-[18px] overflow-y-auto">
                <div className="min-h-full max-w-[1020px] mx-auto rounded-[28px] sm:rounded-[34px] border border-white/12 bg-[linear-gradient(160deg,rgba(18,30,70,0.92),rgba(10,16,36,0.78)_52%,rgba(7,11,26,0.92))] shadow-[0_34px_100px_rgba(0,0,0,0.38)] overflow-hidden relative before:absolute before:inset-0 before:bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.08),transparent_28%)] before:pointer-events-none">
                  <div className="grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] items-stretch">
                    <div className="relative px-[16px] sm:px-[20px] py-[18px] sm:py-[22px] flex flex-col items-center text-center lg:border-r lg:border-white/10">
                    <div className="relative">
                      <div
                        className={`absolute inset-[-24px] rounded-full blur-3xl transition-all duration-500 ${
                          voiceVisualState === "listening"
                            ? "bg-cyan-300/32"
                            : voiceVisualState === "thinking"
                            ? "bg-amber-300/24"
                            : voiceVisualState === "speaking"
                            ? "bg-fuchsia-300/24"
                            : "bg-white/10"
                        }`}
                      ></div>
                      <div className="absolute inset-[6px] rounded-[22px] sm:rounded-[26px] bg-[radial-gradient(circle_at_top,rgba(148,163,184,0.16),transparent_62%)] blur-xl opacity-80"></div>
                      <div className="relative w-[180px] h-[180px] sm:w-[220px] sm:h-[220px] xl:w-[250px] xl:h-[250px] overflow-hidden rounded-[24px] sm:rounded-[28px] shadow-[0_24px_70px_rgba(2,6,23,0.34)]">
                        <img
                          src={userData?.assistantImage}
                          alt="Assistant"
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <div className="absolute inset-0 flex items-end justify-center pointer-events-none pb-[10px] sm:pb-[14px]">
                        <div
                            className={`voice-live-orb ${
                            voiceVisualState === "listening"
                              ? "voice-live-orb--listening"
                              : voiceVisualState === "thinking"
                              ? "voice-live-orb--thinking"
                              : voiceVisualState === "speaking"
                              ? "voice-live-orb--speaking"
                              : voiceVisualState === "stopped"
                              ? "voice-live-orb--stopped"
                              : "voice-live-orb--idle"
                          }`}
                        >
                          <span className="voice-live-orb__core"></span>
                          <span className="voice-live-orb__ring voice-live-orb__ring--one"></span>
                          <span className="voice-live-orb__ring voice-live-orb__ring--two"></span>
                          <span className="voice-live-orb__ring voice-live-orb__ring--three"></span>
                          <span className="voice-live-orb__dots"></span>
                        </div>
                      </div>
                    </div>

                    <div className="text-center mt-[14px] sm:mt-[18px]">
                      <h1 className="text-white text-[16px] sm:text-[18px] xl:text-[20px] font-semibold">
                        I&apos;m {userData?.assistantName}
                      </h1>
                    </div>

                    <div className="w-full mt-[16px] sm:mt-[20px] flex flex-col items-center gap-[12px] sm:gap-[14px]">
                      <div className="flex items-center justify-center min-h-[72px] sm:min-h-[88px]">
                        <div className="relative flex items-center justify-center">
                          <div
                            className={`absolute h-[96px] w-[96px] sm:h-[116px] sm:w-[116px] rounded-full blur-2xl transition-all duration-300 ${
                              voiceVisualState === "listening"
                                ? "bg-cyan-300/22"
                                : voiceVisualState === "thinking"
                                ? "bg-amber-300/18"
                                : voiceVisualState === "speaking"
                                ? "bg-fuchsia-300/18"
                                : "bg-white/10"
                            }`}
                          ></div>
                          {voiceVisualState === "listening" ? (
                            <img
                              src={userImg}
                              alt="User"
                              className="relative z-10 w-[82px] sm:w-[98px] xl:w-[108px] object-contain mix-blend-screen voice-avatar-listening"
                            />
                          ) : voiceVisualState === "thinking" ? (
                            <img
                              src={aiImg}
                              alt="AI"
                              className="relative z-10 w-[82px] sm:w-[98px] xl:w-[108px] object-contain mix-blend-screen brightness-110 contrast-125 voice-avatar-thinking"
                            />
                          ) : voiceVisualState === "speaking" ? (
                            <img
                              src={aiImg}
                              alt="AI"
                              className="relative z-10 w-[82px] sm:w-[98px] xl:w-[108px] object-contain mix-blend-screen brightness-125 contrast-125 voice-avatar-speaking"
                            />
                          ) : (
                            <div className="w-[68px] h-[68px] sm:w-[84px] sm:h-[84px] rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.05))] flex items-center justify-center shadow-[0_16px_40px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.14)]">
                              <div className="w-[14px] h-[14px] sm:w-[18px] sm:h-[18px] rounded-full bg-white/70"></div>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-[8px] px-[10px] py-[6px] text-[13px] text-white/82 bg-white/[0.03] backdrop-blur-sm rounded-full shadow-[0_8px_24px_rgba(0,0,0,0.14)]">
                        <span
                          className={`w-[9px] h-[9px] rounded-full ${
                            voiceVisualState === "listening"
                              ? "bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,0.9)]"
                              : voiceVisualState === "thinking"
                              ? "bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.75)]"
                              : voiceVisualState === "speaking"
                              ? "bg-fuchsia-300 shadow-[0_0_18px_rgba(232,121,249,0.75)]"
                              : assistantEnabled
                              ? "bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.6)]"
                              : "bg-red-300 shadow-[0_0_18px_rgba(252,165,165,0.5)]"
                          }`}
                        ></span>
                        <span>
                          {voiceVisualState === "listening"
                            ? "Listening"
                            : voiceVisualState === "thinking"
                            ? "Thinking"
                            : voiceVisualState === "speaking"
                            ? "Responding"
                            : assistantEnabled
                            ? "Waiting"
                            : "Stopped"}
                        </span>
                      </div>
                    </div>
                    </div>

                    <div className="px-[18px] sm:px-[24px] py-[18px] sm:py-[24px] flex items-center bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))] relative">
                      <div className="absolute inset-[14px] rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.01))] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"></div>
                      <div className="relative z-10 w-full">
                        {selectedAssistantThread ? (
                          <div className="flex flex-col gap-[10px]">
                            {selectedAssistantThread.messages.map((message, index) => (
                              <div
                                key={`${message.role}-${index}`}
                                className={`max-w-[94%] whitespace-pre-wrap break-words sm:max-w-[88%] px-[14px] py-[10px] rounded-[18px] text-[13px] sm:text-[14px] leading-[1.6] ${
                                  message.role === "user"
                                    ? "self-end ml-auto bg-cyan-400/16 border border-cyan-300/20 text-white"
                                    : "self-start bg-white/10 border border-white/10 text-white/92"
                                }`}
                              >
                                {message.content}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="w-full text-center text-white text-[14px] sm:text-[15px] xl:text-[17px] leading-[1.72]">
                            {userText
                              ? `You said: "${userText}"`
                              : aiText
                              ? aiText
                              : voiceVisualState === "listening"
                              ? "Listening..."
                              : voiceVisualState === "thinking"
                              ? "Thinking..."
                              : assistantEnabled
                              ? "Say something..."
                              : "Assistant is stopped"}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="w-full flex gap-[10px] lg:gap-0 items-stretch">
            {desktopSidebarOpen ? (
              <aside className={desktopSidebarClass}>
                <div className="p-[14px] border-b border-white/10 flex items-start gap-[10px]">
                  <div className="flex-1 rounded-[22px] border border-white/10 bg-white/6 p-[14px]">
                    <p className="text-white text-[15px] font-semibold">
                      {userData?.assistantName}
                    </p>
                    <p className="text-white/55 text-[12px] mt-[4px]">
                      Chat workspace
                    </p>
                  </div>
                  <button
                    className={sidebarToggleButtonClass}
                    onClick={() => setDesktopSidebarOpen(false)}
                    title="Hide sidebar"
                  >
                    <PiSidebarSimpleFill className="w-[15px] h-[15px]" />
                  </button>
                </div>

                <div className="flex-1 min-h-0 p-[12px] flex flex-col gap-[10px]">
                  <div className="flex flex-col gap-[8px]">
                    <p className="text-white/52 text-[10px] uppercase tracking-[0.2em] px-[6px]">
                      Assistant
                    </p>
                    <button className={desktopGlassButtonClass} onClick={handleNewChat}>
                      New Chat
                    </button>
                  </div>

                  <div className="flex-1 min-h-0 border-t border-white/10 pt-[10px] flex flex-col">
                    <p className="text-white/52 text-[10px] uppercase tracking-[0.2em] px-[6px] mb-[8px]">
                      Your chats
                    </p>
                    <div className="glass-scrollbar flex-1 overflow-y-auto pr-[4px] flex flex-col gap-[6px]">
                      {assistantThreads.length ? (
                        assistantThreads.map((thread) => renderSidebarHistoryItem(thread))
                      ) : (
                        <div className="rounded-[14px] border border-white/8 bg-white/5 px-[11px] py-[10px] text-[11px] text-white/52 leading-[1.45]">
                          No chat history yet.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-[8px] border-t border-white/10 mt-auto relative">
                    {profileMenuOpen && profileMenu}
                    <button
                      className="w-[38px] h-[38px] rounded-full border border-white/10 bg-white/8 text-white/80 flex items-center justify-center text-[12px] font-semibold uppercase hover:bg-white/12 transition-all"
                      onClick={() => setProfileMenuOpen((current) => !current)}
                      title="Profile menu"
                    >
                      {userData?.name?.[0] || "U"}
                    </button>
                  </div>
                </div>
              </aside>
            ) : (
              <div className={collapsedSidebarRailClass}>
                <button
                  className={sidebarRevealButtonClass}
                  onClick={() => setDesktopSidebarOpen(true)}
                  title="Show sidebar"
                >
                  <PiSidebarSimpleFill className="w-[16px] h-[16px]" />
                </button>
                <div className="mt-[14px] w-[24px] h-[1px] bg-white/10"></div>
                <div className="mt-auto relative">
                  {profileMenuOpen && profileMenu}
                  <button
                    className="w-[34px] h-[34px] rounded-full border border-white/10 bg-white/8 text-white/80 flex items-center justify-center text-[11px] font-semibold uppercase"
                    onClick={() => setProfileMenuOpen((current) => !current)}
                    title="Profile menu"
                  >
                    {userData?.name?.[0] || "U"}
                  </button>
                </div>
              </div>
            )}

            <div className={`${desktopMainPanelClass} bg-black`}>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,audio/*,.pdf,.doc,.docx,.txt"
                onChange={handleFileSelected}
              />

              <div className="flex h-[56px] items-center justify-between px-[18px] sm:px-[28px]">
                <button className="inline-flex items-center gap-[6px] text-[16px] font-medium text-white">
                  {userData?.assistantName || "ChatGPT"}
                  <IoChevronDown className="text-[14px] text-white/55" />
                </button>
                <div className="hidden lg:block">{modeSwitch}</div>
                <div className="lg:hidden">{modeSwitch}</div>
              </div>

              <div ref={chatContainerRef} className="glass-scrollbar flex-1 overflow-y-auto px-[14px] py-[18px] sm:px-[24px]">
                {displayedChatMessages.length === 0 ? (
                  <div className="mx-auto flex min-h-full w-full max-w-[760px] flex-col items-center justify-center pb-[90px] text-center">
                    <h1 className="text-[24px] font-medium text-white sm:text-[28px]">
                      Hey, {userData?.name || "there"}. Ready to dive in?
                    </h1>
                  </div>
                ) : (
                  <div className="mx-auto flex w-full max-w-[780px] flex-col gap-[18px] pb-[110px]">
                    {displayedChatMessages.map((message, index) => (
                      <div
                        key={`${message.role}-${index}`}
                        className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={`max-w-[92%] whitespace-pre-wrap break-words rounded-[22px] px-[15px] py-[11px] text-[14px] leading-[1.65] sm:max-w-[78%] ${
                            message.role === "user"
                              ? "bg-[#2f2f2f] text-white"
                              : "bg-transparent text-white/92"
                          }`}
                        >
                          <div className="flex flex-col gap-[10px]">
                            {renderMessageContent(message.content)}
                          </div>
                        </div>
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="self-start rounded-[18px] px-[15px] py-[11px] text-[14px] text-white/62">
                        Thinking...
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 px-[14px] pb-[18px] sm:px-[24px] sm:pb-[28px]">
                <div className="pointer-events-auto mx-auto w-full max-w-[760px]">
                  {pendingAssets.length > 0 && (
                    <div className="mb-[10px] flex flex-wrap gap-[8px]">
                      {pendingAssets.map((asset) => (
                        <div
                          key={asset.id}
                          className="flex max-w-full items-center gap-[8px] rounded-[14px] border border-white/10 bg-[#303030] px-[10px] py-[8px] text-[12px] text-white/78 shadow-lg shadow-black/20"
                        >
                          {asset.mimeType?.startsWith("image/") ? (
                            <IoImageOutline className="h-[16px] w-[16px]" />
                          ) : (
                            <IoAttachOutline className="h-[16px] w-[16px]" />
                          )}
                          <span className="max-w-[190px] truncate">{asset.name}</span>
                          <button
                            type="button"
                            className="rounded-full p-[2px] text-white/55 hover:bg-white/10 hover:text-white"
                            onClick={() => removePendingAsset(asset.id)}
                            title="Remove attachment"
                          >
                            <IoClose className="h-[14px] w-[14px]" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="relative rounded-[24px] bg-[#2a2a2a] shadow-[0_18px_70px_rgba(0,0,0,0.46)] ring-1 ring-white/8">
                    {composerMenuOpen && (
                      <div className="absolute bottom-[62px] left-[4px] w-[224px] rounded-[18px] border border-white/10 bg-[#343434] p-[8px] text-[14px] text-white shadow-[0_22px_70px_rgba(0,0,0,0.48)]">
                        <button
                          type="button"
                          className="flex w-full items-center gap-[10px] rounded-[11px] px-[10px] py-[9px] text-left hover:bg-white/8"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <IoAttachOutline className="h-[17px] w-[17px]" />
                          Add photos & files
                        </button>
                        <div className="my-[6px] h-px bg-white/10"></div>
                        <button
                          type="button"
                          className="flex w-full items-center gap-[10px] rounded-[11px] px-[10px] py-[9px] text-left hover:bg-white/8"
                          onClick={() => {
                            setChatInput("Create an image of ");
                            setComposerMenuOpen(false);
                          }}
                        >
                          <IoImageOutline className="h-[17px] w-[17px]" />
                          Create image
                        </button>
                        <button
                          type="button"
                          className="flex w-full items-center gap-[10px] rounded-[11px] px-[10px] py-[9px] text-left hover:bg-white/8"
                          onClick={() => {
                            setChatInput("Write or edit this: ");
                            setComposerMenuOpen(false);
                          }}
                        >
                          <IoAttachOutline className="h-[17px] w-[17px]" />
                          Write or edit
                        </button>
                      </div>
                    )}

                    <div className="flex min-h-[52px] items-center gap-[8px] px-[8px] py-[6px]">
                      <button
                        type="button"
                        className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full text-white/70 hover:bg-white/10 hover:text-white"
                        onClick={() => setComposerMenuOpen((current) => !current)}
                        title="Add"
                      >
                        <IoAdd className="h-[24px] w-[24px]" />
                      </button>

                      <input
                        type="text"
                        value={chatInput}
                        onChange={(event) => setChatInput(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            handleChatSubmit();
                          }
                        }}
                        placeholder={uploadingAsset ? "Uploading..." : "Ask anything"}
                        className="h-[40px] min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-white/45"
                        disabled={uploadingAsset}
                      />

                      <button
                        type="button"
                        className={`flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full transition-all ${
                          recordingVoiceNote
                            ? "bg-red-500 text-white"
                            : "text-white/72 hover:bg-white/10 hover:text-white"
                        }`}
                        onClick={toggleVoiceNoteRecording}
                        title={recordingVoiceNote ? "Stop voice note" : "Record voice note"}
                      >
                        {recordingVoiceNote ? (
                          <IoStop className="h-[18px] w-[18px]" />
                        ) : (
                          <IoMicOutline className="h-[19px] w-[19px]" />
                        )}
                      </button>

                      <button
                        type="button"
                        className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-full bg-white text-black transition-all hover:bg-white/88 disabled:cursor-not-allowed disabled:bg-white/18 disabled:text-white/35"
                        onClick={handleChatSubmit}
                        disabled={(!chatInput.trim() && pendingAssets.length === 0) || chatLoading || uploadingAsset}
                        title="Send"
                      >
                        <IoSend className="h-[18px] w-[18px]" />
                      </button>
                    </div>
                  </div>

                  {displayedChatMessages.length === 0 && (
                    <div className="mt-[22px] flex flex-wrap justify-center gap-[10px]">
                      {[
                        ["Create an image", "Create an image of "],
                        ["Write or edit", "Write a clean version of this: "],
                        ["Look something up", "Look up "],
                      ].map(([label, prompt]) => (
                        <button
                          key={label}
                          type="button"
                          className="rounded-full border border-white/12 bg-black px-[16px] py-[9px] text-[13px] text-white hover:bg-white/8"
                          onClick={() => setChatInput(prompt)}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Home;
