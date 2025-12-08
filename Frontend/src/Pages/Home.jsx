// import React, { useContext, useEffect, useRef, useState } from "react";
// import { userDataContext } from "../context/userContext.jsx";
// import { useNavigate } from "react-router-dom";
// import axios from "axios";
// import aiImg from "../assets/ai.gif";
// import { CgMenuRight } from "react-icons/cg";
// import { RxCross1 } from "react-icons/rx";
// import userImg from "../assets/user.gif";
// function Home() {
//   const { userData, serverUrl, setUserData, getGeminiResponse } =
//     useContext(userDataContext);
//   const navigate = useNavigate();
//   const [listening, setListening] = useState(false);
//   const [userText, setUserText] = useState("");
//   const [aiText, setAiText] = useState("");
//   const isSpeakingRef = useRef(false);
//   const recognitionRef = useRef(null);
//   const [ham, setHam] = useState(false);
//   const isRecognizingRef = useRef(false);
//   const synth = window.speechSynthesis;

//   const handleLogOut = async () => {
//     try {
//       const result = await axios.get(`${serverUrl}/api/auth/logout`, {
//         withCredentials: true,
//       });
//       setUserData(null);
//       navigate("/signin");
//     } catch (error) {
//       setUserData(null);
//       console.log(error);
//     }
//   };

//   const startRecognition = () => {
//     if (!isSpeakingRef.current && !isRecognizingRef.current) {
//       try {
//         recognitionRef.current?.start();
//         console.log("Recognition requested to start");
//       } catch (error) {
//         if (error.name !== "InvalidStateError") {
//           console.error("Start error:", error);
//         }
//       }
//     }
//   };

//   const speak = (text) => {
//     const utterence = new SpeechSynthesisUtterance(text);
//     utterence.lang = "hi-IN";
//     const voices = window.speechSynthesis.getVoices();
//     const hindiVoice = voices.find((v) => v.lang === "hi-IN");
//     if (hindiVoice) {
//       utterence.voice = hindiVoice;
//     }

//     isSpeakingRef.current = true;
//     utterence.onend = () => {
//       setAiText("");
//       isSpeakingRef.current = false;
//       setTimeout(() => {
//         startRecognition(); // ⏳ Delay se race condition avoid hoti hai
//       }, 800);
//     };
//     synth.cancel(); // 🛑 pehle se koi speech ho to band karo
//     synth.speak(utterence);
//   };

//   const handleCommand = (data) => {
//     const { type, userInput, response } = data;
//     speak(response);

//     if (type === "google-search") {
//       const query = encodeURIComponent(userInput);
//       window.open(`https://www.google.com/search?q=${query}`, "_blank");
//     }
//     if (type === "calculator-open") {
//       window.open(`https://www.google.com/search?q=calculator`, "_blank");
//     }
//     if (type === "instagram-open") {
//       window.open(`https://www.instagram.com/`, "_blank");
//     }
//     if (type === "facebook-open") {
//       window.open(`https://www.facebook.com/`, "_blank");
//     }
//     if (type === "weather-show") {
//       window.open(`https://www.google.com/search?q=weather`, "_blank");
//     }

//     if (type === "youtube-search" || type === "youtube-play") {
//       const query = encodeURIComponent(userInput);
//       window.open(
//         `https://www.youtube.com/results?search_query=${query}`,
//         "_blank"
//       );
//     }
//   };

//   useEffect(() => {
//     const SpeechRecognition =
//       window.SpeechRecognition || window.webkitSpeechRecognition;
//     const recognition = new SpeechRecognition();

//     console.log(recognition);

//     recognition.continuous = true;
//     recognition.lang = "en-US";
//     recognition.interimResults = false;

//     recognitionRef.current = recognition;

//     let isMounted = true; // flag to avoid setState on unmounted component

//     // Start recognition after 1 second delay only if component still mounted
//     const startTimeout = setTimeout(() => {
//       if (isMounted && !isSpeakingRef.current && !isRecognizingRef.current) {
//         try {
//           recognition.start();
//           console.log("Recognition requested to start");
//         } catch (e) {
//           if (e.name !== "InvalidStateError") {
//             console.error(e);
//           }
//         }
//       }
//     }, 1000);

//     recognition.onstart = () => {
//       isRecognizingRef.current = true;
//       setListening(true);
//     };

//     recognition.onend = () => {
//       isRecognizingRef.current = false;
//       setListening(false);
//       if (isMounted && !isSpeakingRef.current) {
//         setTimeout(() => {
//           if (isMounted) {
//             try {
//               recognition.start();
//               console.log("Recognition restarted");
//             } catch (e) {
//               if (e.name !== "InvalidStateError") console.error(e);
//             }
//           }
//         }, 1000);
//       }
//     };

