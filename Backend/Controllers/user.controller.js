// import uploadOnCloudinary from "../config/cloudinary.js";
// import geminiResponse from "../gemini.js";
// import User from "../Models/user.model.js";
// import moment from "moment";
// export const getCurrentUser = async (req, res) => {
//   try {
//     const userId = req.userId;
//     const user = await User.findById(userId).select("-password");
//     if (!user) {
//       return res.status(400).json({ message: "user not found" });
//     }

//     return res.status(200).json(user);
//   } catch (error) {
//     return res.status(400).json({ message: "get current user error" });
//   }
// };

// export const updateAssistant = async (req, res) => {
//   try {
//     const { assistantName, imageUrl } = req.body;
//     let assistantImage;
//     if (req.file) {
//       assistantImage = await uploadOnCloudinary(req.file.path);
//     } else {
//       assistantImage = imageUrl;
//     }

//     const user = await User.findByIdAndUpdate(
//       req.userId,
//       {
//         assistantName,
//         assistantImage,
//       },
//       { new: true }
//     ).select("-password");
//     return res.status(200).json(user);
//   } catch (error) {
//     return res.status(400).json({ message: "updateAssistantError user error" });
//   }
// };

// export const askToAssistant = async (req, res) => {
//   //   try {
//   //     const { command } = req.body;
//   //     const user = await User.findById(req.userId);
//   //     if (!user) {
//   //       return res.status(404).json({ response: "User not found" });
//   //     }

//   //     if (!Array.isArray(user.history)) {
//   //       user.history = [];
//   //     }
//   //     user.history.push(command);
//   //     await user.save();
//   //     const userName = user.name;
//   //     const assistantName = user.assistantName;
//   //     const result = await geminiResponse(command, assistantName, userName);

//   //     const jsonMatch = result.match(/{[\s\S]*}/);
//   //     if (!jsonMatch) {
//   //       return res.status(400).json({ response: "sorry, i can't understand" });
//   //     }
//   //     const gemResult = JSON.parse(jsonMatch[0]);
//   //     console.log(gemResult);
//   //     const type = gemResult.type;

//   //     switch (type) {
//   //       case "get-date":
//   //         return res.json({
//   //           type,
//   //           userInput: gemResult.userInput,
//   //           response: `current date is ${moment().format("YYYY-MM-DD")}`,
//   //         });
//   //       case "get-time":
//   //         return res.json({
//   //           type,
//   //           userInput: gemResult.userInput,
//   //           response: `current time is ${moment().format("hh:mm A")}`,
//   //         });
//   //       case "get-day":
//   //         return res.json({
//   //           type,
//   //           userInput: gemResult.userInput,
//   //           response: `today is ${moment().format("dddd")}`,
//   //         });
//   //       case "get-month":
//   //         return res.json({
//   //           type,
//   //           userInput: gemResult.userInput,
//   //           response: `today is ${moment().format("MMMM")}`,
//   //         });
//   //       case "google-search":
//   //       case "youtube-search":
//   //       case "youtube-play":
//   //       case "general":
//   //       case "calculator-open":
//   //       case "instagram-open":
//   //       case "facebook-open":
//   //       case "weather-show":
//   //         return res.json({
//   //           type,
//   //           userInput: gemResult.userInput,
//   //           response: gemResult.response,
//   //         });

//   //       default:
//   //         return res
//   //           .status(400)
//   //           .json({ response: "I didn't understand that command." });
//   //     }
//   //   } catch (error) {
//   //     return res.status(500).json({ response: "ask assistant error" });
//   //   }
//   // };

//   try {
//     console.log("Received request:", req.body);

//     const { command } = req.body;

//     // Validate input
//     if (
//       !command ||
//       typeof command !== "string" ||
//       command.trim().length === 0
//     ) {
//       return res.status(400).json({
//         error: "Invalid command",
//         message: "Command is required and must be a non-empty string",
//       });
//     }

//     // Get user data from session/auth (adjust based on your auth system)
//     const user = req.userId; // Assuming you have user data in req.user
//     if (!user) {
//       return res.status(401).json({
//         error: "Unauthorized",
//         message: "User not authenticated",
//       });
//     }

//     const assistantName = user?.assistantName || "Assistant";
//     const userName = user?.name || "User";

//     console.log(`Processing command for ${userName}: "${command}"`);

//     // Call Gemini API
//     const geminiResult = await geminiResponse(command, assistantName, userName);

//     console.log("Gemini result:", geminiResult);

//     if (!geminiResult) {
//       throw new Error("No response from Gemini API");
//     }

//     // Parse if string (your geminiResponse function might return string)
//     let parsedResult = geminiResult;
//     if (typeof geminiResult === "string") {
//       try {
//         const cleaned = geminiResult.replace(/```json\n?|\n?```/g, "").trim();
//         parsedResult = JSON.parse(cleaned);
//       } catch (parseError) {
//         console.error("JSON parse error:", parseError);
//         parsedResult = {
//           type: "general",
//           userInput: command,
//           response:
//             "I processed your request but had trouble formatting the response.",
//         };
//       }
//     }

//     // Validate response structure
//     if (!parsedResult.type || !parsedResult.response) {
//       parsedResult = {
//         type: "general",
//         userInput: command,
//         response: "I heard you, but had trouble processing your request.",
//       };
//     }

//     // Optionally save to user history
//     // try {
//     //   if (user.history) {
//     //     user.history.push(command);
//     //     // Save user history to database here if needed
//     //   }
//     // } catch (historyError) {
//     //   console.error("Error saving history:", historyError);
//     //   // Don't fail the request for history errors
//     // }

