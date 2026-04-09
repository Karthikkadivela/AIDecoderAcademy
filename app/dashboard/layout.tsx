"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard/playground", label: "Playground",   icon: "🎮" },
  { href: "/dashboard/progress",   label: "My Creations", icon: "🌟" },
  { href: "/dashboard/profile",    label: "Profile",      icon: "🧒" },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex flex-col bg-[#F5F6FF]" style={{ height: "100vh" }}>
      {/* Top nav */}
      <header className="bg-white border-b border-purple-100 shadow-sm z-30 flex-shrink-0">
        <div className="flex items-center justify-between px-6 py-3 w-full">
          <Link href="/" className="flex items-center gap-2.5 flex-shrink-0">
            <div className="w-7 h-7 bg-[#6C47FF] rounded-lg flex items-center justify-center">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L14 6V10L8 14L2 10V6L8 2Z" fill="white"/>
              </svg>
            </div>
            <span className="font-black text-[#1a1a2e] text-base tracking-tight hidden sm:block">
              AI Decoder Academy
            </span>
          </Link>

          <nav className="flex items-center gap-1">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl font-bold text-sm transition-all",
                  pathname.startsWith(item.href)
                    ? "bg-[#6C47FF] text-white shadow-lg shadow-purple-200"
                    : "text-slate-500 hover:bg-purple-50 hover:text-[#6C47FF]"
                )}
              >
                <span className="text-base">{item.icon}</span>
                <span className="hidden md:block">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="flex items-center gap-3 flex-shrink-0">
            <UserButton afterSignOutUrl="/auth/sign-in" />
          </div>
        </div>
      </header>

      {/* Page fills remaining height exactly */}
      <main className="flex-1 overflow-hidden" style={{ height: "calc(100vh - 57px)" }}>
        {children}
      </main>
    </div>
  );
}