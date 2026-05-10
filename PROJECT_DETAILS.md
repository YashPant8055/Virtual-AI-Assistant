# Virtual AI Assistant - Project Analysis

## Project Overview
**Virtual AI Assistant** is a sophisticated, multi-modal artificial intelligence platform designed to provide a seamless interaction experience across web and mobile (via Telegram) while offering direct control over a Windows host machine. It combines cutting-edge AI capabilities with system-level automation to act as a true digital companion.

---

## 🚀 Core Features

### 1. Multi-Modal Interaction
- **Voice Mode**: A hands-free experience using the Web Speech API. Includes:
    - **Wake Word Detection**: Responds to a custom wake name (e.g., "Hey Assistant").
    - **Natural Speech Synthesis**: Provides audible responses.
    - **Interruption Handling**: Can stop speaking and start listening immediately if the user speaks.
- **Chat Mode**: A clean, modern web interface for text-based interaction with full conversation history.
- **Telegram Integration**: A dedicated bot allowing users to interact with their assistant on the go, with full history synchronization between the web app and Telegram.

### 2. Windows System Automation
The assistant can control the host machine using PowerShell scripts:
- **Power Management**: Shutdown, Restart, Sleep.
- **Application Control**: Open and close popular apps like Google Chrome, Visual Studio Code, Notepad, Calculator, and File Explorer.
- **Web Navigation**: Open specific URLs or search on Google/YouTube directly from voice/text commands.

### 3. Intelligent Command Processing
- **Fuzzy Matching**: Uses the **Damerau-Levenshtein distance** algorithm to understand commands even with typos or speech recognition inaccuracies.
- **Context Awareness**: Distinguishes between commands intended for the "laptop" versus the "phone".
- **Parameter Extraction**: Automatically identifies search queries or message content from natural language.

---

## 🛠️ Technology Stack

### Frontend (Web App)
- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **Styling**: [Tailwind CSS 4](https://tailwindcss.com/)
- **Routing**: [React Router 7](https://reactrouter.com/)
- **State Management**: React Context API
- **APIs**: Web Speech API (SpeechRecognition, SpeechSynthesis)
- **Icons**: [React Icons](https://react-icons.github.io/react-icons/)

### Backend (Server)
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/)
- **Database**: [MongoDB](https://www.mongodb.com/) with [Mongoose](https://mongoosejs.com/)
- **Authentication**: JSON Web Tokens (JWT), Bcrypt.js, Cookie-parser
- **AI Integration**: [Gemini API](https://ai.google.dev/) / [OpenRouter SDK](https://openrouter.ai/)
- **Bot Platform**: [node-telegram-bot-api](https://github.com/yagop/node-telegram-bot-api)
- **Automation**: PowerShell (executed via Node `child_process`)

---

## 📂 Project Structure

```text
Virtual Ai/
├── Backend/                 # Express Server & Logic
│   ├── Commands/            # Command Registry & Handlers
│   │   ├── handlers/        # Specific logic for laptop/date-time actions
│   │   └── processAssistantCommand.js # Command parsing logic
│   ├── Config/              # DB connection & configurations
│   ├── Controllers/         # Auth and User logic
│   ├── Models/              # Mongoose Schemas (User)
│   ├── Routes/              # API Endpoints
│   ├── Services/            # AI processing & Device automation
│   ├── telegramBot.js       # Telegram bot implementation
│   └── index.js             # Entry point
└── Frontend/                # React Vite Application
    ├── src/
    │   ├── assets/          # Static assets (animations, images)
    │   ├── context/         # Auth & Global state
    │   ├── Pages/           # UI Components (Home, Login, Signup)
    │   └── main.jsx         # App entry
    └── vite.config.js       # Vite configuration
```

---

## 🛠️ How It Works

### 1. The Interaction Loop
1. The user speaks or types a message.
2. The **Frontend** sends the input to the **Backend**.
3. The **Command Processor** checks if the input matches any "Hard-coded" commands (like "shutdown" or "open chrome") using fuzzy matching.
4. If a command is found, it triggers the corresponding **Service** (e.g., executing a PowerShell script).
5. If no specific command matches, the input is sent to the **AI Model** (Gemini/OpenRouter) to generate a natural language response.
6. The response is sent back to the user (and spoken aloud if in voice mode).

### 2. Device Connectivity
The backend acts as a bridge. When a user sends a command via the **Telegram Bot**, the backend processes it and, if it's a device command, executes it on the host laptop where the server is running. This allows for remote control of your computer from anywhere in the world.

### 3. Security
- **JWT-based Auth**: Ensures only the owner can access the assistant.
- **Authorization Layer**: Commands like "Shutdown" can be restricted to specific "Owner" IDs (Telegram Chat ID or User ID) to prevent unauthorized access.

---

## 👤 Project Staff / Credits
- **Lead Developer**: Riya Garg (Backend Author)
- **UI/UX Design**: Built with a focus on modern, interactive aesthetics (glassmorphism, animations).
- **AI Architecture**: Integrated with Google Gemini for advanced reasoning.

---

## 📜 Summary
The Virtual AI Assistant is more than just a chatbot; it is a system-integrated utility that bridges the gap between AI conversation and physical device control. Its modular architecture allows for easy expansion of commands and support for additional AI models.
