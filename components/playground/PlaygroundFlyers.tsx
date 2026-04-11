"use client";

import { useReducedMotion } from "framer-motion";

type Props = { arenaId: number };

/** Tiny rocket — simple cartoon silhouette for background motion */
function RocketSvg({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 32 56" fill="none" aria-hidden>
      <path
        d="M16 4 L22 18 L28 20 L22 28 L20 44 L16 52 L12 44 L10 28 L4 20 L10 18 Z"
        fill="#c5cad8"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="0.8"
      />
      <path d="M16 52 L10 58 L16 54 L22 58 Z" fill="#FF6B2B" opacity="0.9" />
      <ellipse cx="16" cy="14" rx="4" ry="5" fill="rgba(200,230,255,0.55)" />
    </svg>
  );
}

function BookSvg({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 36 28" fill="none" aria-hidden>
      <rect x="4" y="5" width="28" height="18" rx="2" fill="#5C3D2E" stroke="rgba(255,200,140,0.35)" strokeWidth="1" />
      <path d="M18 5v18" stroke="rgba(255,220,180,0.25)" strokeWidth="1" />
      <rect x="7" y="8" width="9" height="2" rx="0.5" fill="rgba(255,200,120,0.4)" />
      <rect x="20" y="12" width="9" height="2" rx="0.5" fill="rgba(255,200,120,0.35)" />
    </svg>
  );
}

function StarSvg({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2l2.5 7.5L22 12l-7.5 2.5L12 22l-2.5-7.5L2 12l7.5-2.5L12 2z"
        fill="#FFD666"
        stroke="#FFAA33"
        strokeWidth="0.6"
        opacity="0.95"
      />
    </svg>
  );
}

function RocketsOnly() {
  const sizes = [26, 22, 28, 24, 20];
  return (
    <div className="pg-flyers" aria-hidden>
      {sizes.map((w, i) => (
        <div key={i} className={`pg-flyer pg-flyer-rocket pg-flyer-rocket--e${i}`} style={{ width: w, height: w * 1.75 }}>
          <RocketSvg className="h-full w-full" />
        </div>
      ))}
    </div>
  );
}

/** Story Forge: books + stars + a couple of small rockets */
function ForgeFlyers() {
  return (
    <div className="pg-flyers pg-flyers-forge" aria-hidden>
      <div className="pg-flyer pg-flyer-book pg-flyer-book--0">
        <BookSvg className="h-full w-full" />
      </div>
      <div className="pg-flyer pg-flyer-book pg-flyer-book--1">
        <BookSvg className="h-full w-full" />
      </div>
      <div className="pg-flyer pg-flyer-book pg-flyer-book--2">
        <BookSvg className="h-full w-full" />
      </div>
      <div className="pg-flyer pg-flyer-star pg-flyer-star--0">
        <StarSvg className="h-full w-full" />
      </div>
      <div className="pg-flyer pg-flyer-star pg-flyer-star--1">
        <StarSvg className="h-full w-full" />
      </div>
      <div className="pg-flyer pg-flyer-star pg-flyer-star--2">
        <StarSvg className="h-full w-full" />
      </div>
      <div className="pg-flyer pg-flyer-rocket pg-flyer-rocket--f0" style={{ width: 18, height: 32 }}>
        <RocketSvg className="h-full w-full" />
      </div>
      <div className="pg-flyer pg-flyer-rocket pg-flyer-rocket--f1" style={{ width: 16, height: 28 }}>
        <RocketSvg className="h-full w-full" />
      </div>
    </div>
  );
}

export function PlaygroundFlyers({ arenaId }: Props) {
  const reduced = useReducedMotion();
  if (reduced) return null;

  const id = Math.min(6, Math.max(1, arenaId));
  if (id === 1) return <RocketsOnly />;
  if (id === 3) return <ForgeFlyers />;
  return null;
}
