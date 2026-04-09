"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { cn, INTEREST_OPTIONS } from "@/lib/utils";
import type { AgeGroup } from "@/types";

const BOARDS = ["CBSE", "ICSE", "State Board"];
const GRADES = ["6", "7", "8", "9", "10", "11", "12"];

// Default avatar based on first letter of name
function getDefaultAvatar(name: string): string {
  const initials: Record<string, string> = {
    a:"🦁", b:"🐻", c:"🐱", d:"🐶", e:"🦅",
    f:"🦊", g:"🦍", h:"🐹", i:"🦔", j:"🐯",
    k:"🦘", l:"🦁", m:"🐭", n:"🦎", o:"🦉",
    p:"🐼", q:"🦆", r:"🐰", s:"🐍", t:"🐯",
    u:"🦄", v:"🦅", w:"🐺", x:"🦖", y:"🦚", z:"🦓",
  };
  const first = name?.charAt(0).toLowerCase() ?? "s";
  return initials[first] ?? "🚀";
}

function gradeToAgeGroup(grade: string): AgeGroup {
  const g = parseInt(grade);
  if (g <= 5)  return "5-7";
  if (g <= 7)  return "8-10";
  if (g <= 10) return "11-13";
  return "14+";
}

function isProfileComplete(profile: Record<string, unknown>): boolean {
  return !!(profile.display_name && profile.age_group);
}

const STEPS = ["Your photo", "Academic profile"];

