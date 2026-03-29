import { Label } from "@/components/ui/label";
import { Image } from "lucide-react";
import { useState } from "react";
import { ToolPage } from "../../components/ToolPage";

const PRESETS = [
  { label: "Ocean Blue", value: "linear-gradient(135deg, #0F4C81, #1A9ED4)" },
  { label: "Sunset", value: "linear-gradient(135deg, #FF6B35, #F7C59F)" },
  { label: "Forest", value: "linear-gradient(135deg, #134E4A, #22C55E)" },
  { label: "Galaxy", value: "linear-gradient(135deg, #1E1B4B, #7C3AED)" },
  { label: "Rose", value: "linear-gradient(135deg, #881337, #FB7185)" },
  { label: "White", value: "#FFFFFF" },
];

function BgSelector() {
  const [selected, setSelected] = useState(0);

  return (
    <div className="bg-muted/40 border border-border/40 rounded-xl p-5">
      <Label className="text-sm font-medium mb-3 block">
        Choose Background
      </Label>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {PRESETS.map((preset, i) => (
          <button
            type="button"
            key={preset.label}
            onClick={() => setSelected(i)}
            className={`relative flex flex-col items-center gap-1.5 p-2 rounded-lg border transition-all ${
              selected === i
                ? "border-primary/70 bg-primary/10"
                : "border-border/40 hover:border-border"
            }`}
            data-ocid={`bgchanger.toggle.${i + 1}`}
          >
            <div
              className="w-full aspect-square rounded-md"
              style={{ background: preset.value }}
            />
            <span className="text-xs text-muted-foreground">
              {preset.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function BackgroundChanger() {
  return (
    <ToolPage
      toolName="background-changer"
      title="Background Changer"
      description="Upload an image and choose a new background from our presets."
      acceptedTypes="image/*"
      icon={<Image className="w-6 h-6" />}
      accentColor="linear-gradient(135deg, oklch(0.55 0.20 145), oklch(0.50 0.22 165))"
      processLabel="Change Background"
      extraControls={<BgSelector />}
    />
  );
}
