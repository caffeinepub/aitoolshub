import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  CheckCircle,
  Download,
  Loader2,
  Music,
  Pause,
  Play,
  Upload,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { useGetCredits, useUseTool } from "../../hooks/useQueries";

// ─── WAV encoder ────────────────────────────────────────────────────────────
function encodeWAV(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const numSamples = buffer.length * numChannels;
  const byteLength = 44 + numSamples * 2;
  const ab = new ArrayBuffer(byteLength);
  const view = new DataView(ab);

  function writeString(offset: number, str: string) {
    for (let i = 0; i < str.length; i++)
      view.setUint8(offset + i, str.charCodeAt(i));
  }
  function clamp(v: number) {
    return Math.max(-1, Math.min(1, v));
  }

  writeString(0, "RIFF");
  view.setUint32(4, byteLength - 8, true);
  writeString(8, "WAVE");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, numSamples * 2, true);

  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const s = clamp(buffer.getChannelData(ch)[i]);
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([ab], { type: "audio/wav" });
}

// ─── Voice presets ───────────────────────────────────────────────────────────
type VoicePreset = "normal" | "chipmunk" | "deep" | "robot" | "echo";

const VOICE_PRESETS: { id: VoicePreset; label: string }[] = [
  { id: "normal", label: "Normal" },
  { id: "chipmunk", label: "Chipmunk" },
  { id: "deep", label: "Deep" },
  { id: "robot", label: "Robot" },
  { id: "echo", label: "Echo" },
];

// ─── Apply effects offline ──────────────────────────────────────────────────
async function applyEffects(
  sourceBuffer: AudioBuffer,
  cutStart: number,
  cutEnd: number,
  fadeIn: number,
  fadeOut: number,
  voice: VoicePreset,
): Promise<AudioBuffer> {
  const startSample = Math.floor(cutStart * sourceBuffer.sampleRate);
  const endSample = Math.min(
    Math.floor(cutEnd * sourceBuffer.sampleRate),
    sourceBuffer.length,
  );
  const trimLength = Math.max(1, endSample - startSample);
  const duration = trimLength / sourceBuffer.sampleRate;

  const trimmedBuffer = new AudioBuffer({
    numberOfChannels: sourceBuffer.numberOfChannels,
    length: trimLength,
    sampleRate: sourceBuffer.sampleRate,
  });
  for (let ch = 0; ch < sourceBuffer.numberOfChannels; ch++) {
    trimmedBuffer.copyToChannel(
      sourceBuffer.getChannelData(ch).slice(startSample, endSample),
      ch,
    );
  }

  const extraDuration = voice === "echo" ? 1.0 : 0;
  const offlineCtx = new OfflineAudioContext(
    trimmedBuffer.numberOfChannels,
    Math.ceil((duration + extraDuration) * trimmedBuffer.sampleRate),
    trimmedBuffer.sampleRate,
  );

  const src = offlineCtx.createBufferSource();
  src.buffer = trimmedBuffer;

  if (voice === "chipmunk") src.detune.value = 600;
  else if (voice === "deep") src.detune.value = -500;

  // Fix: only set initial gain=0.0001 when fade-in is active to avoid
  // conflicting setValueAtTime calls at t=0 causing silent output.
  const gain = offlineCtx.createGain();
  if (fadeIn > 0) {
    gain.gain.setValueAtTime(0.0001, 0);
    gain.gain.exponentialRampToValueAtTime(1, Math.min(fadeIn, duration));
  } else {
    gain.gain.setValueAtTime(1, 0);
  }
  if (fadeOut > 0) {
    const fadeOutStart = Math.max(0, duration - fadeOut);
    gain.gain.setValueAtTime(1, fadeOutStart);
    gain.gain.exponentialRampToValueAtTime(0.0001, duration);
  }

  if (voice === "robot") {
    const osc = offlineCtx.createOscillator();
    osc.frequency.value = 50;
    osc.start(0);
    const ringGain = offlineCtx.createGain();
    osc.connect(ringGain.gain);
    src.connect(gain);
    gain.connect(ringGain);
    ringGain.connect(offlineCtx.destination);
    src.start(0);
    return offlineCtx.startRendering();
  }

  if (voice === "echo") {
    const delay = offlineCtx.createDelay(1.0);
    delay.delayTime.value = 0.35;
    const feedbackGain = offlineCtx.createGain();
    feedbackGain.gain.value = 0.45;
    src.connect(gain);
    gain.connect(delay);
    delay.connect(feedbackGain);
    feedbackGain.connect(delay);
    gain.connect(offlineCtx.destination);
    delay.connect(offlineCtx.destination);
    src.start(0);
    return offlineCtx.startRendering();
  }

  src.connect(gain);
  gain.connect(offlineCtx.destination);
  src.start(0);
  return offlineCtx.startRendering();
}

