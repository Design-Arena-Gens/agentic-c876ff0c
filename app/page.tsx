"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Status = "idle" | "speaking" | "paused";

type VoiceOption = {
  id: string;
  name: string;
  lang: string;
};

type HistoryItem = {
  id: string;
  text: string;
  voiceLabel: string;
  timestamp: number;
};

const createId = () => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
};

export default function HomePage() {
  const [availableVoices, setAvailableVoices] = useState<VoiceOption[]>([]);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [rate, setRate] = useState<number>(1);
  const [pitch, setPitch] = useState<number>(1);
  const [status, setStatus] = useState<Status>("idle");
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const supportsSpeech = useMemo(
    () => typeof window !== "undefined" && "speechSynthesis" in window,
    []
  );

  useEffect(() => {
    if (!supportsSpeech) {
      return;
    }

    const synth = window.speechSynthesis;

    const mapVoices = () => {
      const voices = synth.getVoices();
      const voiceOptions = voices.map((voice) => ({
        id: `${voice.name}-${voice.lang}`,
        name: voice.name,
        lang: voice.lang
      }));
      setAvailableVoices(voiceOptions);
      if (voiceOptions.length > 0 && !selectedVoiceId) {
        const defaultVoice = voiceOptions.find((voice) => voice.lang.startsWith("id")) ?? voiceOptions[0];
        setSelectedVoiceId(defaultVoice.id);
      }
    };

    mapVoices();
    synth.addEventListener("voiceschanged", mapVoices);

    return () => {
      synth.removeEventListener("voiceschanged", mapVoices);
      synth.cancel();
    };
  }, [supportsSpeech, selectedVoiceId]);

  const selectedVoice = useMemo(() => {
    if (!supportsSpeech) {
      return null;
    }
    const synthVoices = window.speechSynthesis.getVoices();
    return synthVoices.find((voice) => `${voice.name}-${voice.lang}` === selectedVoiceId) ?? null;
  }, [selectedVoiceId, supportsSpeech]);

  const resetUtteranceListeners = () => {
    if (utteranceRef.current) {
      utteranceRef.current.onend = null;
      utteranceRef.current.onerror = null;
    }
  };

  const stopSpeaking = () => {
    if (!supportsSpeech) {
      return;
    }
    resetUtteranceListeners();
    window.speechSynthesis.cancel();
    setStatus("idle");
    utteranceRef.current = null;
  };

  const handleSpeak = (value?: string) => {
    if (!supportsSpeech || !selectedVoice) {
      return;
    }

    const content = (value ?? text).trim();
    if (!content) {
      return;
    }

    stopSpeaking();

    const utterance = new SpeechSynthesisUtterance(content);
    utterance.voice = selectedVoice;
    utterance.rate = rate;
    utterance.pitch = pitch;
    utterance.lang = selectedVoice.lang;

    utterance.onend = () => {
      setStatus("idle");
      utteranceRef.current = null;
    };

    utterance.onerror = () => {
      setStatus("idle");
      utteranceRef.current = null;
    };

    utteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
    setStatus("speaking");

    setHistory((prev) => {
      const nextItem: HistoryItem = {
        id: createId(),
        text: content,
        voiceLabel: `${selectedVoice.name} · ${selectedVoice.lang}`,
        timestamp: Date.now()
      };
      const nextHistory = [nextItem, ...prev];
      return nextHistory.slice(0, 12);
    });
  };

  const togglePause = () => {
    if (!supportsSpeech || !utteranceRef.current) {
      return;
    }

    if (status === "speaking") {
      window.speechSynthesis.pause();
      setStatus("paused");
    } else if (status === "paused") {
      window.speechSynthesis.resume();
      setStatus("speaking");
    }
  };

  const statusLabel = useMemo(() => {
    if (status === "speaking") {
      return "Sedang diputar";
    }
    if (status === "paused") {
      return "Dijeda";
    }
    return "Siap";
  }, [status]);

  return (
    <main>
      <div className="card">
        <h1>Studio Text to Speech</h1>
        <p>
          Ketik atau tempelkan teks, pilih suara favoritmu, dan dengarkan hasilnya dalam hitungan detik.
          Aplikasi ini memanfaatkan Web Speech API sehingga seluruh proses berjalan langsung di browser.
        </p>

        {!supportsSpeech ? (
          <div className="status-pill" style={{ background: "rgba(239,68,68,0.12)", color: "#b91c1c" }}>
            Browser kamu belum mendukung fitur Text to Speech.
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div className="status-pill">
                <span>•</span>
                {statusLabel}
              </div>
              <span style={{ color: "#64748b", fontSize: "0.95rem" }}>
                {selectedVoice ? `${selectedVoice.name} · ${selectedVoice.lang}` : "Memuat suara …"}
              </span>
            </div>

            <label className="section-title" htmlFor="tts-text">
              Masukkan Teks
            </label>
            <textarea
              id="tts-text"
              placeholder="Contoh: Halo! Selamat datang di Studio Text to Speech buatanmu sendiri."
              value={text}
              onChange={(event) => setText(event.target.value)}
            />

            <div className="controls-grid" style={{ marginTop: "2rem" }}>
              <div>
                <div className="section-title">Pilih Suara</div>
                <select
                  value={selectedVoiceId}
                  onChange={(event) => setSelectedVoiceId(event.target.value)}
                  style={{
                    width: "100%",
                    padding: "0.9rem 1rem",
                    borderRadius: "14px",
                    border: "1px solid rgba(148, 163, 184, 0.4)",
                    fontSize: "1rem",
                    background: "white"
                  }}
                >
                  {availableVoices.length === 0 ? (
                    <option value="">Memuat daftar suara…</option>
                  ) : (
                    availableVoices.map((voice) => (
                      <option key={voice.id} value={voice.id}>
                        {voice.name} · {voice.lang}
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div className="slider-control">
                <label htmlFor="rate-slider">
                  Kecepatan <span>{rate.toFixed(2)}×</span>
                </label>
                <input
                  id="rate-slider"
                  type="range"
                  min={0.5}
                  max={1.75}
                  step={0.05}
                  value={rate}
                  onChange={(event) => setRate(Number(event.target.value))}
                />
              </div>

              <div className="slider-control">
                <label htmlFor="pitch-slider">
                  Pitch <span>{pitch.toFixed(2)}</span>
                </label>
                <input
                  id="pitch-slider"
                  type="range"
                  min={0.5}
                  max={1.75}
                  step={0.05}
                  value={pitch}
                  onChange={(event) => setPitch(Number(event.target.value))}
                />
              </div>
            </div>

            <div className="primary-actions" style={{ marginTop: "1.75rem" }}>
              <button className="btn-speak" onClick={() => handleSpeak()} disabled={!text.trim() || !selectedVoice}>
                Putar
              </button>
              <button
                className="btn-pause"
                onClick={togglePause}
                disabled={status === "idle" || !utteranceRef.current}
              >
                {status === "paused" ? "Lanjutkan" : "Jeda"}
              </button>
              <button className="btn-stop" onClick={stopSpeaking} disabled={status === "idle"}>
                Stop
              </button>
            </div>

            {history.length > 0 && (
              <div style={{ marginTop: "2.5rem" }}>
                <div className="section-title">Riwayat Teks</div>
                <div className="history-list">
                  {history.map((item) => (
                    <div key={item.id} className="history-item">
                      <span>{item.text}</span>
                      <button onClick={() => handleSpeak(item.text)}>Putar lagi</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}
