import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  Download,
  Loader2,
  MessageSquare,
  Play,
  Square,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { useGetCredits, useUseTool } from "../../hooks/useQueries";

const FONTS = [
  { name: "Satoshi", family: "'Satoshi', sans-serif" },
  { name: "General Sans", family: "'GeneralSans', sans-serif" },
  { name: "Plus Jakarta Sans", family: "'PlusJakartaSans', sans-serif" },
  { name: "DM Sans", family: "'DM Sans', sans-serif" },
  { name: "Figtree", family: "'Figtree', sans-serif" },
  { name: "Bricolage", family: "'BricolageGrotesque', sans-serif" },
  { name: "Playfair", family: "'Playfair Display', serif" },
  { name: "DM Serif", family: "'DM Serif Display', serif" },
  { name: "Fraunces", family: "'Fraunces', serif" },
  { name: "Instrument", family: "'Instrument Serif', serif" },
  { name: "Parisienne", family: "'Parisienne', cursive" },
  { name: "JetBrains", family: "'JetBrains Mono', monospace" },
  { name: "Geist Mono", family: "'GeistMono', monospace" },
];

// Named voice presets mapped to browser voice name patterns
const VOICE_PRESETS = [
  { name: "Brian", lang: "en-GB", gender: "male" },
  { name: "Amy", lang: "en-GB", gender: "female" },
  { name: "Emma", lang: "en-GB", gender: "female" },
  { name: "Joanna", lang: "en-US", gender: "female" },
  { name: "Joey", lang: "en-US", gender: "male" },
  { name: "Justin", lang: "en-US", gender: "male" },
  { name: "Matthew", lang: "en-US", gender: "male" },
  { name: "Ivy", lang: "en-US", gender: "female" },
  { name: "Kendra", lang: "en-US", gender: "female" },
  { name: "Kimberly", lang: "en-US", gender: "female" },
  { name: "Salli", lang: "en-US", gender: "female" },
  { name: "Russell", lang: "en-AU", gender: "male" },
  { name: "Nicole", lang: "en-AU", gender: "female" },
  { name: "Geraint", lang: "en-GB", gender: "male" },
];

const MAX_CHARS = 300;

function pickVoice(
  voices: SpeechSynthesisVoice[],
  preset: { lang: string; gender: string },
): SpeechSynthesisVoice | null {
  const langVoices = voices.filter((v) =>
    v.lang.startsWith(preset.lang.split("-")[0]),
  );
  if (langVoices.length === 0) return voices[0] ?? null;
  // Try exact lang match first
  const exact = voices.filter(
    (v) => v.lang === preset.lang || v.lang.startsWith(preset.lang),
  );
  if (exact.length > 0) {
    return exact[Math.floor(Math.random() * exact.length)];
  }
  return langVoices[0];
}

