// // import axios from "axios";
// // const geminiResponse = async (command, assistantName, userName) => {
// //   try {
// //     const apiUrl = process.env.GEMINI_API_URL;
// //     const prompt = `You are a virtual assistant named ${assistantName} created by ${userName}.
// // You are not Google. You will now behave like a voice-enabled assistant.

// // Your task is to understand the user's natural language input and respond with a JSON object like this:

// // {
// //   "type": "general" | "google-search" | "youtube-search" | "youtube-play" | "get-time" | "get-date" | "get-day" | "get-month"|"calculator-open" | "instagram-open" |"facebook-open" |"weather-show"
// //   ,
// //   "userInput": "<original user input>" {only remove your name from userInput if exists} and agar kisi ne google ya youtube pe kuch search karne ko bola hai to userInput me only bo search baala text jaye,

// //   "response": "<a short spoken response to read out loud to the user>"
// // }

// // Instructions:
// // - "type": determine the intent of the user.
// // - "userInput": original sentence the user spoke.
// // - "response": A short voice-friendly reply, e.g., "Sure, playing it now", "Here's what I found", "Today is Tuesday", etc.

// // Type meanings:
// // - "general": if it's a factual or informational question. aur agar koi aisa question puchta hai jiska answer tume pata hai usko bhi general ki category me rakho bas short answer dena
// // - "google-search": if user wants to search something on Google .
// // - "youtube-search": if user wants to search something on YouTube.
// // - "youtube-play": if user wants to directly play a video or song.
// // - "calculator-open": if user wants to  open a calculator .
// // - "instagram-open": if user wants to  open instagram .
// // - "facebook-open": if user wants to open facebook.
// // -"weather-show": if user wants to know weather
// // - "get-time": if user asks for current time.
// // - "get-date": if user asks for today's date.
// // - "get-day": if user asks what day it is.
// // - "get-month": if user asks for the current month.

// // Important:
// // - Use ${userName} agar koi puche tume kisne banaya
// // - Only respond with the JSON object, nothing else.

// // now your userInput- ${command}
// // `;

// // const result = await axios.post(apiUrl, {
// //   contents: [
// //     {
// //       parts: [{ text: prompt }],
// //     },
// //   ],
// // });
// // return result.data.candidates[0].content.parts[0].text;
// //   } catch (error) {
// //     console.log(error);
// //   }
// // };

// // export default geminiResponse;

// import axios from "axios";

// const geminiResponse = async (command, assistantName, userName) => {
//   try {
//     const apiUrl = process.env.GEMINI_API_URL;
//     if (!apiUrl) {
//       throw new Error("GEMINI_API_URL not set in environment variables");
//     }

//     const prompt = `You are a virtual assistant named ${assistantName} created by ${userName}. 
// You are not Google. You will now behave like a voice-enabled assistant.

// Your task is to understand the user's natural language input and respond with a JSON object like this:

// {
//   "type": "general" | "google-search" | "youtube-search" | "youtube-play" | "get-time" | "get-date" | "get-day" | "get-month"|"calculator-open" | "instagram-open" |"facebook-open" |"weather-show",
//   "userInput": "<original user input>" {only remove your name from userInput if exists} and agar kisi ne google ya youtube pe kuch search karne ko bola hai to userInput me only bo search baala text jaye,
//   "response": "<a short spoken response to read out loud to the user>"
// }

// Instructions:
// - "type": determine the intent of the user.
// - "userInput": original sentence the user spoke.
// - "response": A short voice-friendly reply, e.g., "Sure, playing it now", "Here's what I found", "Today is Tuesday", etc.

// Type meanings:
// - "general": if it's a factual or informational question. aur agar koi aisa question puchta hai jiska answer tume pata hai usko bhi general ki category me rakho bas short answer dena
// - "google-search": if user wants to search something on Google.
// - "youtube-search": if user wants to search something on YouTube.
// - "youtube-play": if user wants to directly play a video or song.
// - "calculator-open": if user wants to open a calculator.
// - "instagram-open": if user wants to open Instagram.
// - "facebook-open": if user wants to open Facebook.
// - "weather-show": if user wants to know weather.
// - "get-time": if user asks for current time.
// - "get-date": if user asks for today's date.
// - "get-day": if user asks what day it is.
// - "get-month": if user asks for the current month.

// Important:
// - Use ${userName} agar koi puche tume kisne banaya.
// - Only respond with the JSON object, nothing else.

// now your userInput- ${command}
// `;

//     // Make sure to send proper request payload as per Gemini API spec
//     // const response = await axios.post(
//     //   apiUrl,
//     //   {
//     //     prompt: {
//     //       text: prompt,
//     //     },
//     //     temperature: 0.7,
//     //     candidateCount: 1,
//     //     maxOutputTokens: 1024,
//     //   },
//     //   {
//     //     headers: {
//     //       "Content-Type": "application/json",
//     //     },
//     //   }
//     // );

//     const result = await axios.post(apiUrl, {
//       contents: [
//         {
//           parts: [{ text: prompt }],
//         },
//       ],
//     });
//     return result.data.candidates[0].content.parts[0].text;
//     // if (
//     //   !response.data ||
//     //   !response.data.candidates ||
//     //   response.data.candidates.length === 0
//     // ) {
//     //   throw new Error("No candidates in Gemini API response");
//     // }

//     // return response.data.candidates[0].content.parts[0].text;
//   } catch (error) {
//     console.error("Gemini API error:", error.response?.data || error.message);
//     throw new Error("Failed to get response from Gemini API");
//   }
// };

// export default geminiResponse;






import fetch from "node-fetch";

const OPENROUTER_API_URL = "https://openrouter.ai/api/v1/chat/completions";

/**
 * geminiResponse(userMessage)
 * Same function name so nothing else breaks.
 * Now uses OpenRouter FREE model: mistralai/mistral-7b-instruct:free
 */
const geminiResponse = async (userMessage) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      console.error("❌ OPENROUTER_API_KEY is missing in .env");
      throw new Error("Server configuration error: OPENROUTER_API_KEY not set");
    }

    const response = await fetch(OPENROUTER_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "HTTP-Referer": "http://localhost:5173", // required by OpenRouter
        "X-Title": "Virtual AI Assistant", // your app name
      },
      body: JSON.stringify({
        model: "mistralai/mistral-7b-instruct:free",
        messages: [
          {
            role: "system",
            content: "You are a helpful virtual voice assistant.",
          },
          {
            role: "user",
            content: userMessage,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("❌ OpenRouter API error:", response.status, errText);
      throw new Error("Failed to get response from OpenRouter");
    }

    const data = await response.json();

    const aiMessage =
      data?.choices?.[0]?.message?.content?.trim() ||
      "Sorry, I could not generate a response.";

    return aiMessage;
  } catch (error) {
    console.error("❌ Error in geminiResponse (OpenRouter):", error);
    return "Sorry, something went wrong while talking to the AI.";
  }
};

export default geminiResponse;

