"use client";

import { useState, useRef, useEffect } from "react";
import { MessageBubble } from "@/components/playground/MessageBubble";
import type { Message } from "@/components/playground/useChat";
import type { OutputType } from "@/types";

const OBJECTS: {
  id:        OutputType;
  label:     string;
  src:       string;
  left:      number;
  bottom:    number;
  width:     number;
  blend:     "screen" | "normal";
  glowColor: string;
  glowRgb:   string;
}[] = [
  { id:"slides", label:"", src:"/arena1/slide.png",        left:28, bottom:13, width:13, blend:"screen", glowColor:"#ffb400", glowRgb:"255,180,0"   },
  { id:"audio",  label:"", src:"/arena1/headphones.png",   left:39, bottom:17, width:13, blend:"screen", glowColor:"#00aaff", glowRgb:"0,170,255"   },
  { id:"image",  label:"", src:"/arena1/camera.png",       left:36, bottom:10, width:10, blend:"screen", glowColor:"#ff4488", glowRgb:"255,68,136"  },
  { id:"video",  label:"", src:"/arena1/clapperboard.png", left:63, bottom:14, width:13, blend:"screen", glowColor:"#ff7800", glowRgb:"255,120,0"   },
  { id:"text",   label:"", src:"/arena1/book.png",         left:50, bottom:13, width:8,  blend:"normal", glowColor:"#c8a0ff", glowRgb:"200,160,255" },
  { id:"json",   label:"", src:"/arena1/jscube.png",       left:55, bottom:20, width:9,  blend:"screen", glowColor:"#00ff64", glowRgb:"0,255,100"   },
];

const WB = { left: 35.8, top: 18, width: 40, height: 49 };
const IMG_RATIO = 1536 / 1024;
const AVATAR = { leftPct: 8, bottomPct: 8, widthPct: 45 };

interface Props {
  profile:          { display_name: string; avatar_emoji: string; age_group: string; interests: string[] };
  sessionId:        string | null;
  messages:         Message[];
  isStreaming:      boolean;
  onSend:           (text: string, outputType: OutputType) => void;
  onNewChat:        () => void;
  onSave?:          (content: string, type: OutputType) => void;
  arenaId?:         number;
  arenaAccent?:     string;
  arenaAccentGlow?: string;
}

