"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

interface Props {
  onClick:         () => void;
  arenaAccent:     string;
  arenaAccentGlow: string;
  hasDraft:        boolean;
}

// Fetches the image as a same-origin blob → draws onto an offscreen canvas →
// exposes a hit-test function that reads the alpha of any pixel in the image.
function usePixelHitTest(src: string) {
  const canvasRef  = useRef<HTMLCanvasElement | null>(null);
  const naturalRef = useRef<{ w: number; h: number } | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(src)
      .then(r => r.blob())
      .then(blob => {
        if (!alive) return;
        const url = URL.createObjectURL(blob);
        const img = new Image();
        img.onload = () => {
          if (!alive) return;
          const c = document.createElement("canvas");
          c.width  = img.naturalWidth;
          c.height = img.naturalHeight;
          c.getContext("2d")!.drawImage(img, 0, 0);
          canvasRef.current  = c;
          naturalRef.current = { w: img.naturalWidth, h: img.naturalHeight };
          URL.revokeObjectURL(url);
        };
        img.src = url;
      })
      .catch(() => {/* fallback: all pixels treated as opaque */});
    return () => { alive = false; };
  }, [src]);

  // Returns true only if the cursor is over an opaque pixel of the image.
  return useCallback((clientX: number, clientY: number, el: HTMLElement): boolean => {
    const canvas = canvasRef.current;
    const nat    = naturalRef.current;
    if (!canvas || !nat) return true; // image not ready yet — allow

    const r = el.getBoundingClientRect();

    // objectFit:contain — landscape image (1536×1024) in a portrait button
    // fills the button width; top/bottom letterboxed.
    const renderW = r.width;
    const renderH = r.width * (nat.h / nat.w);
    const offY    = (r.height - renderH) / 2;

    const rx = clientX - r.left;
    const ry = clientY - r.top - offY;

    // Cursor is in the transparent letterbox zone, not over the image
    if (rx < 0 || rx > renderW || ry < 0 || ry > renderH) return false;

    // Map rendered position → original image pixel
    const px    = Math.floor((rx / renderW) * nat.w);
    const py    = Math.floor((ry / renderH) * nat.h);
    const alpha = canvas.getContext("2d")!.getImageData(px, py, 1, 1).data[3];
    return alpha > 20; // ignore near-fully-transparent edges
  }, []);
}

export function WorksheetIcon({ onClick, arenaAccent, arenaAccentGlow, hasDraft }: Props) {
  const [hidden,  setHidden]  = useState(false);
  const [onPixel, setOnPixel] = useState(false);
  const [pressed, setPressed] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isOpaque  = usePixelHitTest("/worksheet-on-floor.png");

  useEffect(() => {
    const show = () => setHidden(false);
    const hide = () => setHidden(true);
    window.addEventListener("validator-panel-open",  hide);
    window.addEventListener("validator-panel-close", show);
    window.addEventListener("worksheet-popup-open",  hide);
    window.addEventListener("worksheet-popup-close", show);
    return () => {
      window.removeEventListener("validator-panel-open",  hide);
      window.removeEventListener("validator-panel-close", show);
      window.removeEventListener("worksheet-popup-open",  hide);
      window.removeEventListener("worksheet-popup-close", show);
    };
  }, []);

  if (hidden) return null;

  return (
    <motion.div
      className="fixed z-[100] flex items-end justify-end"
      style={{
        right:  "calc(53% + clamp(173px, 14.4vw, 269px) + 4px)",
        bottom: "20px",
        width:  "clamp(260px, 21.6vw, 404px)",
        height: "clamp(260px, 21.6vw, 404px)",
        pointerEvents: "none",
        filter: `drop-shadow(0 0 18px ${arenaAccentGlow})`,
      }}
      animate={{ y: [0, -2, 0] }}
      transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Sprite wrapper — animates only when cursor is on an opaque pixel */}
      <motion.div
        style={{
          pointerEvents: "none",
          width:      "72%",
          height:     "100%",
          position:   "relative",
          display:    "flex",
          alignItems: "flex-end",
          justifyContent: "center",
        }}
        animate={
          pressed  ? { y: 0,  scale: 0.96 } :
          onPixel  ? { y: -3, scale: 1.04 } :
                     { y: 0,  scale: 1    }
        }
        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      >
        <img
          src="/worksheet-on-floor.png"
          alt=""
          draggable={false}
          style={{ width: "100%", height: "100%", objectFit: "contain", pointerEvents: "none" }}
        />
        {hasDraft && (
          <span
            className="absolute top-2 right-2 w-3 h-3 rounded-full"
            style={{ background: arenaAccent, boxShadow: `0 0 10px ${arenaAccentGlow}` }}
          />
        )}

        {/* Full-size invisible button — pixel hit-test gates every interaction */}
        <motion.button
          ref={buttonRef}
          type="button"
          aria-label="Open worksheet"
          style={{
            position:      "absolute",
            inset:         0,
            background:    "transparent",
            border:        "none",
            padding:       0,
            pointerEvents: "auto",
            cursor:        onPixel ? "pointer" : "default",
          }}
          onMouseMove={(e) => {
            if (!buttonRef.current) return;
            setOnPixel(isOpaque(e.clientX, e.clientY, buttonRef.current));
          }}
          onMouseLeave={() => { setOnPixel(false); setPressed(false); }}
          onMouseDown={(e) => {
            if (!buttonRef.current) return;
            if (isOpaque(e.clientX, e.clientY, buttonRef.current)) setPressed(true);
          }}
          onMouseUp={() => setPressed(false)}
          onClick={(e) => {
            if (!buttonRef.current) return;
            // Only open if the click landed on an opaque pixel of the worksheet image
            if (isOpaque(e.clientX, e.clientY, buttonRef.current)) onClick();
          }}
        />
      </motion.div>
    </motion.div>
  );
}
