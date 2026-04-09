import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#EEF0FF] relative overflow-hidden">
      {/* Decorative shapes */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-16 opacity-20">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <path d="M40 5 L55 25 L75 30 L60 50 L65 70 L40 60 L15 70 L20 50 L5 30 L25 25 Z" stroke="#6C47FF" strokeWidth="2" fill="none"/>
          </svg>
        </div>
        <div className="absolute bottom-40 left-12 opacity-30">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path d="M8 24 L24 8 L40 24 L24 40 Z" stroke="#4ADE80" strokeWidth="2.5" fill="none"/>
          </svg>
        </div>
        <div className="absolute top-1/3 right-16 opacity-15">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="28" stroke="#6C47FF" strokeWidth="2" strokeDasharray="6 4"/>
          </svg>
        </div>
      </div>

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-6xl mx-auto">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#6C47FF] rounded-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L14 6V10L8 14L2 10V6L8 2Z" fill="white"/>
            </svg>
          </div>
          <span className="font-black text-[#1a1a2e] text-lg tracking-tight">AI Decoder Academy</span>
        </Link>
        <div className="flex gap-3">
          <SignedOut>
            <Link href="/auth/sign-in" className="text-sm font-semibold text-[#1a1a2e] hover:text-[#6C47FF] transition-colors px-4 py-2">
              Log In
            </Link>
            <Link href="/auth/sign-up" className="text-sm font-semibold bg-[#6C47FF] text-white px-5 py-2.5 rounded-full hover:bg-[#5538ee] transition-colors shadow-md">
              Get Started
            </Link>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard/playground" className="text-sm font-semibold bg-[#6C47FF] text-white px-5 py-2.5 rounded-full hover:bg-[#5538ee] transition-colors shadow-md">
              Go to playground →
            </Link>
          </SignedIn>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 text-center px-8 pt-20 pb-24 max-w-4xl mx-auto">
        <div className="inline-block bg-white text-[#6C47FF] font-bold text-sm px-4 py-2 rounded-full mb-6 shadow-sm border border-purple-100">
          🚀 Safe AI learning for ages 5–16
        </div>
        <h1 className="text-6xl font-black text-[#1a1a2e] leading-tight mb-6">
          Learn anything with{" "}
          <span className="text-[#6C47FF]">your own AI tutor</span>
        </h1>
        <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10">
          Write stories, learn to code, explore science — your AI buddy remembers
          everything you&apos;ve built and grows with you.
        </p>
        <Link href="/auth/sign-up"
          className="inline-block bg-[#6C47FF] hover:bg-[#5538ee] text-white font-bold text-lg px-8 py-4 rounded-xl transition-all shadow-lg shadow-purple-300 active:scale-95">
          Start learning for free ✨
        </Link>
      </section>

      {/* Mode cards */}
      <section className="relative z-10 max-w-5xl mx-auto px-8 pb-24">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { emoji:"📖", label:"Story Builder",  bg:"bg-pink-50   border-pink-200",   text:"text-pink-600"   },
            { emoji:"💻", label:"Code Lab",        bg:"bg-blue-50   border-blue-200",   text:"text-blue-600"   },
            { emoji:"🎨", label:"Art Studio",      bg:"bg-yellow-50 border-yellow-200", text:"text-yellow-600" },
            { emoji:"🧠", label:"Quiz Zone",       bg:"bg-purple-50 border-purple-200", text:"text-purple-600" },
            { emoji:"🚀", label:"Free Explore",    bg:"bg-green-50  border-green-200",  text:"text-green-600"  },
          ].map((m) => (
            <div key={m.label} className={`${m.bg} border-2 text-center p-6 rounded-3xl hover:scale-105 transition-transform bg-white`}>
              <div className="text-4xl mb-2">{m.emoji}</div>
              <div className={`font-bold text-sm ${m.text}`}>{m.label}</div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}