//     recognition.onerror = (event) => {
//       console.warn("Recognition error:", event.error);
//       isRecognizingRef.current = false;
//       setListening(false);
//       if (event.error !== "aborted" && isMounted && !isSpeakingRef.current) {
//         setTimeout(() => {
//           if (isMounted) {
//             try {
//               recognition.start();
//               console.log("Recognition restarted after error");
//             } catch (e) {
//               if (e.name !== "InvalidStateError") console.error(e);
//             }
//           }
//         }, 1000);
//       }
//     };

//     // recognition.onresult = async (e) => {
//     //   const transcript = e.results[e.results.length - 1][0].transcript.trim();
//     //   console.log(transcript);
//     //   if (
//     //     transcript.toLowerCase().includes(userData.assistantName.toLowerCase())
//     //   ) {
//     //     setAiText("");
//     //     setUserText(transcript);
//     //     recognition.stop();
//     //     isRecognizingRef.current = false;
//     //     setListening(false);
//     //     const data = await getGeminiResponse(transcript);
//     //     handleCommand(data);
//     //     setAiText(data.response);
//     //     setUserText("");
//     //   }
//     // };

//     recognition.onresult = async (e) => {
//       const transcript = e.results[e.results.length - 1][0].transcript.trim();
//       console.log("Transcript:", transcript);

//       if (
//         transcript.toLowerCase().includes(userData.assistantName.toLowerCase())
//       ) {
//         setAiText("");
//         setUserText(transcript);
//         recognition.stop();
//         isRecognizingRef.current = false;
//         setListening(false);

//         try {
//           const data = await getGeminiResponse(transcript);
//           console.log("Gemini response:", data); // 🔍 LOG THIS
//           handleCommand(data);
//           setAiText(data.response);
//           setUserText("");
//         } catch (err) {
//           console.error("Error from getGeminiResponse:", err); // 🔥 See if it's failing
//         }
//       }
//     };

//     const greeting = new SpeechSynthesisUtterance(
//       `Hello ${userData.name}, what can I help you with?`
//     );
//     greeting.lang = "hi-IN";

//     window.speechSynthesis.speak(greeting);

//     return () => {
//       isMounted = false;
//       clearTimeout(startTimeout);
//       recognition.stop();
//       setListening(false);
//       isRecognizingRef.current = false;
//     };
//   }, []);

//   return (
//     <div className="w-full h-[100vh] bg-gradient-to-t from-[black] to-[#02023d] flex justify-center items-center flex-col gap-[15px] overflow-hidden">
//       <CgMenuRight
//         className="lg:hidden text-white absolute top-[20px] right-[20px] w-[25px] h-[25px]"
//         onClick={() => setHam(true)}
//       />
//       <div
//         className={`absolute lg:hidden top-0 w-full h-full bg-[#00000053] backdrop-blur-lg p-[20px] flex flex-col gap-[20px] items-start ${
//           ham ? "translate-x-0" : "translate-x-full"
//         } transition-transform`}
//       >
//         <RxCross1
//           className=" text-white absolute top-[20px] right-[20px] w-[25px] h-[25px]"
//           onClick={() => setHam(false)}
//         />
//         <button
//           className="min-w-[150px] h-[60px]  text-black font-semibold   bg-white rounded-full cursor-pointer text-[19px] "
//           onClick={handleLogOut}
//         >
//           Log Out
//         </button>
//         <button
//           className="min-w-[150px] h-[60px]  text-black font-semibold  bg-white  rounded-full cursor-pointer text-[19px] px-[20px] py-[10px] "
//           onClick={() => navigate("/customize")}
//         >
//           Customize your Assistant
//         </button>

//         <div className="w-full h-[2px] bg-gray-400"></div>
//         <h1 className="text-white font-semibold text-[19px]">History</h1>

