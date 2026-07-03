"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { LearnSection } from "@/lib/learnPath";
import BlogView, { BlogState, BlogViewHandle } from "./BlogView";
import StoryView from "./StoryView";
import PodcastView from "./PodcastView";
import VideoView from "./VideoView";

type TabId = "blog" | "podcast" | "story" | "video";

const TABS = [
  { id: "blog"    as TabId, label: "Blog",    emoji: "📝", color: "#4F46E5", bg: "#EEF2FF" },
  { id: "podcast" as TabId, label: "Podcast", emoji: "🎙️", color: "#7C3AED", bg: "#F5F3FF" },
  { id: "story"   as TabId, label: "Story",   emoji: "📖", color: "#0891B2", bg: "#ECFEFF" },
  { id: "video"   as TabId, label: "Video",   emoji: "🎬", color: "#64748B", bg: "#F8FAFC" },
];

interface Props {
  section: LearnSection;
  subject: string;
  gradeLevel: string;
  onPhaseComplete: () => void;
  onBlogStateChange?: (state: BlogState) => void;
  blogViewRef?: React.Ref<BlogViewHandle>;
}

export default function ConceptPhase({ section, subject, gradeLevel, onPhaseComplete, onBlogStateChange, blogViewRef }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("blog");
  const [viewed, setViewed]       = useState<Set<TabId>>(new Set());

  function markViewed(id: TabId) { setViewed((p) => new Set([...p, id])); }

  const canProceed = viewed.size >= 1;

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0, background: "#EEF2FF" }}>
      {/* Header */}
      <div style={{
        padding: "16px 24px 14px", background: "#FFFFFF",
        borderBottom: "1.5px solid #E0E7FF",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20, background: "#EEF2FF", border: "1.5px solid #C7D2FE", marginBottom: 6 }}>
            <span style={{ fontSize: 12 }}>📖</span>
            <span style={{ fontFamily: "'Outfit',sans-serif", fontWeight: 700, fontSize: 11, color: "#4338CA" }}>Concept Phase</span>
          </div>
          <h2 style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 18, color: "#1E293B", margin: 0 }}>
            {section.emoji} {section.title}
          </h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontFamily: "'Outfit',sans-serif", fontSize: 12, fontWeight: 600, color: "#94A3B8" }}>
            {viewed.size}/4 explored
          </span>
          {canProceed && (
            <motion.button
              initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              onClick={onPhaseComplete}
              whileHover={{ scale: 1.05, boxShadow: "0 6px 18px rgba(220,38,38,0.35)" }}
              whileTap={{ scale: 0.97 }}
              style={{
                padding: "9px 18px", borderRadius: 12, border: "none", cursor: "pointer",
                background: "linear-gradient(135deg, #EF4444, #DC2626)",
                color: "#fff", fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 14,
                boxShadow: "0 4px 14px rgba(220,38,38,0.3)",
              }}
            >
              Take the Challenge ⚡
            </motion.button>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ padding: "12px 20px 0", background: "#FFFFFF", borderBottom: "1.5px solid #E0E7FF", display: "flex", gap: 6 }}>
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const isDone   = viewed.has(tab.id);
          return (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              whileHover={{ y: -2 }}
              style={{
                flex: 1, padding: "10px 8px 11px", border: "none", cursor: "pointer",
                borderRadius: "10px 10px 0 0", position: "relative", bottom: -1,
                background: isActive ? tab.bg : "transparent",
                borderBottom: isActive ? `3px solid ${tab.color}` : "3px solid transparent",
                transition: "all 0.18s ease",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
                <span style={{ fontSize: 17, position: "relative" }}>
                  {tab.emoji}
                  {isDone && !isActive && (
                    <span style={{ position: "absolute", top: -3, right: -6, fontSize: 8, background: "#10B981", color: "#fff", borderRadius: "50%", width: 11, height: 11, display: "flex", alignItems: "center", justifyContent: "center" }}>✓</span>
                  )}
                </span>
                <span style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 700, fontSize: 11, color: isActive ? tab.color : isDone ? "#64748B" : "#94A3B8" }}>
                  {tab.label}
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Content area */}
      <div style={{ flex: 1, minHeight: 0, margin: "16px", borderRadius: 20, background: "#FFFFFF", border: "1.5px solid #E2E8F0", overflow: "hidden", display: "flex", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22 }}
            style={{ flex: 1, display: "flex", flexDirection: "column" }}
          >
            {activeTab === "blog"    && <BlogView    ref={blogViewRef} section={section} subject={subject} gradeLevel={gradeLevel} onViewed={() => markViewed("blog")}    viewed={viewed.has("blog")} onBlogStateChange={onBlogStateChange} />}
            {activeTab === "podcast" && <PodcastView section={section} subject={subject} gradeLevel={gradeLevel} onViewed={() => markViewed("podcast")} viewed={viewed.has("podcast")} />}
            {activeTab === "story"   && <StoryView   section={section} subject={subject} gradeLevel={gradeLevel} onViewed={() => markViewed("story")}   viewed={viewed.has("story")} />}
            {activeTab === "video"   && <VideoView />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
