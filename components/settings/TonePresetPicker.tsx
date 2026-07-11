"use client";

import { ReactNode, useState, useEffect } from "react";
import { Smile, Briefcase, Coffee, Sliders } from "lucide-react";

export const TONE_PRESETS = [
  {
    id: "ramah",
    label: "Ramah",
    description: "Sapaan hangat, santai, pakai emoji",
    icon: Smile,
    template: "Ramah, hangat, dan santai. Sapa pelanggan dengan 'Kak'. Boleh pakai emoji secukupnya 😊. Jawaban singkat dan jelas.",
  },
  {
    id: "profesional",
    label: "Profesional",
    description: "Formal, sopan, tanpa emoji",
    icon: Briefcase,
    template: "Profesional dan sopan. Gunakan bahasa baku, hindari singkatan dan emoji. Jawaban to the point dan informatif.",
  },
  {
    id: "santai",
    label: "Santai",
    description: "Kasual seperti chat teman",
    icon: Coffee,
    template: "Santai dan akrab, seperti mengobrol dengan teman dekat. Boleh pakai bahasa gaul ringan dan emoji. Tetap jelas dan membantu.",
  },
] as const;

interface TonePresetPickerProps {
  value: string; // current brandVoice
  onSelect: (template: string) => void; // called when a fixed preset is clicked
  customSlot: ReactNode; // rendered only when "Custom" is the active card
}

const deriveFromValue = (v: string) =>
  TONE_PRESETS.find((p) => p.template === v)?.id ?? "custom";

export default function TonePresetPicker({
  value,
  onSelect,
  customSlot,
}: TonePresetPickerProps) {
  const [activeCardId, setActiveCardId] = useState(() => deriveFromValue(value));

  useEffect(() => {
    setActiveCardId(deriveFromValue(value));
  }, [value]);

  const handlePresetClick = (id: string, template: string) => {
    setActiveCardId(id);
    onSelect(template);
  };

  const handleCustomClick = () => {
    setActiveCardId("custom");
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2 max-w-[640px]">
        {TONE_PRESETS.map((preset) => {
          const Icon = preset.icon;
          const isSelected = activeCardId === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => handlePresetClick(preset.id, preset.template)}
              className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary"
                  : "border-border hover:border-muted-foreground/30 bg-card"
              }`}
            >
              <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
              <div className="space-y-0.5">
                <p className="text-xs font-semibold text-foreground">{preset.label}</p>
                <p className="text-[10px] text-muted-foreground leading-snug">{preset.description}</p>
              </div>
            </button>
          );
        })}

        <button
          type="button"
          onClick={handleCustomClick}
          className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-all ${
            activeCardId === "custom"
              ? "border-primary bg-primary/5 ring-1 ring-primary"
              : "border-border hover:border-muted-foreground/30 bg-card"
          }`}
        >
          <Sliders className={`w-4 h-4 mt-0.5 shrink-0 ${activeCardId === "custom" ? "text-primary" : "text-muted-foreground"}`} />
          <div className="space-y-0.5">
            <p className="text-xs font-semibold text-foreground">Kustom / AI Analisis</p>
            <p className="text-[10px] text-muted-foreground leading-snug">Edit manual gaya chat atau pakai hasil analisis</p>
          </div>
        </button>
      </div>

      {activeCardId === "custom" && (
        <div className="animate-enter">{customSlot}</div>
      )}
    </div>
  );
}