//         <div className="w-full h-[400px] gap-[20px] overflow-y-auto flex flex-col truncate">
//           {userData.history?.map((his) => (
//             <div className="text-gray-200 text-[18px] w-full h-[30px]  ">
//               {his}
//             </div>
//           ))}
//         </div>
//       </div>
//       <button
//         className="min-w-[150px] h-[60px] mt-[30px] text-black font-semibold absolute hidden lg:block top-[20px] right-[20px]  bg-white rounded-full cursor-pointer text-[19px] "
//         onClick={handleLogOut}
//       >
//         Log Out
//       </button>
//       <button
//         className="min-w-[150px] h-[60px] mt-[30px] text-black font-semibold  bg-white absolute top-[100px] right-[20px] rounded-full cursor-pointer text-[19px] px-[20px] py-[10px] hidden lg:block "
//         onClick={() => navigate("/customize")}
//       >
//         Customize your Assistant
//       </button>
//       <div className="w-[300px] h-[400px] flex justify-center items-center overflow-hidden rounded-4xl shadow-lg">
//         <img
//           src={userData?.assistantImage}
//           alt=""
//           className="h-full object-cover"
//         />
//       </div>
//       <h1 className="text-white text-[18px] font-semibold">
//         I'm {userData?.assistantName}
//       </h1>
//       {!aiText && <img src={userImg} alt="" className="w-[200px]" />}
//       {aiText && <img src={aiImg} alt="" className="w-[200px]" />}

//       <h1 className="text-white text-[18px] font-semibold text-wrap">
//         {userText ? userText : aiText ? aiText : null}
//       </h1>
//     </div>
//   );
// }

// export default Home;

// Fixed Home.jsx
// Fixed Home.jsx

import React, { useContext, useEffect, useRef, useState } from "react";
import { userDataContext } from "../context/userContext.jsx";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import aiImg from "../assets/ai.gif";
import userImg from "../assets/user.gif";
import { CgMenuRight } from "react-icons/cg";
import { RxCross1 } from "react-icons/rx";

