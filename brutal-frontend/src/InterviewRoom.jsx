import React, { useState, useRef, useEffect } from "react";
import axios from "axios";

// Polyfill for speech recognition
// NOTE: We use the browser's NATIVE Speech-to-Text API (webkitSpeechRecognition)
// This saves us from managing audio blobs, sending them to the backend, and paying for Whisper API.
// It transcribes the user's speech instantly into text locally on the client.
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

export default function InterviewRoom() {
  const [appState, setAppState] = useState("UPLOAD_RESUME"); // UPLOAD_RESUME, ANALYZING, INTERVIEW, JUDGING
  const [questions, setQuestions] = useState([]);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  
  // UI text and states
  const [loadingText, setLoadingText] = useState("");
  const [personaAnalysis, setPersonaAnalysis] = useState("");
  const [roastData, setRoastData] = useState(null);
  
  // Audio & Transcription states
  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState("");
  const recognitionRef = useRef(null);

  // Initialize Speech Recognition Native API
  useEffect(() => {
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      // continuous = true allows it to keep listening even if the user pauses briefly
      recognition.continuous = true;
      // interimResults = true allows us to display the text as they are speaking it (live subtitles)
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event) => {
        let currentTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setLiveTranscript(currentTranscript);
      };
      
      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };
      
      recognition.onend = () => {
         // Auto-stop handled via state
         setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      console.warn("SpeechRecognition not supported in this browser.");
    }
  }, []);

  // Native Text-to-Speech Helper
  const speakText = (text, onEndCallback = null) => {
    if (!window.speechSynthesis) return;
    
    // Stop any current speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9; // Slightly slower, more deliberate
    utterance.pitch = 0.8; // Lower pitch for "Senior Dev" vibe
    
    if (onEndCallback) {
        utterance.onend = onEndCallback;
    }
    
    window.speechSynthesis.speak(utterance);
  };

  // --- Handlers ---

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setAppState("ANALYZING");
    setLoadingText("Senior Dev is opening your PDF and sighing...");

    try {
      const formData = new FormData();
      formData.append("resume", file);
      
      // Hit the dynamic backend parser
      const res = await axios.post("http://127.0.0.1:8000/api/upload-resume/", formData, {
          headers: { "Content-Type": "multipart/form-data" }
      });
      
      const analysis = res.data.persona_analysis;
      const fetchedQuestions = res.data.questions;
      
      setQuestions(fetchedQuestions);
      setPersonaAnalysis(analysis);
      setCurrentQIndex(0);

      // Add dramatic delay
      setTimeout(() => {
        setLoadingText(""); // Clear loading
        speakText(analysis, () => {
           // When speech ends, go to INTERVIEW and ask first question
           setAppState("INTERVIEW");
           speakText("Question 1. " + fetchedQuestions[0].text);
        });
      }, 2000);

    } catch (err) {
      console.error(err);
      setAppState("UPLOAD_RESUME");
    }
  };

  const startAnswering = () => {
    setLiveTranscript("");
    if (recognitionRef.current) {
        try {
            recognitionRef.current.start();
            setIsListening(true);
        } catch (e) {
            console.error("Failed to start speech recognition", e);
        }
    }
  };

  const stopAnsweringAndSubmit = async () => {
    if (recognitionRef.current) {
        recognitionRef.current.stop();
        setIsListening(false);
    }
    
    setAppState("JUDGING");
    setLoadingText("Analyzing your nonsense...");

    try {
      const res = await axios.post("http://127.0.0.1:8000/api/evaluate/", {
          question_id: questions[currentQIndex].id,
          text: liveTranscript
      });
      
      setLoadingText("");
      setRoastData(res.data);
      
      // Let the Dev read the roast
      speakText(res.data.roast);

    } catch (err) {
      console.error(err);
      setAppState("INTERVIEW");
    }
  };
  
  const nextQuestion = () => {
      setRoastData(null);
      const nextQ = currentQIndex + 1;
      
      if (nextQ < questions.length) {
          setCurrentQIndex(nextQ);
          setAppState("INTERVIEW");
          speakText("Next Question. " + questions[nextQ].text);
      } else {
          setAppState("UPLOAD_RESUME"); // Reset demo
          speakText("This interview is over. Don't call us, we won't call you.");
      }
  };

  // --- UI Renders ---

  return (
    <div className="min-h-screen bg-slate-950 text-indigo-100 font-outfit flex flex-col items-center justify-center p-6 relative">
      
      <div className="absolute top-4 left-4 text-xs opacity-50 uppercase">
        Connection: SECURE // Audio: ACTIVE
      </div>

      <h1 className="text-4xl md:text-6xl mb-12 font-extrabold tracking-tight text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500 pb-2">
        <span className="text-rose-500">💀</span> The Brutal Tech Lead
      </h1>

      <div className="w-full max-w-2xl bg-slate-900/80 backdrop-blur-md border border-indigo-500/20 rounded-2xl p-8 shadow-2xl shadow-indigo-500/10">

        {/* STATE: UPLOAD RESUME */}
        {appState === "UPLOAD_RESUME" && (
          <div className="flex flex-col items-center text-center">
             <p className="mb-6 indent-8 text-xl">
               Welcome to your technical interview. Upload your resume. Don't worry, we won't actually read it.
             </p>
             <label className="border-2 border-dashed border-indigo-500/50 rounded-xl p-12 w-full hover:bg-indigo-500/10 cursor-pointer transition-colors group">
               <span className="block text-2xl font-bold mb-2 group-hover:scale-105 transition-transform">Drop PDF Here</span>
               <span className="text-sm opacity-50">Or click to browse</span>
               <input type="file" className="hidden" accept=".pdf" onChange={handleFileUpload} />
             </label>
          </div>
        )}

        {/* STATE: ANALYZING RESUME */}
        {appState === "ANALYZING" && (
          <div className="flex flex-col items-center text-center py-12">
             <div className="animate-pulse text-3xl mb-4 font-bold text-yellow-500 bg-yellow-900/20 px-4 py-2 border border-yellow-700 inline-block">
               [ PROCESSING DATA ]
             </div>
             <p className="text-xl blink">{loadingText}</p>
             
             {personaAnalysis && (
                 <div className="mt-8 text-left border-l-4 border-blue-500 pl-4 text-white">
                     "{personaAnalysis}"
                 </div>
             )}
          </div>
        )}

        {/* STATE: INTERVIEW */}
        {appState === "INTERVIEW" && questions.length > 0 && (
          <div className="flex flex-col w-full">
            <div className="flex justify-between items-center mb-4">
              <div className="text-sm font-semibold text-indigo-300 uppercase tracking-wider">Question {currentQIndex + 1} of {questions.length}</div>
              {questions[currentQIndex].difficulty && (
                <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  questions[currentQIndex].difficulty === 'EASY' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                  questions[currentQIndex].difficulty === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {questions[currentQIndex].difficulty}
                </div>
              )}
            </div>
            
            <div className="text-2xl mb-8 leading-relaxed font-medium bg-slate-950/50 rounded-xl p-6 border border-indigo-500/20 shadow-inner">
               {questions[currentQIndex].text}
            </div>

            <div className="bg-slate-950/50 rounded-xl border border-indigo-500/20 p-4 mb-6 min-h-32 flex flex-col focus-within:border-indigo-400/50 transition-colors">
                <div className="text-xs text-gray-500 mb-2 uppercase tracking-widest">Live Transcript / Manual Input</div>
                <textarea 
                    className="w-full bg-transparent text-white text-lg resize-none outline-none flex-grow min-h-24 placeholder-gray-700"
                    placeholder="Waiting for you to speak, or click here to type..."
                    value={liveTranscript}
                    onChange={(e) => setLiveTranscript(e.target.value)}
                />
            </div>

            <div className="flex flex-col md:flex-row gap-4">
                <button
                   onClick={() => isListening ? stopAnsweringAndSubmit() : startAnswering()}
                   className={`flex-grow py-6 text-2xl font-bold uppercase transition-all ${
                       isListening 
                       ? 'bg-red-600 text-white animate-pulse shadow-[0_0_20px_rgba(220,38,38,0.5)]' 
                       : 'bg-green-700 hover:bg-green-600 text-black'
                   }`}
                >
                   {isListening ? "🎙️ Tap to Stop" : "Tap to Speak"}
                </button>
                
                <button
                   onClick={() => stopAnsweringAndSubmit()}
                   className="py-6 px-8 text-xl font-bold uppercase bg-gray-800 hover:bg-gray-700 text-white border-2 border-green-700 transition-all text-nowrap"
                >
                   Submit Text
                </button>
            </div>
            <p className="text-center text-xs mt-4 opacity-50">Warning: Silence or short texts are heavily penalized.</p>
          </div>
        )}

        {/* STATE: JUDGING */}
        {appState === "JUDGING" && (
          <div className="flex flex-col w-full">
             {loadingText ? (
                 <div className="text-center py-12 text-2xl animate-pulse text-amber-500">
                     {loadingText}
                 </div>
             ) : (
                 roastData && (
                     <div className="animate-fade-in-up">
                         <div className="mb-6 p-6 bg-slate-900/80 rounded-xl border border-indigo-500/20 shadow-lg">
                             <div className="uppercase text-xs text-indigo-400 font-bold tracking-widest mb-2">Technical Feedback:</div>
                             <p className="text-2xl font-medium mb-4 text-indigo-100">"{roastData.roast}"</p>
                             
                             <div className="flex items-end justify-between mt-6 pt-4 border-t border-indigo-500/20">
                                 <div>
                                     <div className="text-xs opacity-70 uppercase mb-1">Score</div>
                                     <div className={`text-4xl font-bold ${roastData.score < 5 ? 'text-rose-500' : 'text-emerald-500'}`}>
                                         {roastData.score}/10
                                     </div>
                                 </div>
                             </div>
                         </div>
                         
                         <div className="p-6 bg-emerald-950/20 rounded-xl border border-emerald-500/20 text-emerald-200 mb-8 shadow-inner">
                             <div className="uppercase text-xs font-bold text-emerald-400 mb-2">Ideal Answer:</div>
                             <p className="leading-relaxed whitespace-pre-line">{roastData.correct_answer}</p>
                         </div>

                         <button
                            onClick={nextQuestion}
                            className="w-full py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-500/20 transition-all"
                         >
                            I Accept My Flaws. Next Question.
                         </button>
                     </div>
                 )
             )}
          </div>
        )}

      </div>
      
    </div>
  );
}
