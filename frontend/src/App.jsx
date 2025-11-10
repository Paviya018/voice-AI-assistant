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
  const [serverWaking, setServerWaking] = useState(true);
  const [avatarGlow, setAvatarGlow] = useState(0);
  const [avatarExpression, setAvatarExpression] = useState("🙂");

  const audioRef = useRef(null);

  // ✅ Your Render backend (HTTPS)
  const backendURL = "https://voice-ai-assistant-a0by.onrender.com";

  const languages = [
    "English", "Tamil", "Hindi", "Telugu", "Kannada", "Malayalam",
    "Bengali", "Marathi", "Gujarati", "Punjabi", "Urdu",
    "Spanish", "French", "German",
  ];

  // ✅ Wake backend once when page loads
  useEffect(() => {
    axios.get(backendURL + "/")
      .then(() => setServerWaking(false))
      .catch(() => setServerWaking(false));
  }, []);

  // ✅ Keep backend awake (important fix for phone)
  useEffect(() => {
    const interval = setInterval(() => {
      axios.get(backendURL + "/").catch(() => {});
    }, 40000); // ping every 40 seconds
    return () => clearInterval(interval);
  }, []);

  // ✅ Avatar expression reacts to voice
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
        dataArray = new Uint8Array(analyser.frequencyBinCount);
        source.connect(analyser);
        analyser.connect(audioCtx.destination);

        const update = () => {
          analyser.getByteFrequencyData(dataArray);
          const avg = dataArray.reduce((a, b) => a + b, 0) / dataArray.length / 255;
          setAvatarGlow(avg);
          if (avg > 0.3) setAvatarExpression("😃");
          else if (avg > 0.1) setAvatarExpression("🙂");
          else setAvatarExpression("😌");
          animationId = requestAnimationFrame(update);
        };
        update();
      }
    };

    audio.addEventListener("play", setupAudioAnalyser);
    return () => cancelAnimationFrame(animationId);
  }, [audioUrl]);


  // ✅ Submit Form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) return setError("Please upload a file!");

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

      if (res.data.error) setError(res.data.error);
      else {
        setSummary(res.data.summary);
        setAudioUrl(`${backendURL}${res.data.audio_url}`);
      }
    } catch {
      setError("⚠️ Backend is waking up. Try again in 10 seconds.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Show initial wake message
  if (serverWaking) {
    return (
      <div className="h-screen flex justify-center items-center text-white text-2xl">
        🚀 Waking up the server... please wait...
      </div>
    );
  }

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden text-white">
      <ParticlesBg type="cobweb" bg={true} />

      <div className="relative max-w-lg w-full bg-white/10 backdrop-blur-md p-8 rounded-3xl shadow-2xl border border-white/20">

        <h1 className="text-3xl font-bold text-center mb-6">Doc → Voice AI Assistant 🎧</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <input type="file" accept=".pdf,.docx,.txt"
            onChange={(e) => setFile(e.target.files[0])}
            className="w-full bg-white/20 p-3 rounded-lg cursor-pointer" />

          <select value={language} onChange={(e) => setLanguage(e.target.value)}
            className="w-full bg-white/20 p-3 rounded-lg">
            {languages.map((lang) => (
              <option key={lang} className="text-black">{lang}</option>
            ))}
          </select>

          <button type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-pink-500 to-indigo-500 p-3 rounded-lg font-semibold">
            {loading ? "Processing..." : "Generate 🎙️"}
          </button>
        </form>

        {error && <p className="text-red-400 text-center mt-4">{error}</p>}

        {summary && (
          <div className="mt-6 bg-white/10 p-4 rounded-xl">
            <h2 className="text-xl font-bold mb-2">📝 Summary</h2>
            <p>{summary}</p>
          </div>
        )}

        {audioUrl && (
          <audio ref={audioRef} controls autoPlay src={audioUrl} className="w-full mt-6" />
        )}
      </div>
    </div>
  );
}
