"use client";

import { cn } from "@/lib/utils";
import type { ArenaEnvironmentPreset } from "@/lib/arenas";

type Props = {
  preset: ArenaEnvironmentPreset;
  /** Arena radial wash from `ArenaConfig.gradient` */
  gradient: string;
};

/**
 * Full-viewport atmospheric layer for the whole dashboard (P1: one CSS motion per arena).
 * Sits at z-0; chrome and pages use higher z-index. Respects `prefers-reduced-motion` in CSS.
 */
export function ArenaEnvironment({ preset, gradient }: Props) {
  return (
    <div
      className="arena-env pointer-events-none fixed inset-0 z-0 overflow-hidden"
      aria-hidden
    >
      <div className="arena-env__void" />
      <div
        className="arena-env__glow"
        style={{ background: gradient }}
      />
      <div className={cn("arena-env__terrain", `arena-env__terrain--${preset}`)} />
    </div>
  );
}
