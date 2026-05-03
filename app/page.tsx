import Link from "next/link";

const ARENAS = [
  { emoji: "🚀", name: "AI Explorer",  week: "Week 1", accent: "#7C3AED", dim: "rgba(124,58,237,0.15)", glow: "rgba(124,58,237,0.4)" },
  { emoji: "⚡", name: "Prompt Lab",   week: "Week 2", accent: "#00D4FF", dim: "rgba(0,212,255,0.12)",  glow: "rgba(0,212,255,0.4)"  },
  { emoji: "📝", name: "Script Lab",   week: "Week 3", accent: "#FF6B2B", dim: "rgba(255,107,43,0.14)", glow: "rgba(255,107,43,0.4)" },
  { emoji: "🖼️", name: "Image Module", week: "Week 4", accent: "#00FF94", dim: "rgba(0,255,148,0.12)",  glow: "rgba(0,255,148,0.4)"  },
  { emoji: "🎵", name: "Audio Fusion", week: "Week 5", accent: "#FF2D78", dim: "rgba(255,45,120,0.14)", glow: "rgba(255,45,120,0.4)" },
  { emoji: "🛹", name: "Slide Skate",  week: "Week 6", accent: "#C8FF00", dim: "rgba(200,255,0,0.12)",  glow: "rgba(200,255,0,0.4)"  },
  { emoji: "🎬", name: "Video Fusion", week: "Week 7", accent: "#FF6D00", dim: "rgba(255,109,0,0.14)",  glow: "rgba(255,109,0,0.4)"  },
];

