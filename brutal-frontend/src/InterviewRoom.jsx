import React, { useState, useRef } from "react";
import axios from "axios";
import { QUESTIONS } from "./questions";

export default function InterviewRoom() {
  const [selectedQ, setSelectedQ] = useState("1");
  const [recording, setRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [textAnswer, setTextAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const mediaRecorderRef = useRef(null);
  const chunks = useRef([]);

  // ---- RECORDING LOGIC ----
  const startRecording = async () => {
    

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "audio/webm;codecs=opus"
    });

    mediaRecorderRef.current = mediaRecorder;
    chunks.current = [];

    console.log("Recording started");

    mediaRecorder.ondataavailable = (e) => {
      console.log("CHUNK SIZE:", e.data.size);
      if (e.data.size > 0) {
        chunks.current.push(e.data);
     }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunks.current, { type: "audio/webm;codecs=opus" });
      setAudioBlob(blob);
 
      console.log("FINAL SIZE:", blob.size);

      
    };

    mediaRecorder.start(1000);
    setRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current.stop();
    setRecording(false);
  };

  // ---- SUBMIT ---- added real that'll support both text and audio answers
  // ---- properly handles multipart form data for audio and text answers ----
  // and updates the UI based on the response from the backend. ----
  const submitAnswer = async () => {
  setLoading(true);
  setResult(null);

  const formData = new FormData();
  formData.append("question_id", selectedQ);

  if (audioBlob) {
    formData.append("audio", audioBlob, "answer.webm");
  } else {
    formData.append("text", textAnswer);
  }

  try {
    const res = await axios.post(
      "http://127.0.0.1:8000/api/evaluate/",
      formData,
      {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      }
    );

    setResult(res.data);
  } catch (err) {
    console.error(err);
  }

  setLoading(false);
};


  return (
    <div className="min-h-screen bg-black text-green-400 flex flex-col items-center justify-center p-6 font-mono">
    
      <h1 className="text-3xl mb-6">💀 The Brutal Tech Lead</h1>

      {/* Question Select */}
      <select
        className="bg-gray-900 p-2 mb-4 w-80"
        value={selectedQ}
        onChange={(e) => setSelectedQ(e.target.value)}
      >
        {QUESTIONS.map((q) => (
          <option key={q.id} value={q.id}>
            {q.text}
          </option>
        ))}
      </select>

      {/* Record Button */}
      <button
        onMouseDown={startRecording}
        onMouseUp={stopRecording}
        className="bg-red-700 px-4 py-2 mb-4 w-80"
      >
        {recording ? "Recording..." : "Hold to Record"}
      </button>

      {/* Text fallback */}
      <textarea
        placeholder="Mic broken? Type your answer here..."
        className="w-80 bg-gray-900 p-2 mb-4"
        value={textAnswer}
        onChange={(e) => setTextAnswer(e.target.value)}
      />

      {/* Submit */}
      <button
        onClick={submitAnswer}
        className="bg-green-700 px-4 py-2 w-80"
      >
        Submit Answer
      </button>

      {/* Audio Playback Test */}
      {audioBlob && (
        <div className="mt-4">
          <p className="text-sm mb-1">🎧 Playback:</p>
          <audio controls src={URL.createObjectURL(audioBlob)} />
        </div>
      )}


      {/* Loading */}
      {loading && (
        <p className="mt-4">The Senior Dev is judging you...</p>
      )}

      {/* Result */}
      {result && (
        <div className="mt-6 bg-gray-900 p-4 w-96">
          <p className="mb-2">💬 Roast: {result.roast}</p>
          <p className="mb-2">📊 Score: {result.score}/10</p>
          <p className="mb-2">✅ Correct Answer: {result.correct_answer}</p>
          <p className="text-gray-500">📝 Transcript: {result.transcript}</p>
        </div>
      )}
    </div>
  );

}
