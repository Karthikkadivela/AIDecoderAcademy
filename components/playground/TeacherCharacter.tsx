"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TeacherDialogue, type ValidationResult } from "./TeacherDialogue";
import { getRubric, genericRubric, type ObjectiveRubric } from "@/lib/objectiveRubrics";
import { OBJECTIVES, toLmsId, type Objective } from "@/lib/objectives";

interface Props {
  // Legacy id from URL ?objective=  (e.g. "a1-3"). May also be a doc-style
  // id like "l1-03" if anyone links to one — we accept both.
  objectiveId: string;

  // Live playground messages. The validator scores these against the rubric.
  // We accept the same `Message` shape useChat.ts produces — only role,
  // content, and outputType matter to the validator.
  messages: { role: "user" | "assistant"; content: string; outputType?: string; isLoading?: boolean }[];

  // For age-adapted feedback.
  profile: { display_name?: string; age_group?: string } | null;

  // Awards XP and updates UI on the parent. Called only when the student
  // clicks "Mark Complete" on a passing attempt.
  onObjectiveCompleted?: (objectiveId: string, lmsId: string) => void;
}

export function TeacherCharacter({ objectiveId, messages, profile, onObjectiveCompleted }: Props) {
  const [open, setOpen] = useState(false);
  const [hint, setHint] = useState(true); // "💬 Talk to teacher" badge fades after first interaction

  // Resolve rubric + the underlying Objective (for fallback title/task).
  const lmsId  = objectiveId.startsWith("l") ? objectiveId : toLmsId(objectiveId);
  const objective: Objective | undefined = OBJECTIVES.find(o => o.id === objectiveId);
  const rubric: ObjectiveRubric =
    getRubric(lmsId)
    ?? genericRubric(
      objective?.title       ?? `Objective ${objectiveId}`,
      objective?.description ?? "Complete the assigned task.",
    );

  // Hide the floating hint after the dialogue has been opened once.
  useEffect(() => { if (open) setHint(false); }, [open]);

  async function handleValidate(): Promise<{ result: ValidationResult; attemptId: string } | null> {
    const cleanMessages = messages
      .filter(m => !m.isLoading && m.content)
      .map(m => ({
        role:       m.role,
        content:    m.content,
        outputType: m.outputType,
      }));

    // 1. Run the validator
    const vRes = await fetch("/api/aida/validate", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lmsId,
        fallbackTitle: objective?.title,
        fallbackTask:  objective?.description,
        messages:      cleanMessages,
        profile: {
          display_name: profile?.display_name ?? "Student",
          age_group:    profile?.age_group    ?? "11-13",
        },
      }),
    });
    if (!vRes.ok) {
      console.error("[TeacherCharacter] validate http error:", vRes.status);
      return null;
    }
    const result = await vRes.json() as ValidationResult;

    // 2. Log the attempt
    const aRes = await fetch("/api/objective-attempts", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        objective_id: objectiveId,
        lms_id:       lmsId,
        score:        result.score,
        tier:         result.tier,
        passed:       result.passed,
        feedback: {
          summary:      result.summary,
          strengths:    result.strengths,
          improvements: result.improvements,
          hintForRetry: result.hintForRetry,
        },
      }),
    });
    if (!aRes.ok) {
      console.error("[TeacherCharacter] log attempt http error:", aRes.status);
      // Don't block the UI — we still have the result, just no DB row.
      return { result, attemptId: "" };
    }
    const { attempt_id } = await aRes.json() as { attempt_id: string };
    return { result, attemptId: attempt_id };
  }

  async function handleComplete(attemptId: string) {
    if (!attemptId) return;
    // Mark complete in DB
    const res = await fetch("/api/objective-attempts", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ attempt_id: attemptId }),
    });
    if (!res.ok) throw new Error("Failed to mark complete");

    // Award XP via existing engine. event_type "save_creation" = 8 XP, but
    // for objective completion we use the objective's own xpReward value
    // by sending a custom event type the xp route already supports.
    if (objective?.xpReward) {
      try {
        await fetch("/api/xp", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({
            event_type: "objective_complete",
            meta: { objective_id: objectiveId, lms_id: lmsId, xp: objective.xpReward },
          }),
        });
      } catch (err) {
        // Don't block the UX — XP is best-effort for now
        console.warn("[TeacherCharacter] XP award failed:", err);
      }
    }

    onObjectiveCompleted?.(objectiveId, lmsId);
  }

  return (
    <>
      {/* Bottom-left character sprite — clickable, idle bob.
          Fluid sizing so it scales between ~72px and ~112px across screen sizes. */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Talk to the validator teacher"
        className="fixed z-[55]"
        style={{
          left:        "clamp(16px, 1.5vw, 32px)",
          bottom:      "clamp(16px, 2vh, 32px)",
          padding:     0,
          background:  "transparent",
          border:      "none",
          cursor:      "pointer",
        }}
      >
        <motion.div
          animate={{ y: [0, -3, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          className="relative"
        >
          <img
            src="/assistant.png"
            alt=""
            draggable={false}
            style={{
              width:     "clamp(72px, 6vw, 112px)",
              height:    "clamp(72px, 6vw, 112px)",
              objectFit: "contain",
              filter:    "drop-shadow(0 0 18px rgba(124,58,237,0.55))",
            }}
          />
          {hint && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute -top-7 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-md whitespace-nowrap"
              style={{
                background: "rgba(8,8,15,0.92)",
                border:     "1px solid rgba(124,58,237,0.5)",
                color:      "rgba(255,255,255,0.9)",
                fontSize:   10,
                fontFamily: "'JetBrains Mono', monospace",
                boxShadow:  "0 4px 14px rgba(0,0,0,0.5)",
              }}
            >
              💬 Talk to teacher
            </motion.div>
          )}
        </motion.div>
      </button>

      <TeacherDialogue
        open={open}
        rubric={rubric}
        onClose={() => setOpen(false)}
        onValidate={handleValidate}
        onComplete={handleComplete}
      />
    </>
  );
}
