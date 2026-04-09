"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Download, BookmarkPlus } from "lucide-react";
import { cn } from "@/lib/utils";

interface Scene {
  scene_id:    string;
  scene_goal:  string;
  imageBase64?: string;
}

interface Section {
  title:    string;
  concepts: string[];
  scenes:   Scene[];
}

export interface SlideData {
  title:    string;
  subject?: string;
  sections: Section[];
  pptBase64: string;
}

interface Props {
  data:    SlideData;
  onSave?: () => void;
}

// Build flat slide list matching the PPTX structure
function buildSlides(data: SlideData) {
  const slides: { type: "title" | "section" | "scene"; data: unknown }[] = [];

  // Title slide
  slides.push({ type: "title", data });

  // Section + scene slides
  for (const section of data.sections) {
    slides.push({ type: "section", data: section });
    for (const scene of section.scenes) {
      slides.push({ type: "scene", data: { scene, sectionTitle: section.title } });
    }
  }
  return slides;
}

function TitleSlide({ data }: { data: SlideData }) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#F5F6FF] relative">
      <div className="absolute top-0 left-0 right-0 h-1.5 bg-[#6C47FF]"/>
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-[#6C47FF]"/>
      <p className="text-xs font-bold text-[#6C47FF] uppercase tracking-widest mb-3">
        {data.subject}
      </p>
      <h1 className="text-3xl font-black text-[#1a1a2e] text-center px-8 mb-4 leading-tight">
        {data.title}
      </h1>
      <p className="text-xs text-slate-400">Created with AI Decoder Academy</p>
    </div>
  );
}

function SectionSlide({ section }: { section: Section }) {
  return (
    <div className="w-full h-full flex bg-white relative overflow-hidden">
      <div className="w-2 bg-[#6C47FF] flex-shrink-0"/>
      <div className="flex-1 bg-[#EEF0FF] flex flex-col justify-center px-10">
        <h2 className="text-2xl font-black text-[#1a1a2e] mb-4 leading-tight">
          {section.title}
        </h2>
        <div className="w-16 h-0.5 bg-[#6C47FF] mb-4"/>
        {section.concepts.length > 0 && (
          <div>
            <p className="text-xs font-bold text-[#6C47FF] uppercase tracking-widest mb-3">
              Key concepts
            </p>
            <ul className="space-y-2">
              {section.concepts.slice(0, 6).map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#6C47FF] flex-shrink-0 mt-1.5"/>
                  {c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function SceneSlide({ scene, sectionTitle }: { scene: Scene; sectionTitle: string }) {
  return (
    <div className="w-full h-full flex flex-col bg-black">
      {/* Header bar */}
      <div className="bg-[#1a1a2e] px-5 py-3 flex-shrink-0">
        <p className="text-white text-sm font-bold leading-snug">
          Scene goal: {scene.scene_goal}
        </p>
      </div>
      {/* Image */}
      <div className="flex-1 relative overflow-hidden">
        {scene.imageBase64 ? (
          <img
            src={`data:image/png;base64,${scene.imageBase64}`}
            alt={scene.scene_goal}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <p className="text-slate-500 text-sm">Image not available</p>
          </div>
        )}
      </div>
    </div>
  );
}

export function SlideCarousel({ data, onSave }: Props) {
  const slides   = buildSlides(data);
  const [current, setCurrent] = useState(0);

  const prev = () => setCurrent(i => Math.max(0, i - 1));
  const next = () => setCurrent(i => Math.min(slides.length - 1, i + 1));

  const handleDownload = () => {
    const bytes  = Uint8Array.from(atob(data.pptBase64), c => c.charCodeAt(0));
    const blob   = new Blob([bytes], {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
    const url    = URL.createObjectURL(blob);
    const a      = document.createElement("a");
    a.href       = url;
    a.download   = `${data.title.replace(/[^a-z0-9]/gi, "_")}.pptx`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const slide = slides[current];

  return (
    <div className="w-full rounded-2xl overflow-hidden border border-purple-100 shadow-sm bg-white">
      {/* Slide viewport — 16:9 ratio */}
      <div className="relative w-full" style={{ paddingBottom: "56.25%" }}>
        <div className="absolute inset-0">
          {slide.type === "title"   && <TitleSlide   data={data} />}
          {slide.type === "section" && <SectionSlide section={slide.data as Section} />}
          {slide.type === "scene"   && (
            <SceneSlide
              scene={(slide.data as { scene: Scene }).scene}
              sectionTitle={(slide.data as { sectionTitle: string }).sectionTitle}
            />
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-purple-100 bg-white">
        {/* Prev / slide counter / Next */}
        <div className="flex items-center gap-3">
          <button
            onClick={prev} disabled={current === 0}
            className="p-1.5 rounded-lg hover:bg-purple-50 text-slate-400 hover:text-[#6C47FF] disabled:opacity-30 transition-all"
          >
            <ChevronLeft size={18}/>
          </button>

          <div className="flex gap-1">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={cn(
                  "rounded-full transition-all",
                  i === current
                    ? "w-5 h-2 bg-[#6C47FF]"
                    : "w-2 h-2 bg-slate-200 hover:bg-purple-300"
                )}
              />
            ))}
          </div>

          <button
            onClick={next} disabled={current === slides.length - 1}
            className="p-1.5 rounded-lg hover:bg-purple-50 text-slate-400 hover:text-[#6C47FF] disabled:opacity-30 transition-all"
          >
            <ChevronRight size={18}/>
          </button>

          <span className="text-xs text-slate-400 ml-1">
            {current + 1} / {slides.length}
          </span>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          {onSave && (
            <button
              onClick={onSave}
              className="flex items-center gap-1.5 text-xs font-bold text-[#6C47FF] hover:bg-[#EEF0FF] px-3 py-1.5 rounded-lg transition-all"
            >
              <BookmarkPlus size={14}/> Save to Creations
            </button>
          )}
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 text-xs font-bold bg-[#6C47FF] text-white px-3 py-1.5 rounded-lg hover:bg-[#5538ee] transition-all shadow-sm shadow-purple-200"
          >
            <Download size={14}/> Download PPTX
          </button>
        </div>
      </div>
    </div>
  );
}