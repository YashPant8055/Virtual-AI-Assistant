import React, { useContext, useState } from "react";
import { userDataContext } from "../context/userDataContext";
import axios from "axios";
import { IoMdArrowRoundBack } from "react-icons/io";
import { useNavigate } from "react-router-dom";
function Customize2() {
  const {
    userData,
    backendImage,
    selectedImage,
    serverUrl,
    setUserData,
    createTelegramConnectSession,
    disconnectTelegram,
  } = useContext(userDataContext);
  const [assistantName, setAssistantName] = useState(
    userData?.assistantName || ""
  );
  const [loading, setLoading] = useState(false);
  const [telegramLoading, setTelegramLoading] = useState(false);
  const [telegramDisconnectLoading, setTelegramDisconnectLoading] = useState(false);
  const [telegramConnectData, setTelegramConnectData] = useState(null);
  const navigate = useNavigate();
  const handleUpdateAssistant = async () => {
    setLoading(true);
    try {
      let formData = new FormData();
      formData.append("assistantName", assistantName);
      if (backendImage) {
        formData.append("assistantImage", backendImage);
      } else {
        formData.append("imageUrl", selectedImage);
      }
      const result = await axios.post(
        `${serverUrl}/api/user/update`,
        formData,
        { withCredentials: true }
      );
      setLoading(false);
      setUserData(result.data);
      navigate("/");
    } catch {
      setLoading(false);
    }
  };

  const handleConnectTelegram = async () => {
    setTelegramLoading(true);
    try {
      const result = await createTelegramConnectSession();
      setTelegramConnectData(result);
      if (result.connected) {
        setUserData((current) =>
          current
            ? {
                ...current,
                telegramChatId: result.telegramChatId,
                telegramUsername: result.telegramUsername,
              }
            : current
        );
      }
    } finally {
      setTelegramLoading(false);
    }
  };

  const handleDisconnectTelegram = async () => {
    setTelegramDisconnectLoading(true);
    try {
      await disconnectTelegram();
      setTelegramConnectData(null);
      setUserData((current) =>
        current
          ? {
              ...current,
              telegramChatId: undefined,
              telegramUsername: undefined,
              telegramLinkedAt: undefined,
            }
          : current
      );
    } finally {
      setTelegramDisconnectLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-[100vh] w-full flex-col items-center justify-center bg-gradient-to-t from-[black] to-[#030353] p-[16px] sm:p-[20px]">
      <IoMdArrowRoundBack
        className="absolute top-[20px] left-[16px] h-[25px] w-[25px] cursor-pointer text-white sm:top-[30px] sm:left-[30px]"
        onClick={() => navigate("/customize")}
      />
      <h1 className="mb-[24px] mt-[30px] text-center text-[24px] text-white sm:mb-[30px] sm:mt-0 sm:text-[30px]">
        Enter Your <span className="text-blue-200">Assistant Name</span>
      </h1>
      <div className="flex w-full max-w-[760px] flex-col gap-[18px] sm:gap-[22px]">
        <div className="rounded-[24px] border border-white/12 bg-white/6 p-[18px] backdrop-blur-xl sm:rounded-[28px] sm:p-[24px]">
          <input
            type="text"
            placeholder="eg.Rivva"
            className="h-[56px] w-full rounded-full border-2 border-white bg-transparent px-[18px] py-[10px] text-[16px] text-white outline-none placeholder-gray-300 sm:h-[60px] sm:px-[20px] sm:text-[18px]"
            required
            onChange={(e) => setAssistantName(e.target.value)}
            value={assistantName}
          />
          {assistantName && (
            <button
              className="mt-[20px] flex min-h-[56px] w-full items-center justify-center rounded-[28px] bg-white px-[18px] py-[12px] text-center text-[16px] font-semibold leading-[1.35] text-black sm:mt-[24px] sm:min-h-[60px] sm:w-auto sm:min-w-[300px] sm:rounded-full sm:px-[26px] sm:text-[19px]"
              disabled={loading}
              onClick={handleUpdateAssistant}
            >
              {!loading ? "Finally create your Assistant" : "Loading...."}
            </button>
          )}
        </div>

        <div className="rounded-[24px] border border-white/12 bg-white/6 p-[18px] text-white backdrop-blur-xl sm:rounded-[28px] sm:p-[24px]">
          <div className="flex flex-col gap-[10px]">
            <h2 className="text-[21px] font-semibold sm:text-[24px]">Connect Telegram</h2>
            <p className="text-[14px] leading-[1.6] text-white/70 sm:text-[15px]">
              Open Telegram and start a conversation with our official assistant bot.
            </p>
            <p className="text-[12px] leading-[1.6] text-white/55 sm:text-[13px]">
              Once connected, Telegram stays linked to this account even after logout. It only changes if you disconnect it.
            </p>
            <div className="flex items-center gap-[10px] flex-wrap">
              <span
                className={`px-[14px] py-[7px] rounded-full text-[13px] font-medium border ${
                  userData?.telegramChatId
                    ? "border-emerald-300/30 bg-emerald-400/12 text-emerald-100"
                    : "border-white/12 bg-white/6 text-white/78"
                }`}
              >
                {userData?.telegramChatId ? "Telegram Connected" : "Telegram Not Connected"}
              </span>
              {userData?.telegramUsername && (
                <span className="text-[13px] text-white/65">
                  Linked as @{userData.telegramUsername}
                </span>
              )}
            </div>
          </div>

          <div className="mt-[18px] flex flex-col gap-[12px] sm:flex-row sm:flex-wrap">
            <button
              className="inline-flex min-h-[52px] w-full items-center justify-center rounded-[26px] border border-cyan-300/35 bg-[linear-gradient(135deg,rgba(34,211,238,0.28),rgba(59,130,246,0.18))] px-[18px] py-[12px] text-center text-[15px] font-semibold text-white shadow-[0_12px_30px_rgba(14,116,144,0.24)] transition-all hover:bg-[linear-gradient(135deg,rgba(34,211,238,0.38),rgba(59,130,246,0.24))] sm:min-w-[220px] sm:w-auto sm:rounded-full sm:px-[20px] sm:text-[16px]"
              disabled={telegramLoading}
              onClick={handleConnectTelegram}
            >
              {telegramLoading ? "Preparing..." : "Connect Telegram"}
            </button>

            {telegramConnectData?.botLink && (
              <a
                href={telegramConnectData.botLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-[52px] w-full items-center justify-center rounded-[26px] border border-white/14 bg-white/8 px-[18px] py-[12px] text-center text-[15px] font-semibold text-white shadow-lg shadow-black/20 transition-all hover:bg-white/14 sm:min-w-[220px] sm:w-auto sm:rounded-full sm:px-[20px] sm:text-[16px]"
              >
                Open Official Bot
              </a>
            )}

            {userData?.telegramChatId && (
              <button
                className="inline-flex min-h-[52px] w-full items-center justify-center rounded-[26px] border border-red-300/28 bg-[linear-gradient(135deg,rgba(248,113,113,0.16),rgba(127,29,29,0.22))] px-[18px] py-[12px] text-center text-[15px] font-semibold text-white shadow-[0_12px_30px_rgba(127,29,29,0.22)] transition-all hover:bg-[linear-gradient(135deg,rgba(248,113,113,0.24),rgba(127,29,29,0.3))] sm:min-w-[220px] sm:w-auto sm:rounded-full sm:px-[20px] sm:text-[16px]"
                disabled={telegramDisconnectLoading}
                onClick={handleDisconnectTelegram}
              >
                {telegramDisconnectLoading ? "Disconnecting..." : "Disconnect Telegram"}
              </button>
            )}
          </div>

          {telegramConnectData && (
            <div className="mt-[18px] rounded-[20px] border border-white/10 bg-black/15 p-[16px] text-[13px] leading-[1.7] text-white/82 sm:rounded-[22px] sm:p-[18px] sm:text-[14px]">
              <p>{telegramConnectData.instructions}</p>
              {telegramConnectData.linkCode && (
                <p className="mt-[8px]">
                  If Telegram does not open with the code automatically, send this command to the bot:
                  <span className="block mt-[6px] text-cyan-200 font-semibold">
                    /link {telegramConnectData.linkCode}
                  </span>
                </p>
              )}
              {telegramConnectData.expiresAt && (
                <p className="mt-[8px] text-white/60">
                  This connect code expires at{" "}
                  {new Date(telegramConnectData.expiresAt).toLocaleString()}.
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Customize2;
