import { Layers } from "lucide-react";
import { ToolPage } from "../../components/ToolPage";

export function WatermarkRemover() {
  return (
    <ToolPage
      toolName="watermark-remover"
      title="Watermark Remover"
      description="Remove watermarks from your images cleanly and effortlessly."
      acceptedTypes="image/*"
      icon={<Layers className="w-6 h-6" />}
      accentColor="linear-gradient(135deg, oklch(0.50 0.20 195), oklch(0.45 0.22 220))"
      processLabel="Remove Watermark"
    />
  );
}
