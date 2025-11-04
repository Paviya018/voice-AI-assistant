import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import ParticlesBg from "particles-bg";

export default function App() {
  const [file, setFile] = useState(null);
  const [language, setLanguage] = useState("English");
  const [summary, setSummary] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [avatarGlow, setAvatarGlow] = useState(0);
  const [avatarExpression, setAvatarExpression] = useState("🙂");

  const audioRef = useRef(null);
  const backendURL = "http://127.0.0.1:8000"; // your backend

  const languages = [
    "English",
    "Tamil",
    "Hindi",
    "Telugu",
    "Kannada",
    "Malayalam",
    "Bengali",
    "Marathi",
    "Gujarati",
    "Punjabi",
    "Urdu",
    "Spanish",
    "French",
    "German",
  ];

  // ✅ Ensure AudioContext resumes on user click
  useEffect(() => {
    const resumeAudioContext = () => {
      if (window.AudioContext || window.webkitAudioContext) {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === "suspended") ctx.resume();
      }
    };
    window.addEventListener("click", resumeAudioContext);
    return () => window.removeEventListener("click", resumeAudioContext);
  }, []);

  // 🎧 Avatar glow + expression sync with audio
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let audioCtx, analyser, source, dataArray, animationId;

    const setupAudioAnalyser = () => {
      if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        source = audioCtx.createMediaElementSource(audio);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        const bufferLength = analyser.frequencyBinCount;
        dataArray = new Uint8Array(bufferLength);

        // ✅ Connect analyser only for visualization — don’t override sound
        source.connect(analyser);
        analyser.connect(audioCtx.destination);

        const update = () => {
          analyser.getByteFrequencyData(dataArray);
          const avg =
            dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;
          setAvatarGlow(avg);

          // 😃 facial reactions
          if (avg > 0.3) setAvatarExpression("😃");
          else if (avg > 0.1) setAvatarExpression("🙂");
          else setAvatarExpression("😌");

          animationId = requestAnimationFrame(update);
        };
        update();
      }
    };

    const handlePlay = () => {
      setupAudioAnalyser();
      audio.muted = false;
      audio.volume = 1.0;
    };

    const handlePause = () => cancelAnimationFrame(animationId);
    const handleEnded = () => {
      setAvatarGlow(0);
      setAvatarExpression("😴");
    };

    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);
    audio.addEventListener("ended", handleEnded);

    return () => {
      cancelAnimationFrame(animationId);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [audioUrl]);

  // 👁️ Blinking animation
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      setAvatarExpression((prev) => (prev === "😉" ? "🙂" : "😉"));
    }, 4000 + Math.random() * 2000);
    return () => clearInterval(blinkInterval);
  }, []);

  // 📄 Handle file upload
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return setError("Please upload a file first!");
    setError("");
    setSummary("");
    setAudioUrl("");
    setLoading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("language", language);

    try {
      const res = await axios.post(`${backendURL}/process`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.error) {
        setError(res.data.error);
      } else {
        setSummary(res.data.summary);
        setAudioUrl(`${backendURL}${res.data.audio_url}`);
      }
    } catch (err) {
      console.error("❌ Upload failed:", err);
      setError("⚠️ Failed to process. Check backend or try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden text-white">
      <ParticlesBg type="cobweb" bg={true} color="#ffffff" num={120} />

      <div className="relative card max-w-lg w-full animate-fadeIn bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-3xl shadow-2xl">
        {/* 🤖 Avatar */}
        <div className="flex flex-col items-center mb-4">
          <div
            className="w-32 h-32 rounded-full border-4 border-white/40 flex items-center justify-center transition-all duration-100"
            style={{
              background: `radial-gradient(circle at center, rgba(255,100,255,${
                0.3 + avatarGlow * 1.2
              }), rgba(0,0,0,0.5))`,
              boxShadow: `0 0 ${10 + avatarGlow * 50}px rgba(255,100,255,${
                0.4 + avatarGlow
              })`,
              transform: `scale(${1 + avatarGlow * 0.1})`,
            }}
          >
            <span
              className="text-5xl transition-all duration-100"
              style={{
                transform: `scale(${1 + avatarGlow * 0.2}) rotate(${
                  avatarGlow * 3
                }deg)`,
              }}
            >
              {avatarExpression}
            </span>
          </div>

          <h1 className="text-3xl font-extrabold mt-4 text-white drop-shadow-lg">
            Doc → Voice AI Assistant
          </h1>
          <p className="text-indigo-100 text-center mt-2">
            Upload a document & hear your friendly AI summarize it 🎧
          </p>
        </div>

        {/* 📤 Upload Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <input
            type="file"
            accept=".pdf,.docx,.txt"
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full bg-white/20 border border-white/30 p-3 rounded-lg cursor-pointer text-white hover:bg-white/30 transition"
          />

          <div>
            <label className="block text-indigo-100 font-semibold mb-1">
              🌍 Choose Language
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full bg-white/20 border border-white/30 p-3 rounded-lg text-white focus:ring focus:ring-pink-400"
            >
              {languages.map((lang) => (
                <option key={lang} value={lang} className="text-black">
                  {lang}
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-pink-500 to-indigo-500 text-white p-3 rounded-lg font-semibold shadow-lg hover:scale-105 transition-all hover:shadow-pink-500/50"
          >
            {loading ? "Processing..." : "Generate Summary & Voice 🎙️"}
          </button>
        </form>

        {/* ⚠️ Error Message */}
        {error && (
          <p className="text-red-400 mt-4 text-center font-semibold">{error}</p>
        )}

        {/* 📝 Summary */}
        {summary && (
          <div className="mt-6 bg-white/10 p-4 rounded-xl shadow-inner text-indigo-50 animate-fadeIn border border-white/20">
            <h2 className="text-xl font-bold mb-2 text-pink-300">
              📝 Friendly Summary
            </h2>
            <p className="leading-relaxed whitespace-pre-wrap">{summary}</p>
          </div>
        )}

        {/* 🎧 Audio Player */}
        {audioUrl && (
          <div className="mt-6 text-center animate-fadeIn">
            <h3 className="text-lg font-semibold text-pink-300 mb-2">
              🎧 Listen Here
            </h3>
            <audio
              ref={audioRef}
              controls
              autoPlay
              muted={false}
              volume={1.0}
              crossOrigin="anonymous"
              src={audioUrl}
              className="w-full rounded-lg"
            />
          </div>
        )}
      </div>

      <p className="absolute bottom-4 text-sm text-indigo-200">
        ⚡ Built by You — Powered by AI ✨
      </p>
    </div>
  );
}
