import { useState, useRef } from 'react';

export default function VideoTTSApp() {
  const [video, setVideo] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [finalVideoUrl, setFinalVideoUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("aws-polly"); // Add provider selector
  const [selectedVoice, setSelectedVoice] = useState("Joanna");
  const videoRef = useRef(null);

  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  // Function to generate TTS using Puter (frontend only)
  const generateTTSWithPuter = async (text) => {
    try {
      setProgress("Generating speech with Puter...");
      
      // Puter.js TTS call - no API key needed!
      const audioElement = await puter.ai.txt2speech(text, {
        provider: selectedProvider, // "aws-polly", "openai", or "elevenlabs"
        voice: selectedVoice,
        engine: "neural", // For higher quality
        language: "en-US"
      });
      
      // Convert audio element to blob for sending to backend
      const blob = await fetch(audioElement.src).then(r => r.blob());
      return blob;
      
    } catch (err) {
      console.error("Puter TTS error:", err);
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

    setLoading(true);
    setError("");
    setProgress("Starting processing...");
    setFinalVideoUrl(null);

    try {
      // Step 1: Generate TTS using Puter (frontend)
      const audioBlob = await generateTTSWithPuter(transcript);
      
      setProgress("Uploading to server for video processing...");
      
      // Step 2: Send video + generated audio to backend for merging
      const formData = new FormData();
      formData.append("video", video);
      formData.append("audio", audioBlob, "speech.mp3");
      
      const response = await fetch(`${BACKEND_URL}/api/process-with-audio`, {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Processing failed");
      }

      setProgress("Downloading processed video...");
      const finalBlob = await response.blob();
      const url = URL.createObjectURL(finalBlob);
      setFinalVideoUrl(url);
      setProgress("Complete!");
      
    } catch (err) {
      setError(err.message);
      setProgress("");
    } finally {
      setLoading(false);
    }
  };

  // Voice options for different providers
  const voiceOptions = {
    "aws-polly": ["Joanna", "Matthew", "Ivy", "Joey", "Salli", "Kimberly"],
    "openai": ["alloy", "echo", "fable", "nova", "onyx", "shimmer"],
    "elevenlabs": ["rachel", "adam", "antoni", "bella", "domi", "elli"]
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
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black"
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
                className="w-full p-2 border border-gray-300 rounded-lg"
                disabled={loading}
              >
                <option value="aws-polly">Amazon Polly (Free via Puter)</option>
                <option value="openai">OpenAI TTS (via Puter)</option>
                <option value="elevenlabs">ElevenLabs (via Puter)</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Users pay for their own usage through their Puter account
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
                className="w-full p-2 border border-gray-300 rounded-lg"
                disabled={loading}
              >
                {voiceOptions[selectedProvider].map(voice => (
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
                className="w-full p-3 border border-gray-300 rounded-lg h-32 focus:ring-2 focus:ring-black"
                disabled={loading}
              />
              <p className="text-sm text-gray-500 mt-1">
                Characters: {transcript.length} / 4096
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-4">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="flex-1 bg-black text-white py-3 rounded-xl font-medium hover:bg-gray-800 transition disabled:opacity-50"
              >
                {loading ? "Processing..." : "Generate & Download"}
              </button>
              
              <button
                onClick={() => {
                  setVideo(null);
                  setTranscript("");
                  setFinalVideoUrl(null);
                  setError("");
                  setProgress("");
                }}
                disabled={loading}
                className="px-6 bg-gray-200 text-gray-700 py-3 rounded-xl font-medium hover:bg-gray-300 transition"
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
        </div>
      </div>
    </div>
  );
}