export function CreationsRoom({ profile, messages, isStreaming, onSend, onSave, arenaId = 1, arenaAccent = "#7C3AED", arenaAccentGlow = "rgba(124,58,237,0.35)" }: Props) {
  const [selected, setSelected] = useState<OutputType>("text");
  const [input,    setInput]    = useState("");
  const bottomRef    = useRef<HTMLDivElement>(null);
  const taRef        = useRef<HTMLTextAreaElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState({ x: 1, y: 1, offX: 0, offY: 0 });
  const active = OBJECTS.find(o => o.id === selected)!;

  useEffect(() => {
    const calc = () => {
      const el = containerRef.current;
      if (!el) return;
      const cw = el.clientWidth;
      const ch = el.clientHeight;
      const containerRatio = cw / ch;
      let renderedW: number, renderedH: number, offX: number, offY: number;
      if (containerRatio > IMG_RATIO) {
        renderedW = cw;
        renderedH = cw / IMG_RATIO;
        offX = 0;
        offY = (ch - renderedH) / 2;
      } else {
        renderedH = ch;
        renderedW = ch * IMG_RATIO;
        offX = (cw - renderedW) / 2;
        offY = 0;
      }
      setScale({ x: renderedW, y: renderedH, offX, offY });
    };
    calc();
    const ro = new ResizeObserver(calc);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const toScreen = (leftPct: number, bottomPct: number, widthPct: number) => ({
    left:   scale.offX + (leftPct / 100) * scale.x,
    bottom: scale.offY + (bottomPct / 100) * scale.y,
    width:  (widthPct / 100) * scale.x,
  });

  const wbScreen = {
    left:   scale.offX + (WB.left / 100) * scale.x,
    top:    scale.offY + (WB.top  / 100) * scale.y,
    width:  (WB.width  / 100) * scale.x,
    height: (WB.height / 100) * scale.y,
  };

  const avatarPos = toScreen(AVATAR.leftPct, AVATAR.bottomPct, AVATAR.widthPct);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = () => {
    const t = input.trim();
    if (!t || isStreaming) return;
    onSend(t, selected);
    setInput("");
    taRef.current?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const canSend = input.trim().length > 0 && !isStreaming;

  return (
    <div ref={containerRef} className="relative w-full h-full overflow-hidden" style={{ background:"#080814" }}>

      {/* Background */}
      <img src="/arena1/no_avatar.png" alt="" aria-hidden draggable={false}
        style={{ position:"absolute", inset:0, width:"100%", height:"100%", objectFit:"cover", objectPosition:"center", pointerEvents:"none" }}
      />

      {/* Floor objects */}
      {scale.x > 1 && OBJECTS.map(obj => {
        const pos = toScreen(obj.left, obj.bottom, obj.width);
        const isActive = selected === obj.id;
        return (
          <button key={obj.id} onClick={() => setSelected(obj.id)} title={obj.id}
            style={{ position:"absolute", left:pos.left, bottom:pos.bottom, width:pos.width, background:"none", border:"none", padding:0, cursor:"pointer", zIndex:10, transition:"transform 0.25s ease", transform:isActive?"scale(1.12) translateY(-4%)":"scale(1)" }}>
            <img src={obj.src} alt={obj.id} draggable={false}
              style={{ width:"100%", height:"auto", objectFit:"contain", mixBlendMode:obj.blend,
                filter: isActive
                  ? `brightness(1.5) drop-shadow(0 0 10px rgba(${obj.glowRgb},0.9)) drop-shadow(0 0 24px rgba(${obj.glowRgb},0.6))`
                  : "brightness(0.7) saturate(0.8)",
                transition:"filter 0.3s ease", display:"block" }}
            />
          </button>
        );
      })}

      {/* Avatar */}
      {scale.x > 1 && (
        <img
          src="/arena1/avatar.png"
          alt="" aria-hidden draggable={false}
          style={{
            position:      "absolute",
            left:          avatarPos.left,
            bottom:        avatarPos.bottom,
            width:         avatarPos.width,
            height:        "auto",
            objectFit:     "contain",
            zIndex:        15,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Whiteboard — desktop */}
      {scale.x > 1 && (
        <div className="hidden md:flex"
          style={{ position:"absolute", left:wbScreen.left, top:wbScreen.top, width:wbScreen.width, height:wbScreen.height, flexDirection:"column", zIndex:20, transformOrigin:"center top",
            background:`linear-gradient(180deg, ${arenaAccent}08 0%, transparent 40%)`,
            borderTop:`2px solid ${arenaAccent}30`,
            borderRadius:"4px 4px 0 0",
          }}>

          {/* Arena accent top stripe */}
          <div style={{ height:2, background:`linear-gradient(90deg, transparent, ${arenaAccent}80, ${arenaAccent}, ${arenaAccent}80, transparent)`, flexShrink:0, borderRadius:2 }}/>

          <div className="select-text" style={{ flex:1, overflowY:"auto", padding:"12px 14px 8px", display:"flex", flexDirection:"column", gap:8, scrollbarWidth:"none", minHeight:0 }}>
            {messages.length === 0 && (
              <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:10, opacity:0.5, pointerEvents:"none" }}>
                <span style={{ fontSize:28 }}>✏️</span>
                <p style={{ fontSize:11, color:arenaAccent, fontWeight:600, textAlign:"center", margin:0, lineHeight:1.6 }}>
                  Click an object on the floor<br/>to pick your output type,<br/>then write below
                </p>
              </div>
            )}
            {messages.map(msg => (
              <MessageBubble key={msg.id} message={msg} avatarEmoji={profile.avatar_emoji}
                isStreaming={isStreaming && msg === messages[messages.length - 1]}
                arenaAccent={arenaAccent} arenaAccentGlow={arenaAccentGlow} arenaId={arenaId}
                onSave={onSave}
              />
            ))}
            {isStreaming && (
              <div style={{ display:"flex", gap:4, padding:"2px 0 2px 28px" }}>
                {[0,1,2].map(i => <span key={i} className="dot" style={{ width:6, height:6, borderRadius:"50%", display:"inline-block", background:arenaAccent, opacity:0.7, animationDelay:`${i*0.15}s` }}/>)}
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          <div style={{ padding:"8px 12px 12px", flexShrink:0 }}>
            {/* Output-type mode dots */}
            <div style={{ display:"flex", alignItems:"center", justifyContent:"center", gap:5, marginBottom:6 }}>
              {OBJECTS.map(o => (
                <div key={o.id} style={{ width:6, height:6, borderRadius:"50%", background:selected===o.id?o.glowColor:"rgba(0,0,0,0.15)", transition:"all 0.2s", boxShadow:selected===o.id?`0 0 6px ${o.glowColor}`:"none" }}/>
              ))}
            </div>
            {/* Input bar — output-type colour shows active mode */}
            <div style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(10,5,50,0.55)", border:`2px solid rgba(${active.glowRgb},0.8)`, borderRadius:40, padding:"7px 8px 7px 18px", boxShadow:`0 0 24px rgba(${active.glowRgb},0.5)`, backdropFilter:"blur(16px)" }}>
              <textarea ref={taRef} value={input}
                onChange={e => { setInput(e.target.value); const t=e.target; t.style.height="auto"; t.style.height=Math.min(t.scrollHeight,80)+"px"; }}
                onKeyDown={onKey} placeholder="What do you want to create today?" rows={1}
                style={{ flex:1, resize:"none", border:"none", outline:"none", background:"transparent", fontSize:13, fontWeight:500, color:"rgba(255,255,255,0.92)", fontFamily:"inherit", lineHeight:1.5, overflowY:"hidden", caretColor:active.glowColor, userSelect:"text" }}
              />
              <button onClick={send} disabled={!canSend}
                style={{ width:36, height:36, borderRadius:"50%", flexShrink:0, background:canSend?`rgba(${active.glowRgb},0.9)`:"rgba(255,255,255,0.1)", border:"none", cursor:canSend?"pointer":"not-allowed", display:"flex", alignItems:"center", justifyContent:"center", transition:"all 0.2s", boxShadow:canSend?`0 0 18px rgba(${active.glowRgb},0.7)`:"none" }}>
                <svg width="13" height="13" viewBox="0 0 18 18" fill="none">
                  <path d="M2 9h14M9 2l7 7-7 7" stroke={canSend?"#fff":"rgba(255,255,255,0.25)"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile fallback */}
      <div className="md:hidden absolute inset-0 z-30 flex flex-col"
        style={{ background:"rgba(8,8,20,0.97)", padding:12, gap:8, borderTop:`2px solid ${arenaAccent}30` }}>

        {/* Arena accent stripe */}
        <div style={{ height:2, background:`linear-gradient(90deg, transparent, ${arenaAccent}80, ${arenaAccent}, ${arenaAccent}80, transparent)`, borderRadius:2, marginBottom:4, flexShrink:0 }}/>

        {/* Output-type mode pills */}
        <div style={{ display:"flex", gap:6, flexWrap:"wrap" as const }}>
          {OBJECTS.map(o => (
            <button key={o.id} onClick={() => setSelected(o.id)}
              style={{ padding:"4px 12px", borderRadius:20, fontSize:11, fontWeight:700, border:`1.5px solid ${selected===o.id?o.glowColor:"rgba(255,255,255,0.15)"}`, background:selected===o.id?`rgba(${o.glowRgb},0.25)`:"transparent", color:selected===o.id?o.glowColor:"rgba(255,255,255,0.4)", textTransform:"uppercase" as const, cursor:"pointer" }}>
              {o.id}
            </button>
          ))}
        </div>

        <div className="select-text" style={{ flex:1, overflowY:"auto" as const, display:"flex", flexDirection:"column" as const, gap:8 }}>
          {messages.length === 0 && (
            <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:"100%", gap:8, opacity:0.5, pointerEvents:"none" }}>
              <span style={{ fontSize:24 }}>✏️</span>
              <p style={{ fontSize:11, color:arenaAccent, fontWeight:600, textAlign:"center", margin:0, lineHeight:1.6 }}>
                Pick a mode above, then write below
              </p>
            </div>
          )}
          {messages.map(msg => (
            <MessageBubble key={msg.id} message={msg} avatarEmoji={profile.avatar_emoji}
              isStreaming={isStreaming && msg === messages[messages.length - 1]}
              arenaAccent={arenaAccent} arenaAccentGlow={arenaAccentGlow} arenaId={arenaId}
              onSave={onSave}
            />
          ))}
          <div ref={bottomRef}/>
        </div>

        <div style={{ display:"flex", gap:8, alignItems:"center", background:"rgba(10,5,50,0.7)", border:`1.5px solid rgba(${active.glowRgb},0.6)`, borderRadius:30, padding:"6px 8px 6px 16px", boxShadow:`0 0 20px rgba(${active.glowRgb},0.3)` }}>
          <textarea value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
            placeholder="What do you want to create today?" rows={1}
            style={{ flex:1, resize:"none", border:"none", outline:"none", background:"transparent", fontSize:13, color:"rgba(255,255,255,0.9)", fontFamily:"inherit", userSelect:"text" }}/>
          <button onClick={send} disabled={!canSend}
            style={{ width:34, height:34, borderRadius:"50%", background:canSend?`rgba(${active.glowRgb},0.9)`:"rgba(255,255,255,0.1)", border:"none", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0 }}>
            <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
              <path d="M2 9h14M9 2l7 7-7 7" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

    </div>
  );
}