export default function ProfilePage() {
  const router   = useRouter();
  const { user } = useUser();

  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [step,         setStep]         = useState(0);
  const [board,        setBoard]        = useState("CBSE");
  const [grade,        setGrade]        = useState("8");
  const [interests,    setInterests]    = useState<string[]>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile,    setPhotoFile]    = useState<File | null>(null);

  const displayName = user?.firstName ?? user?.username ?? "Explorer";
  const defaultAvatar = getDefaultAvatar(displayName);
  // Use Clerk profile image if available
  const clerkPhoto = user?.imageUrl && !user.imageUrl.includes("gravatar") ? user.imageUrl : null;

  useEffect(() => {
    fetch("/api/profile")
      .then(r => r.ok ? r.json() : { profile: null })
      .then(({ profile }) => {
        if (profile && isProfileComplete(profile)) {
          router.replace("/dashboard/playground");
        } else {
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  }, [router]);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const toggleInterest = (i: string) =>
    setInterests(prev =>
      prev.includes(i) ? prev.filter(x => x !== i) : prev.length < 8 ? [...prev, i] : prev
    );

  const handleSave = async () => {
    setSaving(true);

    // Upload photo to Supabase storage if provided
    let avatarUrl: string | null = null;
    if (photoFile) {
      const formData = new FormData();
      formData.append("file", photoFile);
      const res = await fetch("/api/profile/photo", { method: "POST", body: formData });
      if (res.ok) {
        const { url } = await res.json();
        avatarUrl = url;
      }
    }

    await fetch("/api/profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        display_name: displayName,
        avatar_emoji: defaultAvatar,
        avatar_url:   avatarUrl ?? clerkPhoto ?? null,
        age_group:    gradeToAgeGroup(grade),
        interests,
      }),
    });
    router.push("/dashboard/playground");
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center bg-[#F5F6FF]" style={{ height: "calc(100vh - 57px)" }}>
        <div className="flex gap-2">
          {[0,1,2].map(i => <div key={i} className="dot w-3 h-3 rounded-full bg-[#6C47FF]" />)}
        </div>
      </div>
    );
  }

  // Display photo: user-uploaded > Clerk photo > default emoji
  const displayPhoto = photoPreview ?? clerkPhoto;

  return (
    <div className="min-h-full bg-[#F5F6FF] flex items-center justify-center p-8">
      <div className="w-full max-w-lg">
        {/* Progress dots */}
        <div className="flex gap-2 justify-center mb-8">
          {STEPS.map((_, i) => (
            <div key={i} className={cn(
              "h-2 rounded-full transition-all duration-300",
              i === step ? "w-8 bg-[#6C47FF]" : i < step ? "w-2 bg-purple-300" : "w-2 bg-slate-200"
            )} />
          ))}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-3xl shadow-sm border border-purple-100 overflow-hidden"
          >
            <div className="px-8 pt-7 pb-5 border-b border-slate-100">
              <span className="text-xs font-bold bg-[#6C47FF] text-white px-3 py-1 rounded-full">
                STEP {step + 1}/{STEPS.length}
              </span>
              <h1 className="text-2xl font-black text-[#1a1a2e] mb-1 mt-3">
                {step === 0 ? `Welcome, ${displayName}! 👋` : "Your academic profile"}
              </h1>
              <p className="text-sm text-slate-500">
                {step === 0
                  ? "Add a profile photo (optional) — or we'll pick one for you."
                  : "Help us personalise your AI learning experience."
                }
              </p>
            </div>

            <div className="px-8 py-6">
              {/* Step 0 — Photo upload */}
              {step === 0 && (
                <div className="flex flex-col items-center gap-6">
                  {/* Avatar preview */}
                  <div className="relative">
                    <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-purple-100 bg-[#EEF0FF] flex items-center justify-center">
                      {displayPhoto ? (
                        <img src={displayPhoto} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-5xl">{defaultAvatar}</span>
                      )}
                    </div>
                    {/* Upload button overlay */}
                    <label className="absolute bottom-0 right-0 w-9 h-9 bg-[#6C47FF] rounded-full flex items-center justify-center cursor-pointer hover:bg-[#5538ee] transition-all shadow-lg">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 3v10M3 8l5-5 5 5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    </label>
                  </div>

                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700">
                      {displayPhoto ? "Looking great! 🎉" : `We'll use ${defaultAvatar} for now`}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {displayPhoto
                        ? "You can change this anytime in your profile settings."
                        : "Upload a photo to personalise your account, or skip to continue."}
                    </p>
                  </div>

                  {/* Show Clerk photo info if applicable */}
                  {clerkPhoto && !photoPreview && (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-xs text-green-700 font-medium">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                        <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5"/>
                        <path d="M4.5 7l2 2 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Using your Google profile photo
                    </div>
                  )}
                </div>
              )}

              {/* Step 1 — Board + Grade + Interests */}
              {step === 1 && (
                <div className="space-y-5">
                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                      Education Board
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {BOARDS.map(b => (
                        <button key={b} type="button" onClick={() => setBoard(b)}
                          className={cn("px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all",
                            board === b
                              ? "bg-[#6C47FF] text-white border-[#6C47FF]"
                              : "border-slate-200 text-slate-600 hover:border-[#6C47FF]"
                          )}>
                          {b}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                      Current Grade / Class
                    </label>
                    <div className="flex gap-2 flex-wrap">
                      {GRADES.map(g => (
                        <button key={g} type="button" onClick={() => setGrade(g)}
                          className={cn("w-12 h-12 rounded-xl text-sm font-bold border-2 transition-all",
                            grade === g
                              ? "bg-white border-[#4ADE80] text-green-700 shadow-sm"
                              : "border-slate-200 text-slate-600 hover:border-slate-300"
                          )}>
                          {g}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">Helps us customise your AI learning modules.</p>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                      Interests <span className="text-slate-300 normal-case font-normal">(pick up to 8)</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {INTEREST_OPTIONS.map(interest => (
                        <button key={interest} type="button" onClick={() => toggleInterest(interest)}
                          className={cn("px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all",
                            interests.includes(interest)
                              ? "border-[#6C47FF] bg-[#6C47FF] text-white"
                              : "border-slate-200 text-slate-600 hover:border-[#6C47FF]"
                          )}>
                          {interest}
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-slate-400 mt-2">{interests.length}/8 selected</p>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex gap-3 mt-8">
                {step > 0 && (
                  <button onClick={() => setStep(s => s - 1)}
                    className="flex-1 border-2 border-purple-200 text-[#6C47FF] font-bold py-3.5 rounded-xl hover:bg-purple-50 transition-all">
                    ← Back
                  </button>
                )}
                {step < STEPS.length - 1 ? (
                  <button onClick={() => setStep(s => s + 1)}
                    className="flex-1 bg-[#6C47FF] hover:bg-[#5538ee] text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-purple-200">
                    Next →
                  </button>
                ) : (
                  <button onClick={handleSave} disabled={saving}
                    className="flex-1 bg-[#6C47FF] hover:bg-[#5538ee] text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-purple-200 disabled:opacity-60">
                    {saving ? "Setting up…" : "Let's go! 🚀"}
                  </button>
                )}
              </div>

              {step === 0 && (
                <button onClick={() => setStep(1)}
                  className="w-full text-center text-xs text-slate-400 hover:text-slate-600 mt-4 transition-colors">
                  Skip photo →
                </button>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}