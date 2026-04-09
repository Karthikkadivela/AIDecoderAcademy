"use client";
import { useState, useEffect } from "react";
import { useSignIn, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignInPage() {
  const { signIn, isLoaded, setActive } = useSignIn();
  const { isSignedIn }       = useAuth();
  const router               = useRouter();

  const [email,        setEmail]        = useState("");
  const [password,     setPassword]     = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error,        setError]        = useState("");
  const [loading,      setLoading]      = useState(false);

  // If already signed in, redirect immediately — don't even show the form
  useEffect(() => {
    if (isSignedIn) {
      router.replace("/dashboard/playground");
    }
  }, [isSignedIn, router]);

  // Show loading spinner while checking auth state
  if (!isLoaded || isSignedIn) {
    return (
      <div className="w-full max-w-md flex items-center justify-center py-20">
        <div className="flex gap-2">
          {[0,1,2].map(i => (
            <div key={i} className="dot w-3 h-3 rounded-full bg-[#6C47FF]" />
          ))}
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || isSignedIn) return;
    setLoading(true);
    setError("");
    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });
      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        router.push("/dashboard/playground");
      }
    } catch (err: unknown) {
      const clerkError = (err as { errors?: { message: string }[] })?.errors?.[0];
      setError(clerkError?.message ?? "Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!isLoaded || isSignedIn) return;
    try {
      await signIn.authenticateWithRedirect({
        strategy:            "oauth_google",
        redirectUrl:         "/auth/sso-callback",
        redirectUrlComplete: "/dashboard/profile",
      });
    } catch (err: unknown) {
      const clerkError = (err as { errors?: { message: string }[] })?.errors?.[0];
      setError(clerkError?.message ?? "Google sign-in failed.");
    }
  };

  return (
    <div className="w-full max-w-md">
      <div className="bg-white rounded-3xl shadow-xl p-8 border border-purple-100">
        <div className="mb-7">
          <h1 className="text-2xl font-black text-[#1a1a2e] mb-1">
            Welcome AI Decoder! 🚀
          </h1>
          <p className="text-sm text-slate-500">
            Your stories are waiting. Ready for your next adventure?
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wide">
              Email or Username
            </label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M1 6l7 4 7-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="name@academy.com"
                required
                autoComplete="email"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#6C47FF] focus:ring-2 focus:ring-purple-100 transition-all placeholder:text-slate-300"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wide">
                Password
              </label>
              <Link href="#" className="text-xs text-[#6C47FF] font-semibold hover:underline">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <rect x="3" y="7" width="10" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                  <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                className="w-full pl-10 pr-10 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:border-[#6C47FF] focus:ring-2 focus:ring-purple-100 transition-all placeholder:text-slate-300"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <path d="M2 8s2.5-4 6-4 6 4 6 4-2.5 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.5"/>
                  <circle cx="8" cy="8" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
                </svg>
              </button>
            </div>
          </div>

          {error && (
            <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !email || !password}
            className="w-full bg-[#6C47FF] hover:bg-[#5538ee] text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 disabled:opacity-60 shadow-lg shadow-purple-200 mt-2"
          >
            {loading ? "Logging in…" : "Log In"}
          </button>
        </form>

        <div className="flex items-center gap-3 my-5">
          <div className="flex-1 h-px bg-slate-100" />
          <span className="text-xs text-slate-400 font-medium uppercase tracking-wider">or continue with</span>
          <div className="flex-1 h-px bg-slate-100" />
        </div>

        <button
          onClick={handleGoogle}
          className="w-full flex items-center justify-center gap-2.5 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-3 rounded-xl text-sm transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 18 18">
            <path d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z" fill="#4285F4"/>
            <path d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.76-2.7.76-2.08 0-3.84-1.4-4.47-3.29H1.87v2.07A8 8 0 008.98 17z" fill="#34A853"/>
            <path d="M4.51 10.52A4.8 4.8 0 014.26 9c0-.52.09-1.02.25-1.52V5.41H1.87A8 8 0 001 9c0 1.29.31 2.51.87 3.59l2.64-2.07z" fill="#FBBC05"/>
            <path d="M8.98 3.58c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.87 5.4L4.5 7.48c.64-1.87 2.4-3.9 4.48-3.9z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-center text-sm text-slate-500 mt-5">
          New to the Academy?{" "}
          <Link href="/auth/sign-up" className="text-[#6C47FF] font-bold hover:underline">
            Create your account
          </Link>
        </p>
      </div>
    </div>
  );
}