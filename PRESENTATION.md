# 💀 The Brutal Tech Lead: PRESENTATION

## 🎯 The Core Problem
Most mock interview platforms are incredibly polite and standard. They lack the "stress test" element of a real, aggressive technical interview. The Brutal Tech Lead fixes this by exposing users to a psychologically stressful, sarcastic, highly-critical AI meant specifically to train them to answer questions clearly, confidently, and accurately without relying on filler words ("um", "ah").

## 🛠️ How it Works (The Architecture)

This project was built to prioritize **Zero-Latency Interactions** suitable for a live Hackathon Demo.

### 1. Browser-Native "Smoke & Mirrors"
Usually, Voice AI apps require sending audio blobs to a backend API (like Whisper), and receiving audio files back (like OpenAI TTS). This causes extreme latency (3-5+ seconds). 
We removed this entirely:
- **Speech-to-Text (STT)**: We utilize the browser's native `webkitSpeechRecognition` API. When the user holds the record button, their voice is instantly converted to text as live subtitles on the frontend.
- **Text-to-Speech (TTS)**: The bot relies on `window.speechSynthesis` (native browser voice API), customized to have a lower pitch (0.8) and slower speed (0.9) to sound intentionally condescending. 

### 2. Django Backend & Generative AI SDK
When the user uploads a resume or submits a text transcript:
- **`PyPDF2`**: Physically extracts raw text from the uploaded PDF.
- **`google-genai` (Gemini 2.5 Flash)**: The extracted resume text is sent to the Gemini language model. It determines the user's specific stack (React, Python, etc.) and generates 3 custom, highly difficult questions. 
- **Real-time Grading Engine**: When a transcribed answer is submitted, Gemini analyzes the direct quote. It detects filler words, semantic correctness, and length, evaluating the candidate aggressively and returning a JSON object containing the Roast, Score, and Correct Answer.
- **Resilience Engine**: We implemented a `generate_with_fallback` loop in Python. If `gemini-2.5-flash` throws a 503 (Server Overload) or 429 (Quota out), it flawlessly catches the exception and cascades execution to fallback/lite models without crashing the app.

---

## 🚀 What Should We Do Next? (Future Enhancements)

If we were to take this project beyond the hackathon, here is our roadmap:

1. **User Authentication & Profiles:**
   - Integrate Auth0 or Django Allauth.
   - Save user profiles so the Tech Lead "remembers" their past failures and grills them harder on topics they failed previously.
2. **WebSockets for Streaming:**
   - Migrate from standard HTTP POST requests over Axios to WebSocket (Django Channels).
   - This would allow the LLM to stream the roast back word-by-word instantly, instead of waiting for the full JSON payload to generate.
3. **Database Integration for Analytics:**
   - Configure PostgreSQL instead of the default SQLite.
   - Create `InterviewSession` and `QuestionLog` models to track scores over time, generating a "Pity Chart" of the candidate's progress.
4. **Custom Voice Cloning:**
   - Right now we use the native operating system TTS engine (which limits us to whatever voices the browser supports).
   - We would upgrade to ElevenLabs API to generate a truly terrifying, hyper-realistic, sarcastic human voice.
