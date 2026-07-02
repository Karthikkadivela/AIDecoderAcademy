"use client";

export default function VideoView() {
  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/no-video-for-you.svg" alt="Video not available" style={{ width: 200, opacity: 0.7 }} />
      <p style={{ fontFamily: "'DM Sans',sans-serif", color: "rgba(255,255,255,0.4)", fontSize: 14, textAlign: "center", maxWidth: 280 }}>
        Video explainers are coming soon! In the meantime, check out the Blog and Story tabs.
      </p>
    </div>
  );
}
