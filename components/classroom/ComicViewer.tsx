"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, Download } from "lucide-react";

interface DialogueLine { speaker: string; text: string; }
interface Panel {
  number:    number;
  title:     string;
  scene:     string;
  dialogue:  DialogueLine[];
  concept:   string;
  imageUrl:  string | null;
}

interface Props {
  chapterTitle:  string;
  panels:        Panel[];
  keyTakeaways:  string[];
  onClose:       () => void;
  onSave:        (content: string) => void;
}

const SPEAKER_COLORS: Record<string, string> = {
  "Arya":     "#2563eb",
  "Dr. Spark":"#7C3AED",
};

function SpeechBubble({ line }: { line: DialogueLine }) {
  const color  = SPEAKER_COLORS[line.speaker] ?? "#374151";
  const isArya = line.speaker === "Arya";
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: isArya ? "flex-start" : "flex-end",
      marginBottom: 4,
    }}>
      <span style={{ fontSize: 9, fontWeight: 700, color, marginBottom: 2, letterSpacing: "0.04em" }}>
        {line.speaker.toUpperCase()}
      </span>
      <div style={{
        maxWidth: "90%", padding: "5px 9px", borderRadius: isArya ? "0 10px 10px 10px" : "10px 0 10px 10px",
        background: isArya ? "rgba(37,99,235,0.12)" : "rgba(124,58,237,0.12)",
        border: `1px solid ${color}30`,
        fontSize: 11, lineHeight: 1.4, color: "#1a1a2e", fontWeight: 500,
      }}>
        "{line.text}"
      </div>
    </div>
  );
}

function ComicPanel({ panel, index }: { panel: Panel; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.08 }}
      style={{
        background: "#fff",
        borderRadius: 12,
        border: "2.5px solid #1a1a2e",
        overflow: "hidden",
        display: "flex", flexDirection: "column",
        boxShadow: "3px 3px 0 #1a1a2e",
      }}
    >
      {/* Panel header */}
      <div style={{
        background: "#1a1a2e", padding: "4px 10px",
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <span style={{
          background: "#FFD700", color: "#1a1a2e",
          fontSize: 9, fontWeight: 900, padding: "1px 6px", borderRadius: 4,
          letterSpacing: "0.06em",
        }}>
          PANEL {panel.number}
        </span>
        <span style={{ color: "rgba(255,255,255,0.8)", fontSize: 10, fontWeight: 600 }}>
          {panel.title}
        </span>
      </div>

      {/* Image */}
      <div style={{
        width: "100%", aspectRatio: "16/9",
        background: "linear-gradient(135deg,#e8f4ff,#f0e8ff)",
        position: "relative", overflow: "hidden", flexShrink: 0,
      }}>
        {panel.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={panel.imageUrl} alt={panel.title} draggable={false}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: 6,
          }}>
            <span style={{ fontSize: 32 }}>🎨</span>
            <span style={{ fontSize: 10, color: "#94a3b8" }}>Generating image…</span>
          </div>
        )}
      </div>

      {/* Dialogue */}
      <div style={{ padding: "8px 10px 4px", flex: 1 }}>
        {panel.dialogue.map((line, i) => (
          <SpeechBubble key={i} line={line} />
        ))}
      </div>

      {/* Concept footer */}
      <div style={{
        margin: "4px 10px 8px",
        padding: "5px 8px", borderRadius: 6,
        background: "rgba(37,99,235,0.07)",
        border: "1px solid rgba(37,99,235,0.15)",
      }}>
        <span style={{ fontSize: 9, fontWeight: 700, color: "#2563eb", letterSpacing: "0.05em" }}>📚 CONCEPT </span>
        <span style={{ fontSize: 10, color: "#374151", lineHeight: 1.4 }}>{panel.concept}</span>
      </div>
    </motion.div>
  );
}

export function ComicViewer({ chapterTitle, panels, keyTakeaways, onClose, onSave }: Props) {
  const handleSave = () => {
    const lines: string[] = [`# Comic Strip: ${chapterTitle}\n`];
    panels.forEach(p => {
      lines.push(`## Panel ${p.number}: ${p.title}`);
      lines.push(`**Scene:** ${p.scene}`);
      p.dialogue.forEach(d => lines.push(`**${d.speaker}:** "${d.text}"`));
      lines.push(`**Concept:** ${p.concept}`);
      if (p.imageUrl) lines.push(`**Image:** ${p.imageUrl}`);
      lines.push("");
    });
    lines.push("## ✨ Key Takeaways");
    keyTakeaways.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
    onSave(lines.join("\n"));
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        style={{
          position: "fixed", inset: 0, zIndex: 1000,
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 16,
        }}
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.92, y: 24 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.92, y: 24 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
          onClick={e => e.stopPropagation()}
          style={{
            width: "min(960px, 96vw)", maxHeight: "92vh",
            background: "#f8faff",
            borderRadius: 18, border: "3px solid #1a1a2e",
            boxShadow: "6px 6px 0 #1a1a2e",
            display: "flex", flexDirection: "column",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div style={{
            background: "#1a1a2e", padding: "12px 16px",
            display: "flex", alignItems: "center", gap: 10, flexShrink: 0,
          }}>
            <BookOpen size={16} color="#FFD700" />
            <div style={{ flex: 1 }}>
              <div style={{ color: "#fff", fontWeight: 900, fontSize: 14, letterSpacing: "0.02em" }}>
                📖 COMIC STRIP
              </div>
              <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 10, marginTop: 1 }}>
                {chapterTitle} · CBSE Class 10 Science
              </div>
            </div>
            <button
              onClick={handleSave}
              style={{
                display: "flex", alignItems: "center", gap: 5,
                padding: "5px 12px", borderRadius: 8,
                background: "#FFD700", border: "none", cursor: "pointer",
                color: "#1a1a2e", fontSize: 11, fontWeight: 800,
              }}
            >
              <Download size={12} /> Save
            </button>
            <button
              onClick={onClose}
              style={{
                width: 28, height: 28, borderRadius: "50%", border: "none",
                background: "rgba(255,255,255,0.12)", cursor: "pointer",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff",
              }}
            >
              <X size={14} />
            </button>
          </div>

          {/* Panel grid */}
          <div style={{
            overflowY: "auto", padding: 16,
            display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 12, flex: 1,
          }}>
            {panels.map((panel, i) => (
              <ComicPanel key={panel.number} panel={panel} index={i} />
            ))}
          </div>

          {/* Key Takeaways */}
          {keyTakeaways.length > 0 && (
            <div style={{
              flexShrink: 0, padding: "10px 16px 14px",
              background: "#fff", borderTop: "2px solid #1a1a2e",
            }}>
              <div style={{
                fontSize: 11, fontWeight: 900, color: "#1a1a2e",
                marginBottom: 6, letterSpacing: "0.06em",
              }}>
                ✨ KEY TAKEAWAYS
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {keyTakeaways.map((t, i) => (
                  <div key={i} style={{
                    padding: "4px 10px", borderRadius: 20,
                    background: i === 0 ? "rgba(37,99,235,0.1)" : i === 1 ? "rgba(124,58,237,0.1)" : "rgba(16,185,129,0.1)",
                    border: `1px solid ${i === 0 ? "rgba(37,99,235,0.25)" : i === 1 ? "rgba(124,58,237,0.25)" : "rgba(16,185,129,0.25)"}`,
                    fontSize: 11, color: "#374151", fontWeight: 500,
                  }}>
                    <span style={{ fontWeight: 700 }}>{i + 1}.</span> {t}
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
