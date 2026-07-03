"use client";

import { use, useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  getChapter, loadProgress, saveProgress,
  PHASES, PhaseId, PhaseStatus, ChapterProgress,
} from "@/lib/learnPath";
import { CONCEPT_SEEDS } from "@/lib/blogSeeds";
import SectionSidebar from "@/components/learn/SectionSidebar";
import PhaseBar from "@/components/learn/PhaseBar";
import CuriosityPhase, { CuriosityPhaseHandle } from "@/components/learn/curiosity/CuriosityPhase";
import ConceptPhase from "@/components/learn/concept/ConceptPhase";
import { BlogState, BlogViewHandle } from "@/components/learn/concept/BlogView";
import AssessmentPhase from "@/components/learn/assessment/AssessmentPhase";
import SummaryPhase from "@/components/learn/summary/SummaryPhase";
import LearnTeacher, { LearnTeacherHandle } from "@/components/learn/teacher/LearnTeacher";

export default function LearnChapterPage({ params }: { params: Promise<{ chapterId: string }> }) {
  const { chapterId } = use(params);
  const chapter = getChapter(chapterId);

  const [progress, setProgress]               = useState<ChapterProgress>({});
  const [activeSectionId, setActiveSectionId] = useState("");
  const [activePhase, setActivePhase]         = useState<PhaseId>(1);
  const [phaseKey, setPhaseKey]               = useState(0);
  const [celebratingSection, setCelebratingSection] = useState(false);
  const [activeCardQuestion, setActiveCardQuestion]  = useState<string | null>(null);
  const [activeCardOptions,  setActiveCardOptions]   = useState<string[]>([]);
  const teacherRef        = useRef<LearnTeacherHandle>(null);
  const curiosityPhaseRef = useRef<CuriosityPhaseHandle>(null);
  const blogViewRef       = useRef<BlogViewHandle>(null);
  const [blogState, setBlogState] = useState<BlogState | null>(null);

  useEffect(() => {
    if (!chapter) return;
    const prog = loadProgress(chapterId, chapter);
    setProgress(prog);
    setActiveSectionId(chapter.sections[0].id);
    setActivePhase(1);
  }, [chapterId]);

  const updateProgress = useCallback((newProg: ChapterProgress) => {
    setProgress(newProg);
    if (chapter) saveProgress(chapterId, newProg);
  }, [chapterId, chapter]);

  function advancePhase(currentPhase: PhaseId) {
    const nextPhase = (currentPhase + 1) as PhaseId;
    const newProg = structuredClone(progress);
    newProg[activeSectionId][currentPhase] = "done";
    if (nextPhase <= 4) newProg[activeSectionId][nextPhase] = "active";
    updateProgress(newProg);
    if (nextPhase <= 4) setActivePhase(nextPhase);
  }

  function handleSelectPhase(phase: PhaseId) {
    const status: PhaseStatus = progress[activeSectionId]?.[phase] ?? "locked";
    if (status !== "locked") setActivePhase(phase);
  }

  function handleSelectSection(sectionId: string, phase: PhaseId) {
    setActiveSectionId(sectionId);
    setActivePhase(phase);
    setPhaseKey((k) => k + 1);
  }

  function handleSectionComplete() {
    const newProg = structuredClone(progress);
    newProg[activeSectionId][4] = "done";
    if (chapter) {
      const curIdx = chapter.sections.findIndex((s) => s.id === activeSectionId);
      if (curIdx < chapter.sections.length - 1) {
        const nextId = chapter.sections[curIdx + 1].id;
        PHASES.forEach((p) => { if (newProg[nextId][p.id] === "locked" && p.id === 1) newProg[nextId][p.id] = "active"; });
      }
    }
    updateProgress(newProg);
    setCelebratingSection(true);
  }

  function handleCelebrationNext() {
    setCelebratingSection(false);
    if (!chapter) return;
    const curIdx = chapter.sections.findIndex((s) => s.id === activeSectionId);
    if (curIdx < chapter.sections.length - 1) {
      handleSelectSection(chapter.sections[curIdx + 1].id, 1);
    }
  }

  if (!chapter) {
    return (
      <div style={{ height: "calc(100vh - 57px)", display: "flex", alignItems: "center", justifyContent: "center", background: "#F8F9FF", color: "#334155", fontFamily: "'Outfit',sans-serif", fontSize: 16 }}>
        Chapter not found.
      </div>
    );
  }

  const activeSection = chapter.sections.find((s) => s.id === activeSectionId);
  const sectionProg   = progress[activeSectionId] ?? {};

  return (
    <div style={{ height: "calc(100vh - 57px)", display: "flex", overflow: "hidden", background: "#F8F9FF", position: "relative" }}>
      {/* Sidebar */}
      <SectionSidebar
        chapter={chapter}
        progress={progress}
        activeSectionId={activeSectionId}
        activePhase={activePhase}
        onSelectSection={handleSelectSection}
      />

      {/* Main area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        <PhaseBar
          sectionProgress={sectionProg}
          activePhase={activePhase}
          onSelectPhase={handleSelectPhase}
        />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={`${activeSectionId}-${activePhase}-${phaseKey}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
              style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
            >
              {activeSection && activePhase === 1 && (
                <CuriosityPhase
                  ref={curiosityPhaseRef}
                  section={activeSection}
                  subject={chapter.subject}
                  gradeLevel={chapter.gradeLevel}
                  onPhaseComplete={() => advancePhase(1)}
                  onCardActive={setActiveCardQuestion}
                  onCardOptionsActive={setActiveCardOptions}
                  onOptionSelect={(text) => teacherRef.current?.appreciateOption(text)}
                  onReveal={(hook) => teacherRef.current?.explainHook(hook)}
                />
              )}
              {activeSection && activePhase === 2 && (
                <ConceptPhase
                  section={activeSection}
                  subject={chapter.subject}
                  gradeLevel={chapter.gradeLevel}
                  onPhaseComplete={() => advancePhase(2)}
                  onBlogStateChange={setBlogState}
                  blogViewRef={blogViewRef}
                />
              )}
              {activeSection && activePhase === 3 && (
                <AssessmentPhase section={activeSection} subject={chapter.subject} gradeLevel={chapter.gradeLevel} onPass={() => advancePhase(3)} onRetry={() => setActivePhase(2)} />
              )}
              {activeSection && activePhase === 4 && (
                <SummaryPhase section={activeSection} subject={chapter.subject} gradeLevel={chapter.gradeLevel} onSectionComplete={handleSectionComplete} />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Interactive audio teacher */}
      <LearnTeacher
        ref={teacherRef}
        chapter={chapter}
        activeSectionTitle={activeSection?.title ?? ""}
        activeSectionId={activeSectionId}
        activePhase={activePhase as 1 | 2 | 3 | 4}
        activeCardQuestion={activePhase === 1 ? activeCardQuestion : null}
        activeCardOptions={activePhase === 1 ? activeCardOptions : []}
        onAutoSelectOption={(idx) => curiosityPhaseRef.current?.selectOption(idx)}
        onRevealCard={() => curiosityPhaseRef.current?.revealCard()}
        blogState={activePhase === 2 ? blogState : null}
        blogViewRef={activePhase === 2 ? blogViewRef : undefined}
        onNavigateSection={handleSelectSection}
        crossSectionContext={chapter.sections.map(s => ({
          sectionId: s.id,
          sectionTitle: s.title,
          conceptCards: (CONCEPT_SEEDS[s.id]?.cards ?? []).map(c => ({ title: c.title, hook: c.hook })),
        }))}
      />

      {/* Section complete celebration overlay */}
      <AnimatePresence>
        {celebratingSection && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: "absolute", inset: 0, zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(255,255,255,0.85)", backdropFilter: "blur(12px)" }}
            onClick={handleCelebrationNext}
          >
            <motion.div
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", stiffness: 220, damping: 18 }}
              style={{ textAlign: "center", padding: "48px 40px", borderRadius: 32, background: "#FFFFFF", border: "2px solid #A7F3D0", boxShadow: "0 20px 60px rgba(16,185,129,0.2), 0 4px 20px rgba(0,0,0,0.08)", maxWidth: 420, width: "90%" }}
              onClick={(e) => e.stopPropagation()}
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 10, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.8, delay: 0.2 }}
                style={{ fontSize: 64, marginBottom: 20 }}
              >
                🎯
              </motion.div>
              <h2 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 28, color: "#1E293B", marginBottom: 10 }}>
                Section Complete!
              </h2>
              <p style={{ fontFamily: "'Outfit',sans-serif", color: "#64748B", fontSize: 15, marginBottom: 28 }}>
                You nailed <strong style={{ color: "#059669" }}>{activeSection?.title}</strong>. Ready for the next one?
              </p>

              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 28 }}>
                {PHASES.map((p) => (
                  <div key={p.id} style={{ width: 10, height: 10, borderRadius: "50%", background: p.color }} />
                ))}
              </div>

              <motion.button
                onClick={handleCelebrationNext}
                whileHover={{ scale: 1.05, boxShadow: "0 12px 32px rgba(16,185,129,0.4)" }}
                whileTap={{ scale: 0.97 }}
                style={{ width: "100%", padding: "15px 0", borderRadius: 16, border: "none", cursor: "pointer", background: "linear-gradient(135deg, #10B981, #059669)", color: "#fff", fontFamily: "'Nunito',sans-serif", fontWeight: 900, fontSize: 16, boxShadow: "0 4px 14px rgba(16,185,129,0.3)" }}>
                Next Section →
              </motion.button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