//     res.json(parsedResult);
//   } catch (error) {
//     console.error("Error in asktoassistant:", error);

//     // Return appropriate error response
//     if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED") {
//       res.status(503).json({
//         error: "Service Unavailable",
//         message: "Unable to connect to AI service",
//       });
//     } else if (error.response && error.response.status === 429) {
//       res.status(429).json({
//         error: "Rate Limited",
//         message: "Too many requests, please try again later",
//       });
//     } else {
//       res.status(500).json({
//         error: "Internal Server Error",
//         message: "An unexpected error occurred while processing your request",
//       });
//     }
//   }
// };















import uploadOnCloudinary from "../Config/cloudinary.js";
import geminiResponse from "../gemini.js";
import User from "../Models/user.model.js";
import moment from "moment";

export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId;
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(400).json({ message: "user not found" });
    }

    return res.status(200).json(user);
  } catch (error) {
    return res.status(400).json({ message: "get current user error" });
  }
};

export const updateAssistant = async (req, res) => {
  try {
    const { assistantName, imageUrl } = req.body;
    let assistantImage;

    if (req.file) {
      // New image uploaded: send to Cloudinary
      assistantImage = await uploadOnCloudinary(req.file.path);
    } else {
      // Keep old image
      assistantImage = imageUrl;
    }

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        assistantName,
        assistantImage,
      },
      { new: true }
    ).select("-password");

    return res.status(200).json(user);
  } catch (error) {
    return res.status(400).json({ message: "updateAssistantError user error" });
  }
};

export const askToAssistant = async (req, res) => {
  try {
    const { command } = req.body;

    // Basic validation
    if (
      !command ||
      typeof command !== "string" ||
      command.trim().length === 0
    ) {
      return res.status(400).json({
        response: "Please say something so I can help you.",
      });
    }

    // Get full user object from DB
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ response: "User not found" });
    }

    // Ensure history exists and save command
    if (!Array.isArray(user.history)) {
      user.history = [];
    }
    user.history.push(command);
    await user.save();

    const userName = user.name || "User";
    const assistantName = user.assistantName || "Assistant";

    // Build instruction prompt for OpenRouter model
    const prompt = `
You are a command parser for a virtual voice assistant named "${assistantName}".
The user's name is "${userName}".

Analyze the user's command and respond ONLY with a SINGLE JSON object.
Do NOT include any extra text, markdown, or code fences. Only raw JSON.

The JSON must have EXACTLY these keys:
- "type": one of [
  "get-date",
  "get-time",
  "get-day",
  "get-month",
  "google-search",
  "youtube-search",
  "youtube-play",
  "youtube-open",
  "general",
  "calculator-open",
  "instagram-open",
  "facebook-open",
  "weather-show"
]
- "userInput": a short, cleaned-up version of the user's command
- "response": the natural language reply the assistant should speak

Choose the "type" based on what the user wants. Examples:
- If they ask for today's date → "get-date"
- If they ask for the current time → "get-time"
- If they ask what day it is → "get-day"
- If they ask what month it is → "get-month"
- If they say "search Google for cats" → "google-search"
- If they say "search YouTube for lofi music" → "youtube-search"
- If they say "play lofi music on YouTube" → "youtube-play"
- If they say "open YouTube" → "youtube-open"
- If they want calculator, Instagram, Facebook, or weather → use the corresponding type
- Otherwise → "general"

User command:
"""${command}"""
`;

    // Call OpenRouter (via geminiResponse)
    const result = await geminiResponse(prompt);

    if (!result || typeof result !== "string") {
      return res
        .status(500)
        .json({ response: "sorry, I can't understand right now." });
    }

    // Extract JSON from the model response
    const jsonMatch = result.match(/{[\s\S]*}/);
    if (!jsonMatch) {
      return res
        .status(400)
        .json({ response: "sorry, i can't understand" });
    }

    let gemResult;
    try {
      gemResult = JSON.parse(jsonMatch[0]);
    } catch (parseError) {
      console.error("JSON parse error in askToAssistant:", parseError);
      return res
        .status(400)
        .json({ response: "sorry, i can't understand" });
    }

    console.log("Parsed AI result:", gemResult);

    const type = gemResult.type;

    switch (type) {
      case "get-date":
        return res.json({
          type,
          userInput: gemResult.userInput,
          response: `current date is ${moment().format("YYYY-MM-DD")}`,
        });

      case "get-time":
        return res.json({
          type,
          userInput: gemResult.userInput,
          response: `current time is ${moment().format("hh:mm A")}`,
        });

      case "get-day":
        return res.json({
          type,
          userInput: gemResult.userInput,
          response: `today is ${moment().format("dddd")}`,
        });

      case "get-month":
        return res.json({
          type,
          userInput: gemResult.userInput,
          response: `today is ${moment().format("MMMM")}`,
        });

      case "google-search":
      case "youtube-search":
      case "youtube-play":
      case "youtube-open": // ✅ new: support "open YouTube"
      case "general":
      case "calculator-open":
      case "instagram-open":
      case "facebook-open":
      case "weather-show":
        return res.json({
          type,
          userInput: gemResult.userInput,
          response: gemResult.response,
        });

      default:
        return res
          .status(400)
          .json({ response: "I didn't understand that command." });
    }
  } catch (error) {
    console.error("Error in askToAssistant:", error);
    return res.status(500).json({ response: "ask assistant error" });
  }
};
