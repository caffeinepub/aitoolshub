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

const VOICES = [
  "Brian",
  "Amy",
  "Emma",
  "Geraint",
  "Russell",
  "Nicole",
  "Joey",
  "Justin",
  "Matthew",
  "Ivy",
  "Kendra",
  "Kimberly",
  "Salli",
  "Joanna",
];

const MAX_CHARS = 300;

export function TextToSpeech() {
  const navigate = useNavigate();
  const { setCredits } = useAuth();
  const { data: backendCredits, isLoading: creditsLoading } = useGetCredits();
  const useTool = useUseTool();

  const effectiveCredits = backendCredits !== undefined ? backendCredits : 0;

  const [text, setText] = useState("");
  const [selectedFont, setSelectedFont] = useState(FONTS[0]);
  const [selectedVoice, setSelectedVoice] = useState("Brian");
  const [speed, setSpeed] = useState([1.0]);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioBlobUrl, setAudioBlobUrl] = useState<string | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioBlobUrl) URL.revokeObjectURL(audioBlobUrl);
    };
  }, [audioBlobUrl]);

  // Sync playback rate when speed changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = speed[0];
    }
  }, [speed]);

  const handlePreview = useCallback(async () => {
    if (!text.trim()) {
      toast.error("Please enter some text first.");
      return;
    }
    setIsLoading(true);
    setAudioBlobUrl(null);
    setAudioBlob(null);
    setIsPlaying(false);

    try {
      const url = `https://api.streamelements.com/kappa/v2/speech?voice=${selectedVoice}&text=${encodeURIComponent(text)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("TTS fetch failed");
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      setAudioBlobUrl(blobUrl);
      setAudioBlob(blob);

      // Auto-play
      const audio = audioRef.current;
      if (audio) {
        audio.src = blobUrl;
        audio.playbackRate = speed[0];
        await audio.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error(err);
      toast.error("Preview failed. Try again or choose a different voice.");
    } finally {
      setIsLoading(false);
    }
  }, [text, selectedVoice, speed]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || !audioBlobUrl) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play();
      setIsPlaying(true);
    }
  }, [isPlaying, audioBlobUrl]);

  const handleDownload = useCallback(async () => {
    if (!audioBlob || !audioBlobUrl) return;
    if (effectiveCredits < 1) {
      toast.error("Not enough credits.");
      return;
    }
    try {
      await useTool.mutateAsync("text-to-speech");
      setCredits(effectiveCredits - 1);
      const a = document.createElement("a");
      a.href = audioBlobUrl;
      a.download = "speech.mp3";
      a.click();
      toast.success("Downloaded speech.mp3!");
    } catch {
      toast.error("Download failed. Please try again.");
    }
  }, [audioBlob, audioBlobUrl, effectiveCredits, useTool, setCredits]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* biome-ignore lint/a11y/useMediaCaption: TTS output */}
      <audio
        ref={audioRef}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />

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
              {VOICES.map((voice) => (
                <button
                  key={voice}
                  type="button"
                  onClick={() => {
                    setSelectedVoice(voice);
                    setAudioBlobUrl(null);
                    setAudioBlob(null);
                    setIsPlaying(false);
                  }}
                  className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    selectedVoice === voice
                      ? "bg-primary text-white"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted"
                  }`}
                  data-ocid="tts.toggle"
                >
                  {voice}
                </button>
              ))}
            </div>
          </div>

          {/* Speed Slider */}
          <div className="bg-muted/40 border border-border/40 rounded-xl p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">⚡ Playback Speed</h3>
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
                    Download MP3 (1 credit)
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {!creditsLoading && effectiveCredits < 1 && (
            <p className="text-xs text-destructive" data-ocid="tts.error_state">
              Not enough credits to download.
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
              Choose a voice, type your text, and click Preview Voice to listen.
              The font picker changes how text is <em>displayed on screen</em> —
              not the audio. Download MP3 costs 1 credit.
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
