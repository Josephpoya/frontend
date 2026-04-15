import { useState, useRef } from 'react';

export default function VideoTTSApp() {
  const [video, setVideo] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [finalVideoUrl, setFinalVideoUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const videoRef = useRef(null);

  // Use environment variable for backend URL
  const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';

  const handleGenerate = async () => {
    // Validation
    if (!video) {
      setError("Please select a video file");
      return;
    }
    if (!transcript) {
      setError("Please enter a transcript");
      return;
    }
    if (transcript.length > 4096) {
      setError("Transcript is too long. Maximum 4096 characters.");
      return;
    }
    if (!apiKey && !import.meta.env.VITE_OPENAI_API_KEY) {
      setError("Please provide an OpenAI API key");
      return;
    }

    setLoading(true);
    setError("");
    setProgress("Starting processing...");
    setFinalVideoUrl(null);

    const formData = new FormData();
    formData.append("video", video);
    formData.append("transcript", transcript);
    formData.append("apiKey", apiKey || import.meta.env.VITE_OPENAI_API_KEY);

    try {
      setProgress("Uploading video to server...");
      const res = await fetch(`${BACKEND_URL}/api/process`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Processing failed");
      }

      setProgress("Downloading processed video...");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setFinalVideoUrl(url);
      setProgress("Complete!");
      
      // Clean up old URL
      if (videoRef.current?.src) {
        URL.revokeObjectURL(videoRef.current.src);
      }
    } catch (err) {
      setError(err.message);
      setProgress("");
      console.error("Error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setVideo(null);
    setTranscript("");
    setApiKey("");
    setFinalVideoUrl(null);
    setError("");
    setProgress("");
    if (videoRef.current?.src) {
      URL.revokeObjectURL(videoRef.current.src);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-2xl p-6 md:p-8 space-y-6">
          {/* Header */}
          <div className="text-center">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
              AI Video Voice Sync
            </h1>
            <p className="text-gray-500 mt-2">Replace video audio with AI-generated speech</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded">
              <p className="font-bold">Error</p>
              <p>{error}</p>
            </div>
          )}

          {/* Progress Message */}
          {progress && !error && (
            <div className="bg-blue-50 border-l-4 border-blue-500 text-blue-700 px-4 py-3 rounded">
              <p>{progress}</p>
            </div>
          )}

          {/* Form Fields */}
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
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-black file:text-white hover:file:bg-gray-800"
                disabled={loading}
              />
              {video && (
                <p className="text-sm text-gray-500 mt-1">
                  Selected: {video.name} ({formatFileSize(video.size)})
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Supported formats: MP4, MOV, AVI, MKV, WEBM (Max 100MB)
              </p>
            </div>

            {/* Transcript */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transcript *
              </label>
              <textarea
                placeholder="Paste your transcript here... (supports [00:00] timestamp format)"
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg h-32 focus:ring-2 focus:ring-black focus:border-transparent font-mono text-sm"
                disabled={loading}
              />
              <div className="flex justify-between text-sm mt-1">
                <p className="text-gray-500">
                  Characters: {transcript.length} / 4096
                </p>
                {transcript.length > 3500 && (
                  <p className="text-orange-500">
                    {4096 - transcript.length} characters remaining
                  </p>
                )}
              </div>
            </div>

            {/* API Key */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OpenAI API Key *
              </label>
              <input
                type="password"
                placeholder="sk-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">
                Your API key is sent directly to OpenAI and not stored on our servers
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Don't have one? <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Get it here</a>
              </p>
            </div>

            {/* Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={handleGenerate}
                disabled={loading}
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

          {/* Processed Video */}
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

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Powered by OpenAI TTS & FFmpeg</p>
          <p className="text-xs mt-1">
            Processing time depends on video length and transcript size
          </p>
        </div>
      </div>
    </div>
  );
}