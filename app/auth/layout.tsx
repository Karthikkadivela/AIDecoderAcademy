import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#EEF0FF] relative overflow-hidden flex flex-col">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-16 left-12 opacity-20">
          <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
            <path d="M40 5 L55 25 L75 30 L60 50 L65 70 L40 60 L15 70 L20 50 L5 30 L25 25 Z"
              stroke="#6C47FF" strokeWidth="2" fill="none"/>
          </svg>
        </div>
        <div className="absolute bottom-32 left-8 opacity-30">
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            <path d="M8 24 L24 8 L40 24 L24 40 Z" stroke="#4ADE80" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
            <path d="M16 24 L24 16 L32 24 L24 32 Z" fill="#4ADE80" opacity="0.4"/>
          </svg>
        </div>
        <div className="absolute top-1/3 right-8 opacity-15">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="28" stroke="#6C47FF" strokeWidth="2" strokeDasharray="6 4"/>
            <circle cx="32" cy="32" r="16" stroke="#6C47FF" strokeWidth="1.5" strokeDasharray="4 3"/>
          </svg>
        </div>
        <div className="absolute bottom-16 right-12 opacity-20">
          <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
            <rect x="8" y="8" width="40" height="40" rx="8" stroke="#6C47FF" strokeWidth="2" fill="none"/>
            <rect x="18" y="18" width="20" height="20" rx="4" stroke="#6C47FF" strokeWidth="1.5" fill="none"/>
          </svg>
        </div>
      </div>

      <nav className="relative z-10 flex items-center justify-between px-8 py-5 max-w-6xl mx-auto w-full">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[#6C47FF] rounded-lg flex items-center justify-center">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2L14 6V10L8 14L2 10V6L8 2Z" fill="white"/>
            </svg>
          </div>
          <span className="font-bold text-[#1a1a2e] text-lg tracking-tight">AI Decoder Academy</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/auth/sign-in" className="text-sm font-semibold text-[#1a1a2e] hover:text-[#6C47FF] transition-colors px-4 py-2">
            Log In
          </Link>
          <Link href="/auth/sign-up" className="text-sm font-semibold bg-[#6C47FF] text-white px-5 py-2.5 rounded-full hover:bg-[#5538ee] transition-colors shadow-md">
            Get Started
          </Link>
        </div>
      </nav>

      <div className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        {children}
      </div>

      <div className="relative z-10 text-center py-5 text-xs text-slate-500">
        © 2026 AI Decoder Academy. Kids-only safe space — teacher accounts available.
      </div>
    </div>
  );
}