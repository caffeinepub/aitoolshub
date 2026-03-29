import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeft,
  Brush,
  Download,
  Eraser,
  Loader2,
  RotateCcw,
  Scissors,
  Upload,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { useGetCredits, useUseTool } from "../../hooks/useQueries";

type Tool = "brush" | "eraser";

export function BackgroundRemover() {
  const navigate = useNavigate();
  const { setCredits } = useAuth();
  const { data: fetchedCredits, isLoading: creditsLoading } = useGetCredits();
  const useTool = useUseTool();

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [activeTool, setActiveTool] = useState<Tool>("brush");
  const [brushSize, setBrushSize] = useState(25);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [resultDataUrl, setResultDataUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [hasMask, setHasMask] = useState(false);

  const canvasWidth = 600;
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const effectiveCredits: number | null =
    fetchedCredits !== undefined ? fetchedCredits : creditsLoading ? null : 0;

  useEffect(() => {
    if (fetchedCredits !== undefined) {
      setCredits(fetchedCredits);
    }
  }, [fetchedCredits, setCredits]);

  const loadImage = useCallback((file: File) => {
    setFileName(file.name);
    setHasResult(false);
    setResultDataUrl(null);
    setHasMask(false);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      setImage(img);
    };
    img.src = url;
  }, []);

  // Draw image to canvas when loaded
  useEffect(() => {
    if (!image || !imageCanvasRef.current || !maskCanvasRef.current) return;
    const aspect = image.height / image.width;
    const w = Math.min(canvasWidth, image.width);
    const h = Math.round(w * aspect);
    imageCanvasRef.current.width = w;
    imageCanvasRef.current.height = h;
    maskCanvasRef.current.width = w;
    maskCanvasRef.current.height = h;
    const ctx = imageCanvasRef.current.getContext("2d")!;
    ctx.drawImage(image, 0, 0, w, h);
    // Clear mask
    const mCtx = maskCanvasRef.current.getContext("2d")!;
    mCtx.clearRect(0, 0, w, h);
  }, [image]);

  const getPos = (
    e:
      | React.MouseEvent<HTMLCanvasElement>
      | React.TouchEvent<HTMLCanvasElement>,
  ) => {
    const canvas = maskCanvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let clientX: number;
    let clientY: number;
    if ("touches" in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const paint = (x: number, y: number) => {
    if (!maskCanvasRef.current) return;
    const ctx = maskCanvasRef.current.getContext("2d")!;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = brushSize;
    if (activeTool === "brush") {
      ctx.globalCompositeOperation = "source-over";
      ctx.strokeStyle = "rgba(239, 68, 68, 0.6)";
    } else {
      ctx.globalCompositeOperation = "destination-out";
      ctx.strokeStyle = "rgba(0,0,0,1)";
    }
    if (lastPos.current) {
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fillStyle =
        activeTool === "brush" ? "rgba(239, 68, 68, 0.6)" : "rgba(0,0,0,1)";
      if (activeTool === "eraser")
        ctx.globalCompositeOperation = "destination-out";
      ctx.fill();
    }
    lastPos.current = { x, y };
    setHasMask(true);
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    lastPos.current = null;
    const pos = getPos(e);
    paint(pos.x, pos.y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const pos = getPos(e);
    paint(pos.x, pos.y);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    lastPos.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    setIsDrawing(true);
    lastPos.current = null;
    const pos = getPos(e);
    paint(pos.x, pos.y);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing) return;
    const pos = getPos(e);
    paint(pos.x, pos.y);
  };

  const handleRemove = async () => {
    if (!image || !imageCanvasRef.current || !maskCanvasRef.current) return;
    if (effectiveCredits === null) {
      toast.error("Still loading credits. Please wait.");
      return;
    }
    if (effectiveCredits <= 0) {
      toast.error("Not enough credits. Please upgrade your plan.");
      return;
    }
    setProcessing(true);
    try {
      await useTool.mutateAsync("background-remover");
      const w = imageCanvasRef.current.width;
      const h = imageCanvasRef.current.height;
      // Create offscreen result canvas
      const offscreen = document.createElement("canvas");
      offscreen.width = w;
      offscreen.height = h;
      const ctx = offscreen.getContext("2d")!;
      ctx.drawImage(imageCanvasRef.current, 0, 0);
      // Get mask data
      const maskCtx = maskCanvasRef.current.getContext("2d")!;
      const maskData = maskCtx.getImageData(0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      for (let i = 0; i < maskData.data.length; i += 4) {
        if (maskData.data[i + 3] > 10) {
          imgData.data[i + 3] = 0; // make transparent
        }
      }
      ctx.putImageData(imgData, 0, 0);
      const dataUrl = offscreen.toDataURL("image/png");
      setResultDataUrl(dataUrl);
      setHasResult(true);
      const newCredits = effectiveCredits - 1;
      setCredits(newCredits);
      toast.success("Area removed!", {
        description: `${newCredits} credit${newCredits !== 1 ? "s" : ""} remaining`,
      });
    } catch {
      toast.error("Processing failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!resultDataUrl) return;
    const a = document.createElement("a");
    a.href = resultDataUrl;
    a.download = `removed-${fileName || "image"}.png`;
    a.click();
  };

  const handleReset = () => {
    if (!imageCanvasRef.current || !maskCanvasRef.current) return;
    const mCtx = maskCanvasRef.current.getContext("2d")!;
    mCtx.clearRect(
      0,
      0,
      maskCanvasRef.current.width,
      maskCanvasRef.current.height,
    );
    setHasResult(false);
    setResultDataUrl(null);
    setHasMask(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) loadImage(f);
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
              style={{
                background:
                  "linear-gradient(135deg, oklch(0.55 0.22 262), oklch(0.50 0.25 290))",
              }}
            >
              <Scissors className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Background Remover</h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                Paint over the area you want to remove, then click Remove
                Selected Area.
              </p>
            </div>
          </div>

          {/* Upload / Canvas area */}
          {!image ? (
            <div
              className="border-2 border-dashed border-border/50 hover:border-border rounded-2xl transition-all duration-200"
              data-ocid="tool.dropzone"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) loadImage(f);
              }}
            >
              <button
                type="button"
                className="w-full flex flex-col items-center justify-center gap-4 py-16 cursor-pointer"
                onClick={() => inputRef.current?.click()}
                data-ocid="tool.upload_button"
              >
                <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-border flex items-center justify-center">
                  <Upload className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium">
                    Drop your image here or{" "}
                    <span className="text-primary">browse</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports PNG, JPG, WEBP
                  </p>
                </div>
              </button>
            </div>
          ) : (
            <div>
              {/* Toolbar */}
              <div className="flex flex-wrap items-center gap-3 mb-4 p-3 rounded-xl bg-muted/40 border border-border/40">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={activeTool === "brush" ? "default" : "outline"}
                    className={
                      activeTool === "brush"
                        ? "gradient-btn border-0 text-white"
                        : ""
                    }
                    onClick={() => setActiveTool("brush")}
                    data-ocid="tool.toggle"
                  >
                    <Brush className="w-4 h-4 mr-1.5" /> Brush
                  </Button>
                  <Button
                    size="sm"
                    variant={activeTool === "eraser" ? "default" : "outline"}
                    className={
                      activeTool === "eraser"
                        ? "gradient-btn border-0 text-white"
                        : ""
                    }
                    onClick={() => setActiveTool("eraser")}
                    data-ocid="tool.toggle"
                  >
                    <Eraser className="w-4 h-4 mr-1.5" /> Eraser
                  </Button>
                </div>

                <div className="flex items-center gap-3 flex-1 min-w-[140px]">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    Size: {brushSize}px
                  </span>
                  <Slider
                    min={5}
                    max={80}
                    step={5}
                    value={[brushSize]}
                    onValueChange={(v) => setBrushSize(v[0])}
                    className="flex-1"
                    data-ocid="tool.toggle"
                  />
                </div>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleReset}
                  className="text-muted-foreground hover:text-foreground ml-auto"
                  data-ocid="tool.secondary_button"
                >
                  <RotateCcw className="w-4 h-4 mr-1.5" /> Reset
                </Button>
              </div>

              {/* Canvas area */}
              {!hasResult ? (
                <div className="relative rounded-xl overflow-hidden border border-border/50 bg-[repeating-conic-gradient(#2a2a3e_0%_25%,#1a1a2e_0%_50%)] bg-[length:20px_20px]">
                  <canvas ref={imageCanvasRef} className="block w-full" />
                  <canvas
                    ref={maskCanvasRef}
                    className="absolute inset-0 w-full h-full"
                    style={{
                      cursor: activeTool === "brush" ? "crosshair" : "cell",
                      touchAction: "none",
                    }}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    onTouchStart={handleTouchStart}
                    onTouchMove={handleTouchMove}
                    onTouchEnd={handleMouseUp}
                    data-ocid="tool.canvas_target"
                  />
                </div>
              ) : (
                <div className="rounded-xl overflow-hidden border border-green-500/30 bg-[repeating-conic-gradient(#2a2a3e_0%_25%,#1a1a2e_0%_50%)] bg-[length:20px_20px]">
                  {resultDataUrl && (
                    <img
                      src={resultDataUrl}
                      alt="Result"
                      className="block w-full"
                    />
                  )}
                </div>
              )}

              <p className="text-xs text-muted-foreground mt-2 text-center">
                {hasResult
                  ? "✅ Area removed. Download below or reset to try again."
                  : 'Paint over the area to remove, then click "Remove Selected Area"'}
              </p>
            </div>
          )}

          {/* Actions */}
          {image && (
            <div className="mt-5 flex flex-col sm:flex-row gap-3">
              {!hasResult ? (
                <Button
                  className="flex-1 gradient-btn border-0 text-white"
                  disabled={
                    !hasMask ||
                    processing ||
                    effectiveCredits === null ||
                    effectiveCredits <= 0
                  }
                  onClick={handleRemove}
                  data-ocid="tool.primary_button"
                >
                  {processing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />{" "}
                      Removing...
                    </>
                  ) : (
                    <>
                      <Scissors className="w-4 h-4 mr-2" /> Remove Selected Area
                    </>
                  )}
                </Button>
              ) : (
                <>
                  <Button
                    className="flex-1 border-green-500/50 text-green-400 hover:bg-green-500/10"
                    variant="outline"
                    onClick={handleDownload}
                    data-ocid="tool.primary_button"
                  >
                    <Download className="w-4 h-4 mr-2" /> Download PNG
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleReset}
                    data-ocid="tool.secondary_button"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" /> Try Again
                  </Button>
                </>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setImage(null);
                  setFileName("");
                  setHasResult(false);
                  setResultDataUrl(null);
                  setHasMask(false);
                }}
                data-ocid="tool.secondary_button"
              >
                Change Image
              </Button>
            </div>
          )}

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
                  Removing selected area...
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

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
