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
  Wand2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../../context/AuthContext";
import { useGetCredits, useUseTool } from "../../hooks/useQueries";

type Tool = "brush" | "eraser" | "wand";

type ColorPreset = "green" | "black" | "white" | "custom";

const COLOR_PRESETS: {
  id: ColorPreset;
  label: string;
  color: [number, number, number];
  bg: string;
  border: string;
}[] = [
  {
    id: "green",
    label: "Green Screen",
    color: [0, 177, 64],
    bg: "bg-green-600/20",
    border: "border-green-500/50",
  },
  {
    id: "black",
    label: "Black Screen",
    color: [0, 0, 0],
    bg: "bg-gray-900/60",
    border: "border-gray-600/50",
  },
  {
    id: "white",
    label: "White BG",
    color: [255, 255, 255],
    bg: "bg-white/10",
    border: "border-white/30",
  },
  {
    id: "custom",
    label: "Custom Color",
    color: [255, 0, 128],
    bg: "bg-pink-600/20",
    border: "border-pink-500/50",
  },
];

function colorDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
): number {
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [
        Number.parseInt(result[1], 16),
        Number.parseInt(result[2], 16),
        Number.parseInt(result[3], 16),
      ]
    : [255, 0, 128];
}

export function BackgroundRemover() {
  const navigate = useNavigate();
  const { setCredits } = useAuth();
  const { data: fetchedCredits, isLoading: creditsLoading } = useGetCredits();
  const useTool = useUseTool();

  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [fileName, setFileName] = useState("");
  const [activeTool, setActiveTool] = useState<Tool>("brush");
  const [brushSize, setBrushSize] = useState(25);
  const [wandTolerance, setWandTolerance] = useState(40);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasResult, setHasResult] = useState(false);
  const [resultDataUrl, setResultDataUrl] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [hasMask, setHasMask] = useState(false);

  // Color remove state
  const [colorTolerance, setColorTolerance] = useState(60);
  const [customColor, setCustomColor] = useState("#ff0080");
  const [applyingColor, setApplyingColor] = useState(false);

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

  // Magic Wand flood fill
  const doFloodFill = (startX: number, startY: number) => {
    if (!imageCanvasRef.current || !maskCanvasRef.current) return;
    const iCtx = imageCanvasRef.current.getContext("2d")!;
    const w = imageCanvasRef.current.width;
    const h = imageCanvasRef.current.height;
    const imageData = iCtx.getImageData(0, 0, w, h);
    const mCtx = maskCanvasRef.current.getContext("2d")!;
    const maskImageData = mCtx.getImageData(0, 0, w, h);

    const sx = Math.round(startX);
    const sy = Math.round(startY);
    if (sx < 0 || sx >= w || sy < 0 || sy >= h) return;

    const idx = (sy * w + sx) * 4;
    const targetR = imageData.data[idx];
    const targetG = imageData.data[idx + 1];
    const targetB = imageData.data[idx + 2];

    const visited = new Uint8Array(w * h);
    const stack: number[] = [sy * w + sx];
    visited[sy * w + sx] = 1;

    const maxDist = (wandTolerance / 100) * 441.67; // 441.67 = sqrt(3 * 255^2)

    while (stack.length > 0) {
      const pos = stack.pop()!;
      const px = pos % w;
      const py = Math.floor(pos / w);
      const pi = pos * 4;

      const r = imageData.data[pi];
      const g = imageData.data[pi + 1];
      const b = imageData.data[pi + 2];

      if (colorDistance(r, g, b, targetR, targetG, targetB) <= maxDist) {
        maskImageData.data[pi] = 239;
        maskImageData.data[pi + 1] = 68;
        maskImageData.data[pi + 2] = 68;
        maskImageData.data[pi + 3] = 153;

        const neighbors = [
          { x: px - 1, y: py },
          { x: px + 1, y: py },
          { x: px, y: py - 1 },
          { x: px, y: py + 1 },
        ];
        for (const n of neighbors) {
          if (n.x >= 0 && n.x < w && n.y >= 0 && n.y < h) {
            const npos = n.y * w + n.x;
            if (!visited[npos]) {
              visited[npos] = 1;
              stack.push(npos);
            }
          }
        }
      }
    }

    mCtx.putImageData(maskImageData, 0, 0);
    setHasMask(true);
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
    if (activeTool === "wand") {
      const pos = getPos(e);
      doFloodFill(pos.x, pos.y);
      return;
    }
    setIsDrawing(true);
    lastPos.current = null;
    const pos = getPos(e);
    paint(pos.x, pos.y);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || activeTool === "wand") return;
    const pos = getPos(e);
    paint(pos.x, pos.y);
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
    lastPos.current = null;
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (activeTool === "wand") {
      const pos = getPos(e);
      doFloodFill(pos.x, pos.y);
      return;
    }
    setIsDrawing(true);
    lastPos.current = null;
    const pos = getPos(e);
    paint(pos.x, pos.y);
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!isDrawing || activeTool === "wand") return;
    const pos = getPos(e);
    paint(pos.x, pos.y);
  };

  // Color range removal
  const applyColorRange = (preset: ColorPreset) => {
    if (!imageCanvasRef.current || !maskCanvasRef.current) return;
    setApplyingColor(true);

    setTimeout(() => {
      try {
        const iCtx = imageCanvasRef.current!.getContext("2d")!;
        const w = imageCanvasRef.current!.width;
        const h = imageCanvasRef.current!.height;
        const imageData = iCtx.getImageData(0, 0, w, h);
        const mCtx = maskCanvasRef.current!.getContext("2d")!;
        const maskData = mCtx.getImageData(0, 0, w, h);

        let targetColor: [number, number, number];
        if (preset === "custom") {
          targetColor = hexToRgb(customColor);
        } else {
          const found = COLOR_PRESETS.find((p) => p.id === preset)!;
          targetColor = found.color;
        }

        const maxDist = (colorTolerance / 100) * 441.67;
        const [tr, tg, tb] = targetColor;

        for (let i = 0; i < imageData.data.length; i += 4) {
          const r = imageData.data[i];
          const g = imageData.data[i + 1];
          const b = imageData.data[i + 2];
          if (colorDistance(r, g, b, tr, tg, tb) <= maxDist) {
            maskData.data[i] = 239;
            maskData.data[i + 1] = 68;
            maskData.data[i + 2] = 68;
            maskData.data[i + 3] = 153;
          }
        }

        mCtx.putImageData(maskData, 0, 0);
        setHasMask(true);
        toast.success(
          `${preset === "custom" ? "Custom color" : COLOR_PRESETS.find((p) => p.id === preset)?.label} selection applied!`,
          {
            description: 'Click "Remove Selected Area" to finalize.',
          },
        );
      } finally {
        setApplyingColor(false);
      }
    }, 0);
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
      const offscreen = document.createElement("canvas");
      offscreen.width = w;
      offscreen.height = h;
      const ctx = offscreen.getContext("2d")!;
      ctx.drawImage(imageCanvasRef.current, 0, 0);
      const maskCtx = maskCanvasRef.current.getContext("2d")!;
      const maskData = maskCtx.getImageData(0, 0, w, h);
      const imgData = ctx.getImageData(0, 0, w, h);
      for (let i = 0; i < maskData.data.length; i += 4) {
        if (maskData.data[i + 3] > 10) {
          imgData.data[i + 3] = 0;
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

  const getCursor = () => {
    if (activeTool === "wand") return "cell";
    if (activeTool === "eraser") return "cell";
    return "crosshair";
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
                Paint, click with Magic Wand, or use Color Remove to select
                areas.
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
              {/* ── Toolbar ── */}
              <div className="flex flex-wrap items-center gap-3 mb-3 p-3 rounded-xl bg-muted/40 border border-border/40">
                {/* Tool buttons */}
                <div className="flex items-center gap-1.5">
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
                  <Button
                    size="sm"
                    variant={activeTool === "wand" ? "default" : "outline"}
                    className={
                      activeTool === "wand"
                        ? "gradient-btn border-0 text-white"
                        : ""
                    }
                    onClick={() => setActiveTool("wand")}
                    data-ocid="tool.toggle"
                  >
                    <Wand2 className="w-4 h-4 mr-1.5" /> Wand
                  </Button>
                </div>

                {/* Dynamic slider */}
                <div className="flex items-center gap-3 flex-1 min-w-[140px]">
                  {activeTool === "wand" ? (
                    <>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        Tolerance: {wandTolerance}
                      </span>
                      <Slider
                        min={1}
                        max={100}
                        step={1}
                        value={[wandTolerance]}
                        onValueChange={(v) => setWandTolerance(v[0])}
                        className="flex-1"
                        data-ocid="tool.toggle"
                      />
                    </>
                  ) : (
                    <>
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
                    </>
                  )}
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

              {/* ── Color Remove Section ── */}
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-3 p-3 rounded-xl bg-muted/30 border border-border/40"
              >
                <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">
                  Color Remove
                </p>
                <div className="flex flex-wrap gap-2 mb-3">
                  {COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={applyingColor}
                      onClick={() => applyColorRange(preset.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all hover:opacity-90 disabled:opacity-50 ${preset.bg} ${preset.border} text-foreground`}
                      data-ocid="tool.toggle"
                    >
                      {applyingColor ? (
                        <Loader2 className="w-3 h-3 animate-spin inline mr-1" />
                      ) : null}
                      {preset.label}
                    </button>
                  ))}

                  {/* Custom color picker */}
                  <label
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-border/50 bg-muted/40 cursor-pointer hover:bg-muted/60 transition-all"
                    data-ocid="tool.toggle"
                  >
                    <span
                      className="w-4 h-4 rounded-sm border border-white/20 inline-block"
                      style={{ background: customColor }}
                    />
                    <span>Custom</span>
                    <input
                      type="color"
                      value={customColor}
                      onChange={(e) => setCustomColor(e.target.value)}
                      className="sr-only"
                    />
                  </label>
                  <button
                    type="button"
                    disabled={applyingColor}
                    onClick={() => applyColorRange("custom")}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium border border-pink-500/50 bg-pink-600/20 text-foreground hover:opacity-90 disabled:opacity-50 transition-all"
                    data-ocid="tool.secondary_button"
                  >
                    Apply Custom
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    Color Tolerance: {colorTolerance}
                  </span>
                  <Slider
                    min={1}
                    max={100}
                    step={1}
                    value={[colorTolerance]}
                    onValueChange={(v) => setColorTolerance(v[0])}
                    className="flex-1 max-w-xs"
                    data-ocid="tool.toggle"
                  />
                </div>
              </motion.div>

              {/* Canvas area */}
              {!hasResult ? (
                <div className="relative rounded-xl overflow-hidden border border-border/50 bg-[repeating-conic-gradient(#2a2a3e_0%_25%,#1a1a2e_0%_50%)] bg-[length:20px_20px]">
                  <canvas ref={imageCanvasRef} className="block w-full" />
                  <canvas
                    ref={maskCanvasRef}
                    className="absolute inset-0 w-full h-full"
                    style={{ cursor: getCursor(), touchAction: "none" }}
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
                  : activeTool === "wand"
                    ? "🪄 Click on a color area to select similar pixels"
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