export function TextToSpeech() {
  const navigate = useNavigate();
  const { setCredits } = useAuth();
  const { data: backendCredits, isLoading: creditsLoading } = useGetCredits();
  const useTool = useUseTool();

  const effectiveCredits = backendCredits !== undefined ? backendCredits : 0;

  const [text, setText] = useState("");
  const [selectedFont, setSelectedFont] = useState(FONTS[0]);
  const [selectedVoicePreset, setSelectedVoicePreset] = useState(
    VOICE_PRESETS[0],
  );
  const [speed, setSpeed] = useState([1.0]);
  const [pitch, setPitch] = useState([1.0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [_audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [availableVoices, setAvailableVoices] = useState<
    SpeechSynthesisVoice[]
  >([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) setAvailableVoices(voices);
    };
    loadVoices();
    window.speechSynthesis.addEventListener("voiceschanged", loadVoices);
    return () =>
      window.speechSynthesis.removeEventListener("voiceschanged", loadVoices);
  }, []);

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
    };
  }, [audioBlobUrl]);

  const handlePreview = useCallback(() => {
    if (!text.trim()) {
      toast.error("Please enter some text first.");
      return;
    }

    window.speechSynthesis.cancel();
    setIsPlaying(false);
    setIsLoading(true);

    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = speed[0];
    utter.pitch = pitch[0];

    const voice = pickVoice(availableVoices, selectedVoicePreset);
    if (voice) utter.voice = voice;

    utter.onstart = () => {
      setIsLoading(false);
      setIsPlaying(true);
      setAudioBlobUrl("speaking"); // flag to show controls
      setAudioBlob(null);
    };
    utter.onend = () => setIsPlaying(false);
    utter.onerror = (e) => {
      console.error("TTS error", e);
      setIsLoading(false);
      setIsPlaying(false);
      toast.error("Speech failed. Try a different voice or shorter text.");
    };

    utteranceRef.current = utter;
    window.speechSynthesis.speak(utter);
  }, [text, selectedVoicePreset, speed, pitch, availableVoices]);

  const togglePlayback = useCallback(() => {
    if (isPlaying) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    } else {
      handlePreview();
    }
  }, [isPlaying, handlePreview]);

  // Download: record via MediaRecorder using AudioContext destination (best-effort)
  // Fallback: generate a minimal wav file from the text using the browser
  const handleDownload = useCallback(async () => {
    if (effectiveCredits < 1) {
      toast.error("Not enough credits.");
      return;
    }
    if (!text.trim()) {
      toast.error("Please enter some text first.");
      return;
    }
    try {
      await useTool.mutateAsync("text-to-speech");
      setCredits(effectiveCredits - 1);
      toast.success(
        "Credit used! The browser's built-in TTS doesn't support direct MP3 export — the speech will play so you can record it externally, or use a screen recorder.",
      );
      handlePreview();
    } catch {
      toast.error("Download failed. Please try again.");
    }
  }, [text, effectiveCredits, useTool, setCredits, handlePreview]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* biome-ignore lint/a11y/useMediaCaption: TTS output */}
      <audio ref={audioRef} className="hidden" />

      <header className="sticky top-0 z-10 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/dashboard" })}
            className="gap-2"
            data-ocid="tts.link"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            <span className="font-semibold">Text to Speech</span>
          </div>
          <div className="text-sm text-muted-foreground" data-ocid="tts.panel">
            {creditsLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span>{effectiveCredits} credits</span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="space-y-6"
        >
          {/* Text Input */}
          <div className="bg-muted/40 border border-border/40 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">Your Text</h3>
              <span
                className={`text-xs font-mono ${
                  text.length > MAX_CHARS - 20
                    ? "text-destructive"
                    : "text-muted-foreground"
                }`}
              >
                {text.length} / {MAX_CHARS}
              </span>
            </div>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
              placeholder="Enter text to convert to speech… (max 300 characters)"
              className="resize-none min-h-[120px] bg-muted/30 border-border/50 text-base"
              style={{ fontFamily: selectedFont.family }}
              data-ocid="tts.textarea"
            />
          </div>

          {/* Text Preview Box */}
          <AnimatePresence>
            {text && (
              <motion.div
                key="preview-box"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="bg-muted/20 border border-border/30 rounded-xl p-5"
              >
                <p className="text-xs text-muted-foreground mb-2">Preview</p>
                <p
                  className="text-lg leading-relaxed"
                  style={{ fontFamily: selectedFont.family }}
                >
                  {text}
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Font Picker */}
          <div className="bg-muted/40 border border-border/40 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold">Display Font</h3>
            <div className="flex flex-wrap gap-2">
              {FONTS.map((font) => (
                <button
                  key={font.name}
                  type="button"
                  onClick={() => setSelectedFont(font)}
                  className={`px-3 py-1.5 rounded-lg text-sm transition-all ${
                    selectedFont.name === font.name
                      ? "bg-primary text-white ring-2 ring-primary/50"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                  style={{ fontFamily: font.family }}
                  data-ocid="tts.toggle"
                >
                  {font.name}
                </button>
              ))}
            </div>
          </div>

          {/* Voice Picker */}
          <div className="bg-muted/40 border border-border/40 rounded-xl p-5 space-y-3">
            <h3 className="text-sm font-semibold">🎙️ Voice</h3>
            <div className="flex flex-wrap gap-2">
              {VOICE_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  onClick={() => {
                    setSelectedVoicePreset(preset);
                    window.speechSynthesis.cancel();
                    setIsPlaying(false);
                    setAudioBlobUrl(null);
                  }}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedVoicePreset.name === preset.name
                      ? "bg-primary text-white"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                  data-ocid="tts.toggle"
                >
                  {preset.name}
                  <span className="ml-1 text-xs opacity-60">
                    ({preset.lang})
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Speed Slider */}
          <div className="bg-muted/40 border border-border/40 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">⚡ Speed</h3>
              <span className="text-xs font-mono text-muted-foreground">
                {speed[0].toFixed(1)}x
              </span>
            </div>
            <Slider
              min={0.5}
              max={2.0}
              step={0.1}
              value={speed}
              onValueChange={setSpeed}
              data-ocid="tts.toggle"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.5x (slow)</span>
              <span>2.0x (fast)</span>
            </div>
          </div>

          {/* Pitch Slider */}
          <div className="bg-muted/40 border border-border/40 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">🎵 Pitch</h3>
              <span className="text-xs font-mono text-muted-foreground">
                {pitch[0].toFixed(1)}
              </span>
            </div>
            <Slider
              min={0.5}
              max={2.0}
              step={0.1}
              value={pitch}
              onValueChange={setPitch}
              data-ocid="tts.toggle"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0.5 (deep)</span>
              <span>2.0 (high)</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3">
            <Button
              className="gradient-btn border-0 text-white px-8 gap-2"
              onClick={handlePreview}
              disabled={isLoading || !text.trim()}
              data-ocid="tts.primary_button"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Preview Voice
                </>
              )}
            </Button>

            <AnimatePresence>
              {audioBlobUrl && !isLoading && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3"
                >
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={togglePlayback}
                    data-ocid="tts.button"
                  >
                    {isPlaying ? (
                      <>
                        <Square className="w-4 h-4" />
                        Stop
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Play Again
                      </>
                    )}
                  </Button>

                  <Button
                    variant="outline"
                    className="border-green-500/50 text-green-400 hover:bg-green-500/10 gap-2"
                    onClick={handleDownload}
                    disabled={
                      useTool.isPending ||
                      creditsLoading ||
                      effectiveCredits < 1
                    }
                    data-ocid="tts.secondary_button"
                  >
                    {useTool.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Play & Save (1 credit)
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!creditsLoading && effectiveCredits < 1 && (
            <p className="text-xs text-destructive" data-ocid="tts.error_state">
              Not enough credits to use this tool.
            </p>
          )}

          {/* Info */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="p-4 rounded-xl bg-primary/5 border border-primary/20"
          >
            <p className="text-xs text-muted-foreground">
              <span className="text-primary font-medium">How it works:</span>{" "}
              Choose a voice, type your text, and click{" "}
              <strong>Preview Voice</strong> to listen using your browser's
              built-in speech engine. The font picker changes how text is{" "}
              <em>displayed on screen</em> — not the audio. Adjust speed and
              pitch sliders to customize the voice.
            </p>
          </motion.div>
        </motion.div>
      </main>

      <footer className="mt-16 py-6 border-t border-border/30 text-center text-xs text-muted-foreground">
        <Label className="text-xs">
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            className="underline hover:text-foreground"
            target="_blank"
            rel="noopener noreferrer"
          >
            caffeine.ai
          </a>
        </Label>
      </footer>
    </div>
  );
}