const FEATURES = [
  { icon: "✍️", title: "Write stories",      desc: "AI co-writes narratives in any genre — fantasy, sci-fi, mystery." },
  { icon: "🖼️", title: "Generate images",    desc: "Describe a scene and watch it appear in seconds with flux-pro." },
  { icon: "🎙️", title: "Create audio",       desc: "Multi-character dialogue with real neural voices via AWS Polly." },
  { icon: "📊", title: "Build slide decks",  desc: "AI structures your ideas into illustrated presentation slides." },
  { icon: "⚡", title: "Master prompting",   desc: "Learn to control AI output with precision and creativity." },
  { icon: "🏆", title: "Earn trophies",      desc: "XP, streaks, badges and 6 arenas to unlock as you level up." },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#08080F] text-white relative overflow-hidden">

      {/* ── Ambient background ───────────────────────────────────────────── */}
      <div aria-hidden className="absolute inset-0 pointer-events-none">
        {/* Nebula orbs */}
        <div className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(124,58,237,0.18) 0%, transparent 65%)", filter: "blur(60px)" }}/>
        <div className="absolute top-1/2 -right-48 w-[500px] h-[500px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(0,212,255,0.12) 0%, transparent 65%)", filter: "blur(80px)" }}/>
        <div className="absolute -bottom-32 left-1/3 w-[450px] h-[450px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(255,45,120,0.10) 0%, transparent 65%)", filter: "blur(70px)" }}/>
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}/>
        {/* Stars */}
        {[
          [12,8],[88,15],[34,42],[72,28],[55,75],[20,62],[91,55],[44,18],[67,88],[8,82],
          [78,38],[50,50],[25,30],[95,70],[38,95],
        ].map(([x, y], i) => (
          <div key={i} className="absolute w-px h-px rounded-full bg-white"
            style={{ left: `${x}%`, top: `${y}%`, opacity: 0.3 + (i % 4) * 0.15 }}/>
        ))}
      </div>

      {/* ── Nav ─────────────────────────────────────────────────────────── */}
      <nav className="relative z-10 flex items-center justify-between px-6 sm:px-10 py-5 max-w-7xl mx-auto">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center font-display font-black text-sm"
            style={{ background: "linear-gradient(135deg, #7C3AED, #5B21B6)", boxShadow: "0 0 20px rgba(124,58,237,0.5)" }}>
            <span style={{ color: "#C8FF00" }}>AI</span>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="font-display font-black text-white text-lg leading-none">AI</span>
            <span className="font-display font-black text-lg leading-none" style={{ color: "#7C3AED" }}>Decoder</span>
            <span className="font-display font-black text-white text-lg leading-none">Academy</span>
          </div>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/auth/sign-in"
            className="text-sm font-semibold text-white/60 hover:text-white transition-colors px-4 py-2 rounded-xl hover:bg-white/[0.06]">
            Log in
          </Link>
          <Link href="/auth/sign-up"
            className="text-sm font-bold px-5 py-2.5 rounded-xl transition-all hover:scale-[1.03] active:scale-95"
            style={{ background: "#7C3AED", boxShadow: "0 0 20px rgba(124,58,237,0.4)", color: "#fff" }}>
            Get Started →
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative z-10 text-center px-6 sm:px-10 pt-16 sm:pt-24 pb-20 max-w-5xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8 border text-sm font-bold"
          style={{ background: "rgba(124,58,237,0.12)", borderColor: "rgba(124,58,237,0.35)", color: "#7C3AED" }}>
          🚀 Safe AI learning for ages 11–16
        </div>

        <h1 className="font-display font-black text-5xl sm:text-7xl leading-[1.02] mb-6 tracking-tight">
          Learn anything with{" "}
          <span className="relative inline-block"
            style={{ background: "linear-gradient(135deg, #7C3AED, #00D4FF, #FF2D78)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
            your own AI tutor
          </span>
        </h1>

        <p className="text-lg sm:text-xl text-white/55 max-w-2xl mx-auto mb-10 leading-relaxed">
          Write stories, generate images, create audio scenes — unlock <strong className="text-white/80">7 immersive arenas</strong> as you level up through a 7-week AI curriculum.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href="/auth/sign-up"
            className="inline-flex items-center gap-2 font-display font-black text-base px-8 py-4 rounded-xl transition-all hover:scale-[1.03] active:scale-95"
            style={{ background: "linear-gradient(135deg, #7C3AED, #5B21B6)", boxShadow: "0 0 40px rgba(124,58,237,0.5)", color: "#fff" }}>
            Start learning for free ✨
          </Link>
          <Link href="/auth/sign-in"
            className="inline-flex items-center gap-2 font-semibold text-sm px-6 py-4 rounded-xl border border-white/[0.12] text-white/60 hover:text-white hover:border-white/25 transition-all">
            Already a member? Log in →
          </Link>
        </div>

        {/* XP bar teaser */}
        <div className="mt-12 flex items-center justify-center gap-3 text-xs font-mono text-white/30">
          <span>Lv 1</span>
          <div className="w-48 h-1.5 rounded-full bg-white/[0.08] overflow-hidden">
            <div className="h-full w-2/5 rounded-full" style={{ background: "#7C3AED", boxShadow: "0 0 8px rgba(124,58,237,0.6)" }}/>
          </div>
          <span>Lv 2 · Prompt Lab</span>
        </div>
      </section>

      {/* ── Arena cards ─────────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 pb-20">
        <div className="text-center mb-10">
          <h2 className="font-display font-black text-2xl sm:text-3xl text-white mb-2">7 Worlds to explore</h2>
          <p className="text-white/40 text-sm">Complete each arena's objectives to unlock the next — new environment, new tools, new superpowers.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {ARENAS.map((a, i) => {
            const locked = i > 0;
            return (
              <div key={a.name}
                className="relative rounded-2xl p-4 text-center border overflow-hidden group transition-all hover:-translate-y-1 hover:scale-[1.02]"
                style={{
                  background: locked
                    ? "rgba(10,8,22,0.6)"
                    : `linear-gradient(135deg, ${a.dim}, rgba(15,15,26,0.8))`,
                  borderColor: locked ? "rgba(255,255,255,0.06)" : `${a.accent}30`,
                  boxShadow: locked ? "none" : `0 8px 32px -8px ${a.glow}`,
                }}>
                {/* Accent top stripe — hidden when locked */}
                {!locked && (
                  <div className="absolute top-0 left-0 right-0 h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${a.accent}, transparent)` }}/>
                )}

                <div className="text-3xl mb-2 mt-1" style={{ filter: locked ? "grayscale(1) opacity(0.35)" : "none" }}>
                  {a.emoji}
                </div>
                <div className="font-display font-black text-[11px] leading-tight mb-0.5"
                  style={{ color: locked ? "rgba(255,255,255,0.2)" : a.accent }}>
                  {a.name}
                </div>
                <div className="text-[9px] font-mono text-white/20 uppercase tracking-wider">{a.week}</div>

                {/* Transparent lock overlay */}
                {locked && (
                  <div className="absolute inset-0 rounded-2xl flex flex-col items-center justify-center gap-1"
                    style={{ background: "rgba(6,4,18,0.55)", backdropFilter: "blur(1px)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <span className="text-[8px] font-mono text-white/20">
                      {i === 1 ? "Complete Arena 1" : `Complete Week ${i}`}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Features grid ───────────────────────────────────────────────── */}
      <section className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 pb-24">
        <div className="text-center mb-10">
          <h2 className="font-display font-black text-2xl sm:text-3xl text-white mb-2">Everything you need to create with AI</h2>
          <p className="text-white/40 text-sm">Real AI tools — not toy versions. The same tech the pros use.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map(f => (
            <div key={f.title}
              className="rounded-2xl p-5 border border-white/[0.07] hover:border-white/[0.14] transition-all group"
              style={{ background: "rgba(255,255,255,0.03)" }}>
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-display font-black text-white text-base mb-1.5">{f.title}</h3>
              <p className="text-sm text-white/45 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA footer ──────────────────────────────────────────────────── */}
      <section className="relative z-10 text-center px-6 pb-24">
        <div className="inline-block max-w-2xl mx-auto rounded-3xl p-10 border"
          style={{
            background: "linear-gradient(135deg, rgba(124,58,237,0.18), rgba(15,15,26,0.9))",
            borderColor: "rgba(124,58,237,0.3)",
            boxShadow: "0 0 80px rgba(124,58,237,0.2)",
          }}>
          <h2 className="font-display font-black text-3xl sm:text-4xl text-white mb-3">
            Ready to decode AI?
          </h2>
          <p className="text-white/50 mb-7 text-sm">Free to start. No credit card required. Safe for students.</p>
          <Link href="/auth/sign-up"
            className="inline-flex items-center gap-2 font-display font-black text-base px-8 py-4 rounded-xl transition-all hover:scale-[1.04] active:scale-95"
            style={{ background: "#7C3AED", boxShadow: "0 0 40px rgba(124,58,237,0.5)", color: "#fff" }}>
            Create free account 🚀
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="relative z-10 text-center py-6 border-t border-white/[0.06] text-xs text-white/25">
        © 2026 AI Decoder Academy · Safe AI for students aged 11–16 · Teacher accounts available
      </footer>
    </main>
  );
}
