"use client";
import { useState, useEffect } from "react";
import { useSignUp, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Link from "next/link";

const BOARDS = ["CBSE", "ICSE", "State Board"];
const GRADES = ["6", "7", "8", "9", "10"];

function gradeToAgeGroup(grade: string) {
  const g = parseInt(grade);
  if (g <= 7) return "11-13";
  return "14+";
}

export default function SignUpPage() {
  const { signUp, isLoaded, setActive } = useSignUp();
  const { isSignedIn }       = useAuth();
  const router               = useRouter();

  const [step,          setStep]          = useState(1);
  const [loading,       setLoading]       = useState(false);
  const [error,         setError]         = useState("");
  const [showPassword,  setShowPassword]  = useState(false);
  const [agreed,        setAgreed]        = useState(false);
  const [verifying,     setVerifying]     = useState(false);
  const [code,          setCode]          = useState("");
  const [fullName,      setFullName]      = useState("");
  const [email,         setEmail]         = useState("");
  const [password,      setPassword]      = useState("");
  const [board,         setBoard]         = useState("CBSE");
  const [grade,         setGrade]         = useState("8");

  // Redirect if already signed in (but not while we're in the middle of verifying)
  useEffect(() => {
    if (isSignedIn && !verifying) router.replace("/dashboard/profile");
  }, [isSignedIn, router, verifying]);

  const passwordStrength =
    password.length === 0 ? 0
    : password.length < 6 ? 1
    : password.length < 10 ? 2
    : /[A-Z]/.test(password) && /[0-9]/.test(password) ? 4 : 3;
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][passwordStrength];
  const strengthColor = ["", "bg-red-400", "bg-yellow-400", "bg-blue-400", "bg-green-400"][passwordStrength];

  const handleNext = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim() || password.length < 8) {
      setError("Please fill in all fields. Password must be at least 8 characters.");
      return;
    }
    setError("");
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !agreed) return;
    setLoading(true);
    setError("");
    try {
      await signUp.create({
        firstName:    fullName.split(" ")[0],
        lastName:     fullName.split(" ").slice(1).join(" ") || "",
        emailAddress: email,
        password,
      });
      await signUp.prepareEmailAddressVerification({ strategy: "email_code" });
      setVerifying(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded) return;
    setLoading(true);
    setError("");
    try {
      const result = await signUp.attemptEmailAddressVerification({ code });
      if (result.status === "complete") {
        // Fire profile creation in background
        fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            display_name: fullName.split(" ")[0],
            avatar_emoji: "🚀",
            age_group:    gradeToAgeGroup(grade),
            interests:    [],
          }),
        }).catch(() => {/* profile created later via onboarding */});
        // Use beforeEmit so Clerk completes cross-domain session handoff first
        await setActive({
          session: result.createdSessionId,
          beforeEmit: () => router.replace("/dashboard/profile"),
        });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid code.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (!isLoaded) return;
    if (isSignedIn) { router.replace("/dashboard/profile"); return; }
    try {
      await signUp.authenticateWithRedirect({
        strategy:            "oauth_google",
        redirectUrl:         "/auth/sso-callback",
        redirectUrlComplete: "/dashboard/profile",
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Google sign-up failed.");
    }
  };

  // Email verification screen
  if (verifying) {
    return (
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl p-8 border border-purple-100">
          <div className="text-center mb-6">
            <div className="text-4xl mb-3">📬</div>
            <h2 className="text-2xl font-black text-[#1a1a2e] mb-1">Check your email!</h2>
            <p className="text-sm text-slate-500">
              We sent a 6-digit code to{" "}
              <span className="font-semibold text-[#6C47FF]">{email}</span>
            </p>
          </div>
          {/* Required by Clerk for CAPTCHA */}
          <div id="clerk-captcha" />
          <form onSubmit={handleVerify} className="space-y-4">
            <input
              value={code}
              onChange={e => setCode(e.target.value)}
              placeholder="Enter 6-digit code"
              maxLength={6}
              autoFocus
              className="w-full text-center text-2xl font-bold tracking-widest px-4 py-4 rounded-xl border border-slate-200 focus:outline-none focus:border-[#6C47FF] focus:ring-2 focus:ring-purple-100"
            />
            {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}
            <button type="submit" disabled={loading || code.length < 6}
              className="w-full bg-[#6C47FF] hover:bg-[#5538ee] text-white font-bold py-3.5 rounded-xl transition-all disabled:opacity-60 shadow-lg shadow-purple-200">
              {loading ? "Verifying…" : "Verify & Start Learning 🚀"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-lg">
      <div className="bg-white rounded-3xl shadow-xl border border-purple-100 overflow-hidden">
        {/* Step header */}
        <div className="px-8 pt-7 pb-5 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold bg-[#6C47FF] text-white px-3 py-1 rounded-full">
              STEP {step}/2
            </span>
            <div className="flex gap-2">
              <div className={`h-1.5 w-12 rounded-full transition-all ${step >= 1 ? "bg-[#6C47FF]" : "bg-slate-200"}`} />
              <div className={`h-1.5 w-12 rounded-full transition-all ${step >= 2 ? "bg-[#6C47FF]" : "bg-slate-200"}`} />
            </div>
          </div>
          <h1 className="text-2xl font-black text-[#1a1a2e] mb-0.5">
            {step === 1 ? "Create Your Account" : "Your Academic Profile"}
          </h1>
          <p className="text-sm text-slate-500">
            {step === 1
              ? "Join thousands of students decoding the future of AI."
              : "Help us personalise your learning experience."}
          </p>
        </div>

        <div className="px-8 py-6">
          {/* Required by Clerk for CAPTCHA — hidden visually */}
          <div id="clerk-captcha" style={{ display: "none" }} />

          {step === 1 ? (
            <form onSubmit={handleNext} className="space-y-5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
                    Your Full Name
                  </label>
                  <input value={fullName} onChange={e => setFullName(e.target.value)}
                    placeholder="e.g. Rahul Sharma"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-[#1a1a2e] bg-white focus:outline-none focus:border-[#6C47FF] focus:ring-2 focus:ring-purple-100 transition-all placeholder:text-slate-300" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
                    Email Address
                  </label>
                  <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="you@school.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm text-[#1a1a2e] bg-white focus:outline-none focus:border-[#6C47FF] focus:ring-2 focus:ring-purple-100 transition-all placeholder:text-slate-300" />
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 block">
                  Set Secret Password
                </label>
                <div className="relative">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="2" y="6" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
                      <path d="M4.5 6V4.5a2.5 2.5 0 015 0V6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                    </svg>
                  </div>
                  <input type={showPassword ? "text" : "password"} value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Min. 8 characters"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm text-[#1a1a2e] bg-white focus:outline-none focus:border-[#6C47FF] focus:ring-2 focus:ring-purple-100 transition-all placeholder:text-slate-300" />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <path d="M1 7s2-4 6-4 6 4 6 4-2 4-6 4-6-4-6-4z" stroke="currentColor" strokeWidth="1.5"/>
                      <circle cx="7" cy="7" r="1.5" stroke="currentColor" strokeWidth="1.5"/>
                    </svg>
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="flex-1 flex gap-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all ${i <= passwordStrength ? strengthColor : "bg-slate-100"}`} />
                    ))}
                  </div>
                  <span className="text-xs text-slate-400 font-medium w-16 text-right">
                    {password.length === 0 ? "Start typing..." : strengthLabel}
                  </span>
                </div>
              </div>

              {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <button type="submit"
                className="w-full bg-[#6C47FF] hover:bg-[#5538ee] text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-purple-200">
                Next — Academic Profile →
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-100" />
                <span className="text-xs text-slate-400 uppercase tracking-wider">or</span>
                <div className="flex-1 h-px bg-slate-100" />
              </div>

              <button type="button" onClick={handleGoogle}
                className="w-full flex items-center justify-center gap-2.5 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold py-3 rounded-xl text-sm text-[#1a1a2e] bg-white transition-all">
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 002.38-5.88c0-.57-.05-.66-.15-1.18z" fill="#4285F4"/>
                  <path d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.01c-.72.48-1.63.76-2.7.76-2.08 0-3.84-1.4-4.47-3.29H1.87v2.07A8 8 0 008.98 17z" fill="#34A853"/>
                  <path d="M4.51 10.52A4.8 4.8 0 014.26 9c0-.52.09-1.02.25-1.52V5.41H1.87A8 8 0 001 9c0 1.29.31 2.51.87 3.59l2.64-2.07z" fill="#FBBC05"/>
                  <path d="M8.98 3.58c1.17 0 2.23.4 3.06 1.2l2.3-2.3A8 8 0 001.87 5.4L4.5 7.48c.64-1.87 2.4-3.9 4.48-3.9z" fill="#EA4335"/>
                </svg>
                Sign up with Google
              </button>

              <p className="text-center text-sm text-slate-500">
                Already part of the Academy?{" "}
                <Link href="/auth/sign-in" className="text-[#6C47FF] font-bold hover:underline">
                  Back to Log In
                </Link>
              </p>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                  Education Board
                </label>
                <div className="flex gap-2">
                  {BOARDS.map(b => (
                    <button key={b} type="button" onClick={() => setBoard(b)}
                      className={`px-4 py-2 rounded-full text-sm font-semibold border-2 transition-all ${
                        board === b
                          ? "bg-[#6C47FF] text-white border-[#6C47FF]"
                          : "border-slate-200 text-slate-600 hover:border-[#6C47FF]"
                      }`}>
                      {b}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 block">
                  Current Grade / Class
                </label>
                <div className="flex gap-2">
                  {GRADES.map(g => (
                    <button key={g} type="button" onClick={() => setGrade(g)}
                      className={`w-12 h-12 rounded-xl text-sm font-bold border-2 transition-all ${
                        grade === g
                          ? "bg-white border-[#4ADE80] text-green-700 shadow-sm"
                          : "border-slate-200 text-slate-600 hover:border-slate-300"
                      }`}>
                      {g}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-slate-400 mt-2">
                  ✅ This helps us customise your AI learning modules and curriculum.
                </p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <div className="relative mt-0.5 flex-shrink-0">
                  <input type="checkbox" checked={agreed}
                    onChange={e => setAgreed(e.target.checked)} className="sr-only" />
                  <div className={`w-4 h-4 rounded border-2 transition-all flex items-center justify-center ${
                    agreed ? "bg-[#6C47FF] border-[#6C47FF]" : "border-slate-300"
                  }`}>
                    {agreed && (
                      <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                        <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5"
                          strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                </div>
                <span className="text-xs text-slate-600 leading-relaxed">
                  I agree to the{" "}
                  <span className="text-[#6C47FF] font-semibold">Privacy Policy</span> and{" "}
                  <span className="text-[#6C47FF] font-semibold">Student Safety Guidelines</span>.
                  I&apos;m ready to start my AI decoding journey!
                </span>
              </label>

              {error && <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>}

              <button type="submit" disabled={loading || !agreed}
                className="w-full bg-[#6C47FF] hover:bg-[#5538ee] text-white font-bold py-3.5 rounded-xl transition-all active:scale-95 shadow-lg shadow-purple-200 disabled:opacity-50">
                {loading ? "Creating account…" : "Complete Registration →"}
              </button>

              <div className="flex items-center justify-center gap-4">
                <span className="text-xs text-slate-400">✅ COPPA Compliant</span>
                <span className="text-xs text-slate-400">🕐 Teacher Monitored</span>
              </div>

              <p className="text-center text-sm text-slate-500">
                Already part of the Academy?{" "}
                <Link href="/auth/sign-in" className="text-[#6C47FF] font-bold hover:underline">
                  Back to Log In
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}