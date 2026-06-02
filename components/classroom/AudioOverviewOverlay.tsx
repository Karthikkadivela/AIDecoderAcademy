"use client";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { useState } from "react";

interface Props {
  audioUrl: string;
  script: string;
  title: string;
  onClose: () => void;
}

export function AudioOverviewOverlay({ audioUrl, script, title, onClose }: Props) {
  const [showScript, setShowScript] = useState(false);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
      className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-5 p-8"
      style={{ background: "rgba(8,8,15,0.55)", backdropFilter: "blur(8px)" }}
    >
      <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white"><X /></button>
      <h2 className="font-display text-xl text-white">{title}</h2>
      <audio src={audioUrl} controls autoPlay className="w-[min(520px,90%)]" />
      <button onClick={() => setShowScript(s => !s)} className="text-sm text-[#2563eb] underline">
        {showScript ? "Hide script" : "Show script"}
      </button>
      {showScript && (
        <div className="max-w-[560px] max-h-[40%] overflow-y-auto text-sm text-white/85 leading-relaxed whitespace-pre-wrap">
          {script}
        </div>
      )}
    </motion.div>
  );
}
