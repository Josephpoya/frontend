import { useState, useRef, useEffect } from 'react';
import puter from '@heyputer/puter.js';

export default function VideoTTSApp() {
  const [video, setVideo] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [finalVideoUrl, setFinalVideoUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("openai"); // Changed default to openai (works better)
  const [selectedVoice, setSelectedVoice] = useState("alloy");
  const [puterReady, setPuterReady] = useState(false);
  const videoRef = useRef(null);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  // Check if Puter is ready
  useEffect(() => {
    const checkPuter = async () => {
      try {
        if (typeof puter !== 'undefined' && puter.ai) {
          setPuterReady(true);
          console.log("✅ Puter.js is ready");
        } else {
          console.warn("⚠️ Puter.js not detected");
          setError("Puter.js is loading. Please wait or refresh the page.");
        }
      } catch (err) {
        console.error("Puter check error:", err);
        setError("Failed to initialize Puter.js");
      }
    };
    
    checkPuter();
  }, []);

  // Function to generate TTS using Puter (frontend only)
  const generateTTSWithPuter = async (text) => {
    try {
      if (!puterReady) {
        throw new Error("Puter.js is not ready. Please refresh the page.");
      }

      setProgress("Generating speech with Puter...");
      console.log("Calling Puter TTS with:", { provider: selectedProvider, voice: selectedVoice });
      
      // Puter.js TTS call - no API key needed!
      const audioElement = await puter.ai.txt2speech(text, {
        provider: selectedProvider, // "aws-polly", "openai", or "elevenlabs"
        voice: selectedVoice,
        engine: "standard", // Changed from "neural" for better compatibility
        language: "en-US"
      });
      
      if (!audioElement || !audioElement.src) {
        throw new Error("No audio generated from Puter");
      }
      
      console.log("Audio generated successfully:", audioElement.src);
      
      // Convert audio element to blob for sending to backend
      const response = await fetch(audioElement.src);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.status}`);
      }
      const blob = await response.blob();
      return blob;
      
    } catch (err) {
      console.error("Puter TTS error details:", err);
      
      // Provide user-friendly error messages
      if (err.message.includes("login") || err.message.includes("auth")) {
        throw new Error("Please sign in to Puter.com first, then try again.");
      }
      if (err.message.includes("provider")) {
        throw new Error(`Provider "${selectedProvider}" may require additional setup. Try a different provider.`);
      }
      throw new Error(`TTS generation failed: ${err.message}`);
    }
  };

  const handleGenerate = async () => {
    if (!video) {
      setError("Please select a video file");
      return;
    }
    if (!transcript) {
      setError("Please enter a transcript");
      return;
    }
    if (!puterReady) {
      setError("Puter.js is not ready. Please refresh the page and try again.");
      return;
    }

    setLoading(true);
    setError("");
    setProgress("Starting processing...");
    setFinalVideoUrl(null);

    try {
      // Step 1: Generate TTS using Puter (frontend)
      const audioBlob = await generateTTSWithPuter(transcript);
      
      setProgress(`Audio generated! Size: ${(audioBlob.size / 1024).toFixed(2)} KB`);
      setProgress("Uploading to server for video processing...");
      
      // Step 2: Send video + generated audio to backend for merging
      const formData = new FormData();
      formData.append("video", video);
      formData.append("audio", audioBlob, "speech.mp3");
      
      console.log("Sending to backend:", BACKEND_URL);
      const response = await fetch(`${BACKEND_URL}/api/process-with-audio`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" }));
        throw new Error(errorData.error || `Server responded with ${response.status}`);
      }

      setProgress("Downloading processed video...");
      const finalBlob = await response.blob();
      const url = URL.createObjectURL(finalBlob);
      setFinalVideoUrl(url);
      setProgress("Complete!");
      
      // Clean up old URL
      if (videoRef.current?.src && videoRef.current.src !== url) {
        URL.revokeObjectURL(videoRef.current.src);
      }
      
    } catch (err) {
      console.error("HandleGenerate error:", err);
      setError(err.message);
      setProgress("");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setVideo(null);
    setTranscript("");
    setFinalVideoUrl(null);
    setError("");
    setProgress("");
    if (videoRef.current?.src) {
      URL.revokeObjectURL(videoRef.current.src);
    }
  };

  // Voice options for different providers
  const voiceOptions = {
    "aws-polly": ["Joanna", "Matthew", "Ivy", "Joey", "Salli", "Kimberly"],
    "openai": ["alloy", "echo", "fable", "nova", "onyx", "shimmer"],
    "elevenlabs": ["rachel", "adam", "antoni", "bella", "domi", "elli"]
  };

  // Provider display names
  const providerNames = {
    "aws-polly": "Amazon Polly",
    "openai": "OpenAI TTS",
    "elevenlabs": "ElevenLabs"
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-2xl p-6 space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-800">
              AI Video Voice Sync
            </h1>
            <p className="text-gray-500 mt-2">Powered by Puter.js - No API Keys Required!</p>
            {!puterReady && (
              <p className="text-yellow-600 text-sm mt-1">⏳ Loading Puter.js...</p>
            )}
            {puterReady && (
              <p className="text-green-600 text-sm mt-1">✅ Puter.js ready</p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}

          {progress && !error && (
            <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 px-4 py-3 rounded">
              <p>{progress}</p>
            </div>
          )}

          <div className="space-y-4">
            {/* Video Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Video File *
              </label>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setVideo(e.target.files[0])}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800"
                disabled={loading}
              />
              {video && (
                <p className="text-sm text-gray-500 mt-1">
                  Selected: {video.name} ({(video.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>

            {/* Provider Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                TTS Provider
              </label>
              <select
                value={selectedProvider}
                onChange={(e) => {
                  setSelectedProvider(e.target.value);
                  setSelectedVoice(voiceOptions[e.target.value][0]);
                }}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                disabled={loading}
              >
                <option value="openai">OpenAI TTS (Recommended)</option>
                <option value="aws-polly">Amazon Polly</option>
                <option value="elevenlabs">ElevenLabs</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Users pay for their own usage through their Puter account. {!puterReady && "Waiting for Puter.js to load..."}
              </p>
            </div>

            {/* Voice Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Voice
              </label>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
                disabled={loading}
              >
                {voiceOptions[selectedProvider]?.map(voice => (
                  <option key={voice} value={voice}>{voice}</option>
                ))}
              </select>
            </div>

            {/* Transcript */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transcript *
              </label>
              <textarea
                placeholder="Paste your transcript here..."
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg h-32 focus:ring-2 focus:ring-black font-mono text-sm"
                disabled={loading}
              />
              <div className="flex justify-between text-sm mt-1">
                <p className="text-gray-500">
                  Characters: {transcript.length} / 4096
                </p>
                {transcript.length > 3500 && (
                  <p className="text-orange-500">
                    {4096 - transcript.length} remaining
                  </p>
                )}
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={handleGenerate}
                disabled={loading || !puterReady}
                className="flex-1 bg-black text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing...
                  </span>
                ) : (
                  "Generate & Download"
                )}
              </button>
              
              <button
                onClick={handleClear}
                disabled={loading}
                className="px-6 bg-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-300 transition disabled:opacity-50"
              >
                Clear
              </button>
            </div>
          </div>

          {finalVideoUrl && (
            <div className="mt-6 space-y-4">
              <h3 className="font-semibold text-gray-700">Processed Video:</h3>
              <video
                ref={videoRef}
                controls
                src={finalVideoUrl}
                className="w-full rounded-lg shadow-lg"
              />
              <a
                href={finalVideoUrl}
                download="synced_video.mp4"
                className="inline-block w-full text-center bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
              >
                Download Video
              </a>
            </div>
          )}
        </div>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Powered by Puter.js • Users pay for their own TTS usage</p>
          <p className="text-xs mt-1">
            Need a Puter account? <a href="https://puter.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Sign up here</a>
          </p>
        </div>
      </div>
    </div>
  );
}