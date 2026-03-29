import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle,
  Download,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { useActor } from "../hooks/useActor";
import { useGetCredits, useUseTool } from "../hooks/useQueries";

interface ToolPageProps {
  toolName: string;
  title: string;
  description: string;
  acceptedTypes: string;
  icon: ReactNode;
  accentColor: string;
  extraControls?: ReactNode;
  processLabel?: string;
}

export function ToolPage({
  toolName,
  title,
  description,
  acceptedTypes,
  icon,
  accentColor,
  extraControls,
  processLabel = "Process",
}: ToolPageProps) {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [done, setDone] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const useTool = useUseTool();
  const { credits, setCredits } = useAuth();
  const { isFetching: actorFetching } = useActor();
  const { data: fetchedCredits, isLoading: creditsLoading } = useGetCredits();
  const navigate = useNavigate();

  useEffect(() => {
    if (fetchedCredits !== undefined) {
      setCredits(fetchedCredits);
    }
  }, [fetchedCredits, setCredits]);

  const effectiveCredits: number | null =
    fetchedCredits !== undefined
      ? fetchedCredits
      : actorFetching || creditsLoading
        ? null
        : credits;

  const handleFile = useCallback((f: File) => {
    setFile(f);
    setDone(false);
    const url = URL.createObjectURL(f);
    setPreview(url);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const handleProcess = async () => {
    if (!file) return;
    if (effectiveCredits === null) {
      toast.error("Still loading your credits. Please wait a moment.");
      return;
    }
    if (effectiveCredits <= 0) {
      toast.error("Not enough credits. Please upgrade your plan.");
      return;
    }
    setProcessing(true);
    try {
      await useTool.mutateAsync(toolName);
      await new Promise((r) => setTimeout(r, 2000));
      setDone(true);
      const newCredits = effectiveCredits - 1;
      setCredits(newCredits);
      toast.success("1 credit deducted", {
        description: `${newCredits} credit${newCredits !== 1 ? "s" : ""} remaining`,
      });
      if (newCredits <= 1) {
        toast.warning("Low credits!", {
          description: "You're running low. Consider upgrading your plan.",
        });
      }
    } catch {
      toast.error("Processing failed", { description: "Please try again." });
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!file) return;
    const a = document.createElement("a");
    a.href = preview ?? "";
    a.download = `processed-${file.name}`;
    a.click();
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setDone(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="min-h-screen pt-20">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          {/* Back button */}
          <div className="mb-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground -ml-2 gap-1.5"
              onClick={() => navigate({ to: "/dashboard" })}
              data-ocid="tool.secondary_button"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
          </div>

          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center text-white"
              style={{ background: accentColor }}
            >
              {icon}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{title}</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {description}
              </p>
            </div>
          </div>

          {/* Dropzone */}
          <div
            className={`relative border-2 border-dashed rounded-2xl transition-all duration-200 ${
              isDragging
                ? "border-primary/70 bg-primary/5"
                : file
                  ? "border-border"
                  : "border-border/50 hover:border-border"
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            data-ocid="tool.dropzone"
          >
            {file ? (
              <div className="relative p-4">
                <button
                  type="button"
                  onClick={clearFile}
                  className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-card/80 backdrop-blur flex items-center justify-center hover:bg-muted transition-colors"
                  data-ocid="tool.close_button"
                >
                  <X className="w-4 h-4" />
                </button>
                {acceptedTypes.includes("image") && preview && (
                  <img
                    src={preview}
                    alt="Preview"
                    className="w-full max-h-64 object-contain rounded-lg"
                  />
                )}
                {acceptedTypes.includes("audio") && (
                  <div className="py-8 flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                      <span className="text-2xl">🎵</span>
                    </div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <button
                type="button"
                className="w-full flex flex-col items-center justify-center gap-4 py-16 cursor-pointer"
                onClick={() => inputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") inputRef.current?.click();
                }}
                data-ocid="tool.upload_button"
              >
                <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-border flex items-center justify-center">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">
                    Drop your file here or{" "}
                    <span className="text-primary">browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports {acceptedTypes.replace("/*", "")} files
                  </p>
                </div>
              </button>
            )}
            <input
              ref={inputRef}
              type="file"
              accept={acceptedTypes}
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>

          {/* Extra controls */}
          {extraControls && file && <div className="mt-4">{extraControls}</div>}

          {/* Actions */}
          <div className="mt-6 flex flex-col sm:flex-row gap-3">
            <Button
              className="flex-1 gradient-btn border-0 text-white"
              disabled={!file || processing || effectiveCredits === null}
              onClick={handleProcess}
              data-ocid="tool.primary_button"
            >
              {processing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                  Processing...
                </>
              ) : (
                processLabel
              )}
            </Button>
            <AnimatePresence>
              {done && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex-1"
                >
                  <Button
                    variant="outline"
                    className="w-full border-green-500/50 text-green-400 hover:bg-green-500/10"
                    onClick={handleDownload}
                    data-ocid="tool.secondary_button"
                  >
                    <Download className="w-4 h-4 mr-2" /> Download Result
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Status */}
          <AnimatePresence>
            {processing && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 p-4 rounded-xl bg-primary/10 border border-primary/20 flex items-center gap-3"
                data-ocid="tool.loading_state"
              >
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">
                  AI is processing your file...
                </p>
              </motion.div>
            )}
            {done && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 p-4 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center gap-3"
                data-ocid="tool.success_state"
              >
                <CheckCircle className="w-5 h-5 text-green-400" />
                <p className="text-sm text-green-400">
                  Processing complete! Your file is ready to download.
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Credit info */}
          <div className="mt-6 p-4 rounded-xl bg-muted/50 border border-border/40 flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              This tool costs{" "}
              <strong className="text-foreground">1 credit</strong> per use. You
              currently have{" "}
              {effectiveCredits === null ? (
                <strong className="text-primary inline-flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin" /> loading...
                </strong>
              ) : (
                <strong className="text-primary">
                  {effectiveCredits} credit{effectiveCredits !== 1 ? "s" : ""}
                </strong>
              )}
              .
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