const WAVEFORM_BARS = Array.from({ length: 80 }, (_, i) => ({
  key: `bar-${i}`,
  height: `${20 + Math.sin(i * 0.7) * 18 + Math.sin(i * 1.3) * 12}%`,
}));

// ─── Component ───────────────────────────────────────────────────────────────
export function AudioEditor() {
  const navigate = useNavigate();
  const { setCredits } = useAuth();
  const { data: backendCredits, isLoading: creditsLoading } = useGetCredits();
  const useTool = useUseTool();

  const effectiveCredits = backendCredits !== undefined ? backendCredits : 0;

  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  // Processed result
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [processedFilename, setProcessedFilename] = useState<string>("");

  const [cutRange, setCutRange] = useState<[number, number]>([0, 100]);
  const [fadeIn, setFadeIn] = useState([0]);
  const [fadeOut, setFadeOut] = useState([0]);
  const [voice, setVoice] = useState<VoicePreset>("normal");

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      if (processedUrl) URL.revokeObjectURL(processedUrl);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [audioUrl, processedUrl]);

  const loadFile = useCallback(async (file: File) => {
    const url = URL.createObjectURL(file);
    setAudioFile(file);
    setAudioUrl(url);
    setIsPlaying(false);
    setCurrentTime(0);
    setCutRange([0, 100]);
    setProcessedUrl(null);
    const arrayBuf = await file.arrayBuffer();
    const actx = new AudioContext();
    const decoded = await actx.decodeAudioData(arrayBuf);
    setAudioBuffer(decoded);
    setDuration(decoded.duration);
    await actx.close();
  }, []);

  const handleFileChange = useCallback(
    async (file: File | null) => {
      if (!file) return;
      if (!file.type.startsWith("audio/")) {
        toast.error("Please upload an audio file.");
        return;
      }
      await loadFile(file);
    },
    [loadFile],
  );

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      await handleFileChange(e.dataTransfer.files[0]);
    },
    [handleFileChange],
  );

  const tickPlayback = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    setCurrentTime(el.currentTime);
    if (!el.paused) {
      animFrameRef.current = requestAnimationFrame(tickPlayback);
    } else {
      setIsPlaying(false);
    }
  }, []);

  const togglePlay = useCallback(() => {
    const el = audioRef.current;
    if (!el) return;
    if (isPlaying) {
      el.pause();
      setIsPlaying(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    } else {
      const startSec = (cutRange[0] / 100) * duration;
      if (
        el.currentTime < startSec ||
        el.currentTime > (cutRange[1] / 100) * duration
      ) {
        el.currentTime = startSec;
      }
      el.play();
      setIsPlaying(true);
      animFrameRef.current = requestAnimationFrame(tickPlayback);
    }
  }, [isPlaying, tickPlayback, cutRange, duration]);

  const cutStartSec = (cutRange[0] / 100) * duration;
  const cutEndSec = (cutRange[1] / 100) * duration;
  const playbackPct = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleProcess = useCallback(async () => {
    if (!audioBuffer || !audioFile) {
      toast.error("Please upload an audio file first.");
      return;
    }
    if (effectiveCredits < 1) {
      toast.error("Not enough credits. Please purchase more.");
      return;
    }
    setIsProcessing(true);
    setProcessedUrl(null);
    try {
      const result = await applyEffects(
        audioBuffer,
        cutStartSec,
        cutEndSec,
        fadeIn[0],
        fadeOut[0],
        voice,
      );
      const blob = encodeWAV(result);
      const url = URL.createObjectURL(blob);
      const filename = `edited_${audioFile.name.replace(/\.[^.]+$/, "")}.wav`;
      setProcessedUrl(url);
      setProcessedFilename(filename);
      await useTool.mutateAsync("audio-editor");
      setCredits(effectiveCredits - 1);
      toast.success("Audio processed! Click Download to save your file.");
    } catch (err) {
      console.error("Audio processing error:", err);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("decode") || msg.includes("format")) {
        toast.error("Audio format not supported. Try a different file.");
      } else {
        toast.error("Processing failed. Please try again.");
      }
    } finally {
      setIsProcessing(false);
    }
  }, [
    audioBuffer,
    audioFile,
    effectiveCredits,
    cutStartSec,
    cutEndSec,
    fadeIn,
    fadeOut,
    voice,
    useTool,
    setCredits,
  ]);

  const handleDownload = useCallback(() => {
    if (!processedUrl) return;
    const a = document.createElement("a");
    a.href = processedUrl;
    a.download = processedFilename;
    a.click();
  }, [processedUrl, processedFilename]);

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  function fmt(sec: number) {
    return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-10 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate({ to: "/dashboard" })}
            className="gap-2"
            data-ocid="audio.link"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Button>
          <div className="flex items-center gap-2">
            <Music className="w-5 h-5 text-primary" />
            <span className="font-semibold">Audio Editor</span>
          </div>
          <div
            className="text-sm text-muted-foreground"
            data-ocid="audio.panel"
          >
            {creditsLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <span>{effectiveCredits} credits</span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Upload zone */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl transition-colors ${
              isDragging
                ? "border-primary bg-primary/10"
                : "border-border/40 bg-muted/20"
            }`}
            data-ocid="audio.dropzone"
          >
            <button
              type="button"
              onClick={openFilePicker}
              className="w-full p-10 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-muted/20 rounded-xl transition-colors"
              data-ocid="audio.upload_button"
            >
              <Upload className="w-8 h-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center">
                {audioFile
                  ? audioFile.name
                  : "Drag & drop an audio file here, or click to browse"}
              </p>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
          </div>
        </motion.div>

        <AnimatePresence>
          {audioUrl && (
            <motion.div
              key="editor"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35 }}
              className="space-y-5"
            >
              {/* biome-ignore lint/a11y/useMediaCaption: audio editor — captions not applicable */}
              <audio
                ref={audioRef}
                src={audioUrl}
                onEnded={() => setIsPlaying(false)}
                className="hidden"
              />

              {/* Timeline */}
              <div className="bg-muted/40 border border-border/40 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold">Timeline</h3>
                <div className="relative h-14 bg-muted/60 rounded-lg overflow-hidden">
                  <div
                    className="absolute top-0 h-full bg-primary/20 border-x border-primary/60"
                    style={{
                      left: `${cutRange[0]}%`,
                      width: `${cutRange[1] - cutRange[0]}%`,
                    }}
                  />
                  <div className="absolute inset-0 flex items-center gap-[2px] px-1 pointer-events-none">
                    {WAVEFORM_BARS.map((bar) => (
                      <div
                        key={bar.key}
                        className="flex-1 rounded-full bg-primary/40"
                        style={{ height: bar.height }}
                      />
                    ))}
                  </div>
                  <div
                    className="absolute top-0 h-full w-0.5 bg-white/80 shadow-md"
                    style={{ left: `${playbackPct}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0:00</span>
                  <span>{fmt(duration)}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={togglePlay}
                    className="gap-2"
                    data-ocid="audio.button"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                    {isPlaying ? "Pause" : "Play"}
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {fmt(currentTime)} / {fmt(duration)}
                  </span>
                </div>
              </div>

              {/* Audio Cut */}
              <div className="bg-muted/40 border border-border/40 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold">✂️ Audio Cut</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">
                      Start
                    </Label>
                    <span className="text-xs font-mono text-muted-foreground">
                      {cutStartSec.toFixed(2)}s
                    </span>
                  </div>
                  <Slider
                    min={0}
                    max={cutRange[1] - 1}
                    step={0.5}
                    value={[cutRange[0]]}
                    onValueChange={([v]) => setCutRange([v, cutRange[1]])}
                    data-ocid="audio.toggle"
                  />
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-muted-foreground">End</Label>
                    <span className="text-xs font-mono text-muted-foreground">
                      {cutEndSec.toFixed(2)}s
                    </span>
                  </div>
                  <Slider
                    min={cutRange[0] + 1}
                    max={100}
                    step={0.5}
                    value={[cutRange[1]]}
                    onValueChange={([v]) => setCutRange([cutRange[0], v])}
                    data-ocid="audio.toggle"
                  />
                  <p className="text-xs text-muted-foreground">
                    Selected: {cutStartSec.toFixed(2)}s → {cutEndSec.toFixed(2)}
                    s &nbsp;({(cutEndSec - cutStartSec).toFixed(2)}s)
                  </p>
                </div>
              </div>

              {/* Fade In / Fade Out */}
              <div className="bg-muted/40 border border-border/40 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold">🎚️ Fade In / Fade Out</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">
                        Fade In
                      </Label>
                      <span className="text-xs font-mono text-muted-foreground">
                        {fadeIn[0].toFixed(1)}s
                      </span>
                    </div>
                    <Slider
                      min={0}
                      max={10}
                      step={0.1}
                      value={fadeIn}
                      onValueChange={setFadeIn}
                      data-ocid="audio.toggle"
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-muted-foreground">
                        Fade Out
                      </Label>
                      <span className="text-xs font-mono text-muted-foreground">
                        {fadeOut[0].toFixed(1)}s
                      </span>
                    </div>
                    <Slider
                      min={0}
                      max={10}
                      step={0.1}
                      value={fadeOut}
                      onValueChange={setFadeOut}
                      data-ocid="audio.toggle"
                    />
                  </div>
                </div>
              </div>

              {/* Voice Changer */}
              <div className="bg-muted/40 border border-border/40 rounded-xl p-5 space-y-4">
                <h3 className="text-sm font-semibold">🎤 Voice Changer</h3>
                <div className="flex flex-wrap gap-2">
                  {VOICE_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setVoice(preset.id)}
                      className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
                        voice === preset.id
                          ? "bg-primary text-white"
                          : "bg-muted/60 text-muted-foreground hover:bg-muted"
                      }`}
                      data-ocid="audio.toggle"
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  {voice === "chipmunk" && "Pitch shifted +6 semitones"}
                  {voice === "deep" && "Pitch shifted −5 semitones"}
                  {voice === "robot" && "Ring modulator effect at 50 Hz"}
                  {voice === "echo" && "Delay + feedback echo effect"}
                  {voice === "normal" && "No pitch or effect applied"}
                </p>
              </div>

              {/* Process + Download */}
              <div className="flex flex-col sm:flex-row items-center gap-3">
                <Button
                  className="gradient-btn border-0 text-white w-full sm:w-auto px-8"
                  onClick={handleProcess}
                  disabled={
                    isProcessing || creditsLoading || effectiveCredits < 1
                  }
                  data-ocid="audio.primary_button"
                >
                  {isProcessing || creditsLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {isProcessing ? "Processing…" : "Loading…"}
                    </>
                  ) : (
                    "Process Audio"
                  )}
                </Button>

                <AnimatePresence>
                  {processedUrl && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className="w-full sm:w-auto"
                    >
                      <Button
                        variant="outline"
                        className="w-full border-green-500/50 text-green-400 hover:bg-green-500/10 gap-2"
                        onClick={handleDownload}
                        data-ocid="audio.secondary_button"
                      >
                        <Download className="w-4 h-4" />
                        Download Edited Audio
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {!creditsLoading && effectiveCredits < 1 && (
                  <p
                    className="text-xs text-destructive"
                    data-ocid="audio.error_state"
                  >
                    Not enough credits.
                  </p>
                )}
              </div>

              {/* Success banner */}
              <AnimatePresence>
                {processedUrl && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3"
                    data-ocid="audio.success_state"
                  >
                    <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                    <p className="text-sm text-green-400">
                      Your audio is ready! Click{" "}
                      <strong>Download Edited Audio</strong> to save it.
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>

        {!audioFile && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-sm text-muted-foreground"
            data-ocid="audio.empty_state"
          >
            Upload an audio file to get started with editing.
          </motion.p>
        )}
      </main>

      <footer className="mt-16 py-6 border-t border-border/30 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()}. Built with ❤️ using{" "}
        <a
          href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
          className="underline hover:text-foreground"
          target="_blank"
          rel="noopener noreferrer"
        >
          caffeine.ai
        </a>
      </footer>
    </div>
  );
}
