"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, MoreHorizontal, Search, Plus, Folder, Star, Grid } from "lucide-react";
import { cn, formatDate, truncate } from "@/lib/utils";
import { AudioPlayer, type AudioData } from "@/components/playground/AudioPlayer";
import { SlideCarousel, type SlideData } from "@/components/playground/SlideCarousel";
import type { Creation, Project, OutputType } from "@/types";

const OUTPUT_TYPE_META: Record<OutputType, { label: string; color: string; icon: string }> = {
  text:   { label: "Text",   color: "bg-blue-50 text-blue-700 border-blue-200",    icon: "T"  },
  json:   { label: "JSON",   color: "bg-amber-50 text-amber-700 border-amber-200", icon: "{}" },
  image:  { label: "Image",  color: "bg-green-50 text-green-700 border-green-200", icon: "Img"},
  audio:  { label: "Audio",  color: "bg-pink-50 text-pink-700 border-pink-200",    icon: "♪"  },
  slides: { label: "Slides", color: "bg-purple-50 text-purple-700 border-purple-200", icon: "▦"},
  video:  { label: "Video",  color: "bg-red-50 text-red-700 border-red-200",       icon: "▶"  },
};

export default function ProgressPage() {
  const [creations, setCreations]         = useState<Creation[]>([]);
  const [projects, setProjects]           = useState<Project[]>([]);
  const [activeFilter, setActiveFilter]   = useState<string>("all");
  const [search, setSearch]               = useState("");
  const [loading, setLoading]             = useState(true);
  const [sort, setSort]                   = useState<"recent" | "oldest">("recent");
  const [newProjectName, setNewProjectName] = useState("");
  const [addingProject, setAddingProject] = useState(false);

  const fetchCreations = useCallback((filter = activeFilter, q = search, s = sort, showLoading = false) => {
    if (showLoading) setLoading(true);
    const params = new URLSearchParams();
    if (filter === "unorganized")            params.set("project_id", "unorganized");
    else if (filter.startsWith("project:"))  params.set("project_id", filter.replace("project:", ""));
    else if (filter !== "all" && filter !== "favourites") params.set("output_type", filter);
    if (q) params.set("search", q);

    fetch(`/api/creations?${params}`)
      .then(r => r.json())
      .then(({ creations }) => {
        let list: Creation[] = creations ?? [];
        if (filter === "favourites") list = list.filter((c) => c.is_favourite);
        if (s === "oldest") list = [...list].reverse();
        setCreations(list);
        setLoading(false);
      });
  }, [activeFilter, search, sort]);

  const fetchProjects = useCallback(() => {
    fetch("/api/projects")
      .then(r => r.json())
      .then(({ projects }) => setProjects(projects ?? []));
  }, []);

  // Initial load — fetch both in parallel, show loading only once
  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch("/api/creations").then(r => r.json()),
      fetch("/api/projects").then(r => r.json()),
    ]).then(([{ creations }, { projects }]) => {
      setCreations(creations ?? []);
      setProjects(projects ?? []);
      setLoading(false);
    });
  }, []); // eslint-disable-line

  // Filter/sort changes — no loading flash, instant swap
  useEffect(() => { fetchCreations(activeFilter, search, sort, false); }, [activeFilter, sort]); // eslint-disable-line

  const handleSearch = (q: string) => {
    setSearch(q);
    fetchCreations(activeFilter, q, sort);
  };

  const toggleFav = async (c: Creation) => {
    await fetch("/api/creations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: c.id, is_favourite: !c.is_favourite }),
    });
    setCreations(prev => prev.map(x => x.id === c.id ? { ...x, is_favourite: !x.is_favourite } : x));
  };

  const deleteCreation = async (id: string) => {
    await fetch("/api/creations", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    setCreations(prev => prev.filter(c => c.id !== id));
  };

  const moveToProject = async (id: string, projectId: string) => {
    // Optimistically remove from current view immediately
    setCreations(prev => {
      const updated = prev.map(c => c.id === id ? { ...c, project_id: projectId } : c);
      // If filtered by a specific project/unorganized, remove items that no longer belong
      if (activeFilter.startsWith("project:")) {
        const pid = activeFilter.replace("project:", "");
        return updated.filter(c => c.project_id === pid);
      }
      if (activeFilter === "unorganized") {
        return updated.filter(c => !c.project_id);
      }
      return updated;
    });

    // Persist to DB
    await fetch("/api/creations", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, project_id: projectId }),
    });

    // Refresh creations and project counts in sidebar
    fetchCreations(activeFilter, search, sort, false);
    fetchProjects();
  };

  const createProject = async () => {
    if (!newProjectName.trim()) { setAddingProject(false); return; }
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: newProjectName.trim() }),
    });
    const { project } = await res.json();
    if (project) setProjects(prev => [project, ...prev]);
    setNewProjectName(""); setAddingProject(false);
  };

  const navItems = [
    { id: "all",         label: "All Creations", icon: <Grid size={13}/> },
    { id: "unorganized", label: "Unorganized",   icon: <Folder size={13}/> },
    { id: "favourites",  label: "Favourites",    icon: <Star size={13}/> },
  ];

  return (
    <div className="flex bg-[#F5F6FF]" style={{height:"calc(100vh - 57px)"}}>

      {/* ── Left sidebar ── */}
      <aside className="w-56 bg-white border-r border-purple-100 flex flex-col py-5 flex-shrink-0">
        <div className="px-4 mb-5">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Library</p>
          <nav className="flex flex-col gap-1">
            {navItems.map(item => (
              <button key={item.id} onClick={() => setActiveFilter(item.id)}
                className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold transition-all text-left",
                  activeFilter === item.id
                    ? "bg-[#6C47FF] text-white"
                    : "text-slate-500 hover:bg-purple-50 hover:text-[#6C47FF]"
                )}>
                {item.icon} {item.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="px-4 flex-1 overflow-y-auto">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">My Projects</p>
            <button
              onClick={() => setAddingProject(true)}
              className="w-5 h-5 rounded flex items-center justify-center text-slate-400 hover:text-[#6C47FF] hover:bg-purple-50 transition-all"
            >
              <Plus size={12}/>
            </button>
          </div>

          {addingProject && (
            <input
              autoFocus
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter") createProject();
                if (e.key === "Escape") { setAddingProject(false); setNewProjectName(""); }
              }}
              onBlur={createProject}
              placeholder="Project name…"
              className="w-full px-3 py-1.5 rounded-lg border border-[#6C47FF] text-xs focus:outline-none mb-2 text-[#6C47FF] placeholder:text-purple-300"
            />
          )}

          <div className="flex flex-col gap-1">
            {projects.map(p => (
              <button key={p.id} onClick={() => setActiveFilter(`project:${p.id}`)}
                className={cn(
                  "flex items-center justify-between px-3 py-2 rounded-xl text-sm font-semibold transition-all",
                  activeFilter === `project:${p.id}`
                    ? "bg-[#6C47FF] text-white"
                    : "text-slate-500 hover:bg-purple-50 hover:text-[#6C47FF]"
                )}>
                <span className="flex items-center gap-2 truncate">
                  <Folder size={13} className="flex-shrink-0"/> 
                  <span className="truncate">{p.name}</span>
                </span>
                <span className={cn(
                  "text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ml-1",
                  activeFilter === `project:${p.id}` ? "bg-white/20 text-white" : "bg-slate-100 text-slate-400"
                )}>
                  {p.creation_count ?? 0}
                </span>
              </button>
            ))}
            {projects.length === 0 && !addingProject && (
              <p className="text-xs text-slate-400 px-1 py-1">No projects yet</p>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top bar */}
        <div className="bg-white border-b border-purple-100 px-6 py-3.5 flex items-center gap-3 shadow-sm flex-shrink-0">
          <div className="relative max-w-xs w-full">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"/>
            <input
              value={search}
              onChange={e => handleSearch(e.target.value)}
              placeholder="Search your library..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#6C47FF] focus:ring-2 focus:ring-purple-100 transition-all placeholder:text-slate-300"
            />
          </div>

          <button
            onClick={() => setAddingProject(true)}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-purple-200 text-[#6C47FF] font-bold text-sm hover:bg-[#EEF0FF] transition-all flex-shrink-0"
          >
            <Plus size={14}/> New Project
          </button>

          <div className="ml-auto">
            <select
              value={sort}
              onChange={e => setSort(e.target.value as "recent" | "oldest")}
              className="text-xs font-bold text-[#6C47FF] bg-[#EEF0FF] border border-purple-200 rounded-lg px-3 py-1.5 focus:outline-none cursor-pointer"
            >
              <option value="recent">Recent First</option>
              <option value="oldest">Oldest First</option>
            </select>
          </div>
        </div>

        {/* Page heading */}
        <div className="px-6 pt-5 pb-3 flex-shrink-0">
          <h1 className="font-black text-2xl text-[#1a1a2e]">My Creations</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {loading
              ? "Loading…"
              : `Displaying ${creations.length} interactive creation${creations.length !== 1 ? "s" : ""} saved to your academy library.`
            }
          </p>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto px-6 pb-8">
          {loading ? (
            <div className="grid grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="bg-white rounded-2xl border border-purple-100 h-52 animate-pulse"/>
              ))}
            </div>
          ) : creations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="text-5xl mb-4 animate-float">🎨</div>
              <h3 className="font-bold text-lg text-slate-600 mb-1">Nothing here yet!</h3>
              <p className="text-slate-400 text-sm">
                Save AI responses from the playground to build your library.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {creations.map((creation, i) => (
                <CreationCard
                  key={creation.id}
                  creation={creation}
                  index={i}
                  projects={projects}
                  onToggleFav={() => toggleFav(creation)}
                  onDelete={() => deleteCreation(creation.id)}
                  onMoveToProject={(pid) => moveToProject(creation.id, pid)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="text-center py-3 text-xs text-slate-400 border-t border-purple-100 bg-white flex-shrink-0">
          Keep creating! Every interaction is a step toward mastering AI.
        </div>
      </div>
    </div>
  );
}

function CreationPreview({ creation }: { creation: Creation }) {
  const { output_type, content } = creation;

  if (output_type === "image") {
    const isUrl = /^https?:\/\//i.test(content.trim());
    if (isUrl) return (
      <div className="flex-1 flex items-center justify-center overflow-hidden rounded-lg">
        <img src={content.trim()} alt={creation.title}
          className="w-full h-full object-cover rounded-lg" />
      </div>
    );
  }

  if (output_type === "audio") {
    try {
      const data = JSON.parse(content) as AudioData;
      if (data?.url) return (
        <div className="flex-1 flex items-center justify-center w-full overflow-hidden scale-90 origin-top">
          <div className="w-full">
            <AudioPlayer data={data} />
          </div>
        </div>
      );
    } catch { /* fall through */ }
  }

  if (output_type === "slides") {
    try {
      const data = JSON.parse(content) as SlideData;
      if (data?.sections) return (
        <div className="flex-1 w-full overflow-hidden scale-[0.85] origin-top-left" style={{width:"117%"}}>
          <SlideCarousel data={data} />
        </div>
      );
    } catch { /* fall through */ }
  }

  if (output_type === "json") return (
    <pre className="text-[10px] font-mono text-amber-700 leading-relaxed overflow-hidden line-clamp-3">
      {truncate(content, 120)}
    </pre>
  );

  // Default: plain text
  return (
    <p className="text-xs text-slate-500 leading-relaxed italic line-clamp-3">
      {truncate(content.replace(/[#*`]/g, ""), 140)}
    </p>
  );
}

function CreationCard({
  creation, index, projects, onToggleFav, onDelete, onMoveToProject,
}: {
  creation: Creation;
  index: number;
  projects: Project[];
  onToggleFav: () => void;
  onDelete: () => void;
  onMoveToProject: (projectId: string) => void;
}) {
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [moveOpen,    setMoveOpen]    = useState(false);
  const [projSearch,  setProjSearch]  = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const meta = OUTPUT_TYPE_META[creation.output_type] ?? OUTPUT_TYPE_META.text;
  const filteredProjects = projects.filter(p =>
    p.name.toLowerCase().includes(projSearch.toLowerCase())
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setMoveOpen(false);
        setProjSearch("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3) }}
      className="bg-white rounded-2xl border border-purple-100 hover:shadow-md transition-shadow group relative"
    >
      {/* Preview area */}
      <div className="min-h-36 bg-slate-50 border-b border-purple-100 p-3 flex flex-col gap-2 relative">
        <div className="flex items-center justify-between">
          <span className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold border", meta.color)}>
            <span className="font-mono">{meta.icon}</span> {meta.label}
          </span>

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => { setMenuOpen(!menuOpen); setMoveOpen(false); }}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:bg-slate-200 transition-all opacity-0 group-hover:opacity-100"
            >
              <MoreHorizontal size={14}/>
            </button>
            <AnimatePresence>
              {menuOpen && !moveOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-purple-100 py-1 z-50 w-48"
                >
                  <button
                    onClick={() => { navigator.clipboard.writeText(creation.content); setMenuOpen(false); }}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-purple-50 hover:text-[#6C47FF] transition-colors"
                  >
                    Copy content
                  </button>
                  <button
                    onClick={() => setMoveOpen(true)}
                    className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-purple-50 hover:text-[#6C47FF] transition-colors flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Folder size={12}/> Move to project
                    </span>
                    <span className="text-slate-300">›</span>
                  </button>
                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      onClick={() => { onDelete(); setMenuOpen(false); }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </motion.div>
              )}

              {/* Move to project panel */}
              {menuOpen && moveOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.92, y: -4 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.92, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute right-0 top-full mt-1 bg-white rounded-xl shadow-lg border border-purple-100 z-50 w-56"
                >
                  {/* Header */}
                  <div className="flex items-center gap-2 px-3 py-2.5 border-b border-slate-100">
                    <button onClick={() => setMoveOpen(false)} className="text-slate-400 hover:text-[#6C47FF]">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M8 2L4 6l4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </button>
                    <span className="text-xs font-bold text-slate-700">Move to project</span>
                  </div>

                  {/* Search */}
                  <div className="px-3 py-2 border-b border-slate-100">
                    <div className="relative">
                      <Search size={11} className="absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"/>
                      <input
                        autoFocus
                        value={projSearch}
                        onChange={e => setProjSearch(e.target.value)}
                        placeholder="Search projects..."
                        className="w-full pl-6 pr-2 py-1.5 text-xs rounded-lg border border-slate-200 focus:outline-none focus:border-[#6C47FF] placeholder:text-slate-300"
                      />
                    </div>
                  </div>

                  {/* Project list */}
                  <div className="py-1 max-h-40 overflow-y-auto">
                    {/* None option */}
                    <button
                      onClick={() => { onMoveToProject(""); setMenuOpen(false); setMoveOpen(false); setProjSearch(""); }}
                      className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-purple-50 hover:text-[#6C47FF] transition-colors flex items-center gap-2"
                    >
                      <div className="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center">
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                          <path d="M5 2v6M2 5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </div>
                      Move to My Creations
                    </button>

                    {filteredProjects.map((p, pi) => (
                      <button key={p.id}
                        onClick={() => { onMoveToProject(p.id); setMenuOpen(false); setMoveOpen(false); setProjSearch(""); }}
                        className="w-full text-left px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-purple-50 hover:text-[#6C47FF] transition-colors flex items-center gap-2"
                      >
                        <div className={cn(
                          "w-5 h-5 rounded-md flex items-center justify-center",
                          ["bg-purple-100","bg-green-100","bg-amber-100","bg-blue-100","bg-pink-100"][pi % 5]
                        )}>
                          <Folder size={10} className={["text-purple-600","text-green-600","text-amber-600","text-blue-600","text-pink-600"][pi % 5]}/>
                        </div>
                        {p.name}
                        <span className="ml-auto text-[10px] text-slate-300">{p.creation_count ?? 0}</span>
                      </button>
                    ))}

                    {filteredProjects.length === 0 && projSearch && (
                      <p className="text-xs text-slate-400 text-center py-3">No projects found</p>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Content preview */}
        <CreationPreview creation={creation} />
      </div>

      {/* Footer */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1.5">
          <h3 className="font-bold text-sm text-[#1a1a2e] leading-snug">{creation.title}</h3>
          <button
            onClick={onToggleFav}
            className={cn(
              "flex-shrink-0 transition-all mt-0.5",
              creation.is_favourite ? "text-red-400" : "text-slate-300 hover:text-red-400"
            )}
          >
            <Heart size={14} fill={creation.is_favourite ? "currentColor" : "none"}/>
          </button>
        </div>

        <p className="text-[10px] text-slate-400 mb-2">{formatDate(creation.created_at)}</p>

        {creation.prompt_used && (
          <div className="bg-slate-50 rounded-lg p-2.5 border border-slate-100">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Prompt</p>
            <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2">
              {truncate(creation.prompt_used, 80)}
            </p>
          </div>
        )}
      </div>
    </motion.div>
  );
}