function Home() {
  const { userData, serverUrl, setUserData, getGeminiResponse } =
    useContext(userDataContext);

  const navigate = useNavigate();
  const [listening, setListening] = useState(false);
  const [userText, setUserText] = useState("");
  const [aiText, setAiText] = useState("");
  const [ham, setHam] = useState(false);
  const recognitionRef = useRef(null);
  const isSpeakingRef = useRef(false);
  const isRecognizingRef = useRef(false);
  const synth = window.speechSynthesis;

  const handleLogOut = async () => {
    try {
      await axios.get(`${serverUrl}/api/auth/logout`, {
        withCredentials: true,
      });
      setUserData(null);
      navigate("/signin");
    } catch (error) {
      setUserData(null);
      console.log(error);
    }
  };

  const startRecognition = () => {
    if (
      !isSpeakingRef.current &&
      !isRecognizingRef.current &&
      recognitionRef.current
    ) {
      try {
        recognitionRef.current.start();
        console.log("Recognition requested to start");
      } catch (error) {
        if (error.name !== "InvalidStateError") {
          console.error("Start error:", error);
        }
      }
    }
  };

  const speak = (text) => {
    if (!text || text.trim() === "") {
      console.warn("No text to speak");
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    // Changed to English for better compatibility
    utterance.lang = "en-US";
    utterance.rate = 0.8;
    utterance.pitch = 1;

    const speakUtterance = () => {
      isSpeakingRef.current = true;

      utterance.onend = () => {
        console.log("Speech ended");
        setAiText("");
        isSpeakingRef.current = false;
        setTimeout(() => {
          if (!isSpeakingRef.current) {
            startRecognition();
          }
        }, 1000);
      };

      utterance.onerror = (event) => {
        console.error("Speech error:", event.error);
        isSpeakingRef.current = false;
        setAiText("");
        setTimeout(() => {
          if (!isSpeakingRef.current) {
            startRecognition();
          }
        }, 1000);
      };

      synth.cancel();
      synth.speak(utterance);
    };

    let voices = synth.getVoices();
    if (!voices.length) {
      window.speechSynthesis.onvoiceschanged = () => {
        voices = synth.getVoices();
        const englishVoice = voices.find((v) => v.lang.startsWith("en"));
        if (englishVoice) utterance.voice = englishVoice;
        speakUtterance();
      };
    } else {
      const englishVoice = voices.find((v) => v.lang.startsWith("en"));
      if (englishVoice) utterance.voice = englishVoice;
      speakUtterance();
    }
  };

  const handleCommand = (data) => {
    console.log("Handling command:", data);

    if (!data || !data.response) {
      console.warn("No response from Gemini:", data);
      speak("Sorry, I didn't understand that.");
      return;
    }

    const { type, userInput, response } = data;
    console.log("Assistant response:", response);

    // Speak the response first
    speak(response);

    // Then handle the action
    setTimeout(() => {
      if (type === "google-search" && userInput) {
        const query = encodeURIComponent(userInput);
        window.open(`https://www.google.com/search?q=${query}`, "_blank");
      }
      if (type === "calculator-open") {
        window.open(`https://www.google.com/search?q=calculator`, "_blank");
      }
      if (type === "instagram-open") {
        window.open(`https://www.instagram.com/`, "_blank");
      }
      if (type === "facebook-open") {
        window.open(`https://www.facebook.com/`, "_blank");
      }
      if (type === "weather-show") {
        window.open(`https://www.google.com/search?q=weather`, "_blank");
      }
      if (type === "youtube-search" || type === "youtube-play") {
        if (userInput) {
          const query = encodeURIComponent(userInput);
          window.open(
            `https://www.youtube.com/results?search_query=${query}`,
            "_blank"
          );
        }
      }
      if (type === "get-time") {
        const currentTime = new Date().toLocaleTimeString();
        speak(`The current time is ${currentTime}`);
      }
      if (type === "get-date") {
        const currentDate = new Date().toLocaleDateString();
        speak(`Today's date is ${currentDate}`);
      }
      if (type === "get-day") {
        const currentDay = new Date().toLocaleDateString("en-US", {
          weekday: "long",
        });
        speak(`Today is ${currentDay}`);
      }
      if (type === "get-month") {
        const currentMonth = new Date().toLocaleDateString("en-US", {
          month: "long",
        });
        speak(`The current month is ${currentMonth}`);
      }
    }, 100);
  };

  useEffect(() => {
    // Check for browser support
    if (
      !("webkitSpeechRecognition" in window) &&
      !("SpeechRecognition" in window)
    ) {
      console.error("Speech recognition not supported");
      speak("Sorry, speech recognition is not supported in this browser.");
      return;
    }

    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognitionRef.current = recognition;
    let isMounted = true;

    // Start recognition after a delay
    const startTimeout = setTimeout(() => {
      if (isMounted && !isSpeakingRef.current && !isRecognizingRef.current) {
        startRecognition();
      }
    }, 2000); // Increased delay

    recognition.onstart = () => {
      console.log("Recognition started");
      isRecognizingRef.current = true;
      setListening(true);
    };

    recognition.onend = () => {
      console.log("Recognition ended");
      isRecognizingRef.current = false;
      setListening(false);

      if (isMounted && !isSpeakingRef.current) {
        setTimeout(() => {
          if (isMounted && !isSpeakingRef.current) {
            startRecognition();
          }
        }, 1500);
      }
    };

    recognition.onerror = (event) => {
      console.warn("Recognition error:", event.error);
      isRecognizingRef.current = false;
      setListening(false);

      if (event.error !== "aborted" && isMounted && !isSpeakingRef.current) {
        setTimeout(() => {
          if (isMounted && !isSpeakingRef.current) {
            startRecognition();
          }
        }, 2000);
      }
    };

    recognition.onresult = async (e) => {
      const transcript = e.results[e.results.length - 1][0].transcript.trim();
      console.log("Transcript received:", transcript);

      if (transcript && transcript.length > 0) {
        setAiText("");
        setUserText(transcript);

        // Stop recognition while processing
        recognition.stop();
        isRecognizingRef.current = false;
        setListening(false);

        try {
          console.log("Sending to Gemini:", transcript);
          // const data = await getGeminiResponse(transcript);
          const getGeminiResponse = async (command) => {
            try {
              const res = await axios.post(
                `${serverUrl}/api/user/ask`,
                { command },
                {
                  withCredentials: true, // ⬅️ REQUIRED for sending cookie
                }
              );
              return res.data;
            } catch (err) {
              console.error("Error in getGeminiResponse:", err);
              throw new Error(err?.response?.data?.message || "Server error");
            }
          };
          const serverResponse = await getGeminiResponse(transcript);

          console.log("Gemini Response raw:", serverResponse);

          if (!serverResponse) {
            throw new Error("No response received from server");
          }

          // Parse JSON response if it's a string
          let parsedData = serverResponse;
          // console.log(data);
          if (typeof data === "string") {
            try {
              // Clean the response - remove markdown formatting if present
              const cleanedData = serverResponse
                .replace(/```json\n?|\n?```/g, "")
                .trim();
              parsedData = JSON.parse(cleanedData);
            } catch (parseError) {
              console.error("JSON parse error:", parseError);
              console.log("Raw response:", data);
              parsedData = {
                type: "general",
                userInput: transcript,
                response: "Sorry, I'm having trouble processing that request.",
              };
            }
          }

          // Validate parsedData structure
          if (!parsedData || !parsedData.response) {
            parsedData = {
              type: "general",
              userInput: transcript,
              response:
                "I received your message but couldn't process it properly.",
            };
          }

          console.log("Parsed Gemini Response:", parsedData);
          handleCommand(parsedData);
          setAiText(parsedData.response || "I'm processing your request...");
          setUserText("");
        } catch (err) {
          console.error("Error in getGeminiResponse:", err);
          const fallbackResponse = "fallback response";
          // "Sorry, I'm having trouble processing your request right now.";
          speak(fallbackResponse);
          setAiText(fallbackResponse);
          setUserText("");
          // Restart recognition after error
          setTimeout(() => {
            if (!isSpeakingRef.current) {
              startRecognition();
            }
          }, 2000);
        }
      }
    };

    // Initial greeting
    setTimeout(() => {
      if (userData?.name) {
        speak(
          `Hello ${userData.name}, I'm ${
            userData?.assistantName || "your assistant"
          }. What can I help you with?`
        );
      } else {
        speak("Hello! What can I help you with today?");
      }
    }, 1000);

    return () => {
      isMounted = false;
      clearTimeout(startTimeout);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      synth.cancel();
      setListening(false);
      isRecognizingRef.current = false;
      isSpeakingRef.current = false;
    };
  }, [userData, getGeminiResponse]);

  return (
    <div className="w-full h-[100vh] bg-gradient-to-t from-[black] to-[#02023d] flex justify-center items-center flex-col gap-[15px] overflow-hidden">
      <CgMenuRight
        className="lg:hidden text-white absolute top-[20px] right-[20px] w-[25px] h-[25px]"
        onClick={() => setHam(true)}
      />
      <div
        className={`absolute lg:hidden top-0 w-full h-full bg-[#00000053] backdrop-blur-lg p-[20px] flex flex-col gap-[20px] items-start ${
          ham ? "translate-x-0" : "translate-x-full"
        } transition-transform`}
      >
        <RxCross1
          className="text-white absolute top-[20px] right-[20px] w-[25px] h-[25px]"
          onClick={() => setHam(false)}
        />
        <button
          className="min-w-[150px] h-[60px] text-black font-semibold bg-white rounded-full cursor-pointer text-[19px]"
          onClick={handleLogOut}
        >
          Log Out
        </button>
        <button
          className="min-w-[150px] h-[60px] text-black font-semibold bg-white rounded-full cursor-pointer text-[19px] px-[20px] py-[10px]"
          onClick={() => navigate("/customize")}
        >
          Customize your Assistant
        </button>
        <div className="w-full h-[2px] bg-gray-400"></div>
        <h1 className="text-white font-semibold text-[19px]">History</h1>
        <div className="w-full h-[400px] gap-[20px] overflow-y-auto flex flex-col truncate">
          {userData?.history?.map((his, index) => (
            <div
              key={index}
              className="text-gray-200 text-[18px] w-full h-[30px]"
            >
              {his}
            </div>
          ))}
        </div>
      </div>

      {/* Top Right Buttons for Desktop */}
      <button
        className="min-w-[150px] h-[60px] mt-[30px] text-black font-semibold absolute hidden lg:block top-[20px] right-[20px] bg-white rounded-full cursor-pointer text-[19px]"
        onClick={handleLogOut}
      >
        Log Out
      </button>
      <button
        className="min-w-[150px] h-[60px] mt-[30px] text-black font-semibold bg-white absolute top-[100px] right-[20px] rounded-full cursor-pointer text-[19px] px-[20px] py-[10px] hidden lg:block"
        onClick={() => navigate("/customize")}
      >
        Customize your Assistant
      </button>

      <div className="w-[300px] h-[400px] flex justify-center items-center overflow-hidden rounded-4xl shadow-lg">
        <img
          src={userData?.assistantImage}
          alt="Assistant"
          className="h-full object-cover"
        />
      </div>
      <h1 className="text-white text-[18px] font-semibold">
        I'm {userData?.assistantName}
      </h1>

      {/* Listening indicator */}
      {listening && !userText && !aiText && (
        <div className="text-white text-[16px] animate-pulse">
          🎤 Listening...
        </div>
      )}

      {!aiText && !listening && (
        <img src={userImg} alt="User" className="w-[200px]" />
      )}
      {aiText && <img src={aiImg} alt="AI" className="w-[200px]" />}

      <h1 className="text-white text-[18px] font-semibold text-wrap text-center px-4">
        {userText
          ? `You said: "${userText}"`
          : aiText
          ? aiText
          : listening
          ? "Listening..."
          : "Say something..."}
      </h1>
    </div>
  );
}

export default Home;
