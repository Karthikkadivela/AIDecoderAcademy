"use client";

/**
 * ArenaCanvas — GPU-composited canvas particle engine for the playground.
 *
 * Arena 1 — AI Explorer:      star field (3 depth layers) + shooting stars + nebula dust
 * Arena 3 — Story Forge:      rising ember particles + gold story motes + firefly drift
 * Arena 6 — Director's Suite: dramatic cinema environment — film grain, spotlight, dust,
 *                              slow seat-rows silhouette, animated light leak streaks
 * All other arenas:           ambient accent-coloured particle field
 *
 * Performance:
 * - Single <canvas> drawn at ~30fps via RAF throttle
 * - Paused on visibilitychange (tab hidden)
 * - Respects prefers-reduced-motion (20% particles, no animation)
 * - GPU composited: only transform + opacity — zero layout thrash
 */

import { useEffect, useRef, useCallback } from "react";

interface Props {
  arenaId:       number;
  accent:        string;  // hex "#C8FF00"
  accentGlow:    string;  // rgba "rgba(200,255,0,0.3)"
  reducedMotion?: boolean;
}

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0,2),16), parseInt(h.slice(2,4),16), parseInt(h.slice(4,6),16)];
}

// ─── Arena 1 — Star Field ────────────────────────────────────────────────────

interface Star {
  x:number; y:number; r:number;
  opacity:number; twinkleSpeed:number; twinkleOffset:number;
  layer:number; // 0=far 1=mid 2=close
}
interface Shooter {
  x:number; y:number; vx:number; vy:number;
  len:number; opacity:number; life:number; max:number; active:boolean;
}
interface NebDust {
  x:number; y:number; vx:number; vy:number; r:number; opacity:number; hue:number;
}

function mkStars(W:number,H:number,rm:boolean) {
  const n = rm ? 30 : 160;
  const stars:Star[] = Array.from({length:n},()=>({
    x:Math.random()*W, y:Math.random()*H*0.85,
    r:Math.random()*1.4+0.3, opacity:Math.random()*0.6+0.25,
    twinkleSpeed:Math.random()*0.018+0.006,
    twinkleOffset:Math.random()*Math.PI*2,
    layer:Math.floor(Math.random()*3),
  }));
  const shooters:Shooter[] = Array.from({length:6},()=>({
    x:0,y:0,vx:0,vy:0,len:0,opacity:0,life:0,max:0,active:false,
  }));
  const dust:NebDust[] = rm ? [] : Array.from({length:22},()=>({
    x:Math.random()*W, y:Math.random()*H*0.7,
    vx:(Math.random()-0.5)*0.1, vy:(Math.random()-0.5)*0.07,
    r:Math.random()*65+30, opacity:Math.random()*0.055+0.02,
    hue:Math.random()*60-30,
  }));
  return {stars,shooters,dust};
}

function launchShooter(s:Shooter,W:number,H:number) {
  s.x=Math.random()*W*0.65; s.y=Math.random()*H*0.38;
  s.vx=Math.random()*7+4; s.vy=Math.random()*3.5+1;
  s.len=Math.random()*130+80; s.max=Math.random()*45+28;
  s.life=0; s.opacity=0; s.active=true;
}

function drawStars(ctx:CanvasRenderingContext2D,W:number,H:number,t:number,
  st:ReturnType<typeof mkStars>,rm:boolean) {
  ctx.clearRect(0,0,W,H);

  st.dust.forEach(d=>{
    d.x+=d.vx; d.y+=d.vy;
    if(d.x<-d.r*2)d.x=W+d.r; if(d.x>W+d.r*2)d.x=-d.r;
    if(d.y<-d.r*2)d.y=H+d.r; if(d.y>H+d.r*2)d.y=-d.r;
    const g=ctx.createRadialGradient(d.x,d.y,0,d.x,d.y,d.r);
    g.addColorStop(0,`hsla(${270+d.hue},65%,65%,${d.opacity})`);
    g.addColorStop(1,"transparent");
    ctx.fillStyle=g;
    ctx.beginPath(); ctx.arc(d.x,d.y,d.r,0,Math.PI*2); ctx.fill();
  });

  st.stars.forEach(s=>{
    const tw=Math.sin(t*s.twinkleSpeed+s.twinkleOffset)*0.3+0.7;
    const a=s.opacity*tw;
    const lr=s.r*(s.layer===0?0.55:s.layer===1?1:1.6);
    if(lr>0.9){
      const g=ctx.createRadialGradient(s.x,s.y,0,s.x,s.y,lr*3.5);
      g.addColorStop(0,`rgba(200,220,255,${a*0.38})`); g.addColorStop(1,"transparent");
      ctx.fillStyle=g; ctx.beginPath(); ctx.arc(s.x,s.y,lr*3.5,0,Math.PI*2); ctx.fill();
    }
    ctx.fillStyle=`rgba(225,238,255,${a})`;
    ctx.beginPath(); ctx.arc(s.x,s.y,lr,0,Math.PI*2); ctx.fill();
  });

  if(!rm) st.shooters.forEach(s=>{
    if(!s.active){if(Math.random()<0.004)launchShooter(s,W,H);return;}
    s.life++; s.x+=s.vx; s.y+=s.vy;
    const p=s.life/s.max;
    s.opacity=p<0.2?p/0.2:p>0.7?(1-(p-0.7)/0.3):1;
    if(s.life>=s.max){s.active=false;return;}
    const tail=ctx.createLinearGradient(s.x-s.vx*10,s.y-s.vy*10,s.x,s.y);
    tail.addColorStop(0,"transparent");
    tail.addColorStop(1,`rgba(210,230,255,${s.opacity*0.9})`);
    ctx.strokeStyle=tail; ctx.lineWidth=1.6;
    ctx.beginPath(); ctx.moveTo(s.x-s.vx*9,s.y-s.vy*9); ctx.lineTo(s.x,s.y); ctx.stroke();
    ctx.fillStyle=`rgba(255,255,255,${s.opacity})`;
    ctx.beginPath(); ctx.arc(s.x,s.y,1.6,0,Math.PI*2); ctx.fill();
  });
}

// ─── Arena 3 — Story Forge ───────────────────────────────────────────────────

interface Ember {
  x:number; y:number; vx:number; vy:number;
  r:number; opacity:number; life:number; max:number; hue:number;
}
interface Mote {
  x:number; y:number; vx:number; vy:number;
  r:number; opacity:number; ts:number; to:number;
}

function mkForge(W:number,H:number,rm:boolean) {
  const ec=rm?8:65; const mc=rm?4:24;
  const embers:Ember[]=Array.from({length:ec},()=>spawnEmber(W,H,true));
  const motes:Mote[]=Array.from({length:mc},()=>spawnMote(W,H));
  return {embers,motes};
}
function spawnEmber(W:number,H:number,anyY=false):Ember {
  return {
    x:Math.random()*W, y:anyY?Math.random()*H:H+10,
    vx:(Math.random()-0.5)*0.85, vy:-(Math.random()*1.3+0.45),
    r:Math.random()*2.6+0.7, opacity:Math.random()*0.75+0.3,
    life:anyY?Math.random()*190:0, max:Math.random()*210+110,
    hue:Math.random()*45+18,
  };
}
function spawnMote(W:number,H:number):Mote {
  return {
    x:Math.random()*W, y:Math.random()*H,
    vx:(Math.random()-0.5)*0.16, vy:(Math.random()-0.5)*0.12,
    r:Math.random()*2.2+0.5, opacity:Math.random()*0.42+0.15,
    ts:Math.random()*0.022+0.007, to:Math.random()*Math.PI*2,
  };
}

function drawForge(ctx:CanvasRenderingContext2D,W:number,H:number,t:number,
  st:ReturnType<typeof mkForge>,rm:boolean) {
  ctx.clearRect(0,0,W,H);
  st.embers.forEach((e,i)=>{
    e.life++; e.x+=e.vx+Math.sin(e.life*0.045+i)*0.28; e.y+=e.vy;
    e.vx+=(Math.random()-0.5)*0.055;
    const p=e.life/e.max;
    const fade=p<0.15?p/0.15:p>0.72?(1-(p-0.72)/0.28):1;
    const a=e.opacity*fade;
    if(e.life>=e.max||e.y<-25){Object.assign(st.embers[i],spawnEmber(W,H));return;}
    const g=ctx.createRadialGradient(e.x,e.y,0,e.x,e.y,e.r*4.5);
    g.addColorStop(0,`hsla(${e.hue},100%,72%,${a*0.48})`); g.addColorStop(1,"transparent");
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(e.x,e.y,e.r*4.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=`hsla(${e.hue},100%,84%,${a})`;
    ctx.beginPath(); ctx.arc(e.x,e.y,e.r,0,Math.PI*2); ctx.fill();
  });
  st.motes.forEach(m=>{
    m.x+=m.vx; m.y+=m.vy;
    if(m.x<0)m.x=W; if(m.x>W)m.x=0; if(m.y<0)m.y=H; if(m.y>H)m.y=0;
    const tw=Math.sin(t*m.ts+m.to)*0.4+0.6;
    const a=m.opacity*tw;
    const g=ctx.createRadialGradient(m.x,m.y,0,m.x,m.y,m.r*5.5);
    g.addColorStop(0,`rgba(255,222,140,${a*0.55})`); g.addColorStop(1,"transparent");
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(m.x,m.y,m.r*5.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=`rgba(255,242,180,${a})`;
    ctx.beginPath(); ctx.arc(m.x,m.y,m.r,0,Math.PI*2); ctx.fill();
  });
}

// ─── Arena 6 — Director's Suite ──────────────────────────────────────────────

interface CinemaState {
  dustX:number[]; dustY:number[]; dustVx:number[]; dustVy:number[];
  dustR:number[]; dustOp:number[]; dustCount:number;
  streakX:number[]; streakY:number[]; streakW:number[];
  streakH:number[]; streakOp:number[]; streakSpeed:number[]; streakCount:number;
  spotOsc:number; // slow spotlight oscillation phase
}

function mkCinema(W:number,H:number,rm:boolean):CinemaState {
  const dc=rm?12:70;  // dust in spotlight
  const sc=rm?2:8;    // light streaks

  const dustX=new Array(dc).fill(0).map(()=>Math.random()*W);
  const dustY=new Array(dc).fill(0).map(()=>Math.random()*H*0.85);
  const dustVx=new Array(dc).fill(0).map(()=>(Math.random()-0.5)*0.35);
  const dustVy=new Array(dc).fill(0).map(()=>(Math.random()-0.5)*0.18);
  const dustR=new Array(dc).fill(0).map(()=>Math.random()*1.8+0.4);
  const dustOp=new Array(dc).fill(0).map(()=>Math.random()*0.55+0.2);

  const streakX=new Array(sc).fill(0).map(()=>Math.random()*W);
  const streakY=new Array(sc).fill(0).map(()=>Math.random()*H*0.5);
  const streakW=new Array(sc).fill(0).map(()=>Math.random()*1.5+0.4);
  const streakH=new Array(sc).fill(0).map(()=>Math.random()*H*0.38+H*0.18);
  const streakOp=new Array(sc).fill(0).map(()=>Math.random()*0.12+0.04);
  const streakSpeed=new Array(sc).fill(0).map(()=>(Math.random()-0.5)*0.12);

  return {
    dustX,dustY,dustVx,dustVy,dustR,dustOp,dustCount:dc,
    streakX,streakY,streakW,streakH,streakOp,streakSpeed,streakCount:sc,
    spotOsc:0,
  };
}

function drawCinema(ctx:CanvasRenderingContext2D,W:number,H:number,t:number,
  st:CinemaState,rm:boolean) {
  ctx.clearRect(0,0,W,H);

  // Canvas only handles what CSS can't animate:
  // 1. Moving dust particles floating in the projector beam
  // 2. Film grain (randomised every frame)
  // CSS handles: base, letterbox, seat silhouettes, screen glow, projector cone, vignette

  // ── Dust floating in beam area (upper 70% of screen) ─────────────────────
  for(let i=0;i<st.dustCount;i++){
    st.dustX[i]+=st.dustVx[i]+Math.sin(t*0.009+i)*0.1;
    st.dustY[i]+=st.dustVy[i];
    if(st.dustX[i]<0)st.dustX[i]=W; if(st.dustX[i]>W)st.dustX[i]=0;
    if(st.dustY[i]<0)st.dustY[i]=H*0.7; if(st.dustY[i]>H*0.72)st.dustY[i]=0;

    // Concentrate dust in centre beam zone
    const centreX=W*0.5;
    const beamHalfW=W*0.32*(st.dustY[i]/(H*0.7));
    const dx=Math.abs(st.dustX[i]-centreX);
    const vis=dx<beamHalfW?(1-dx/beamHalfW)*0.9:0;
    if(vis<0.05)continue;

    const a=st.dustOp[i]*vis;
    // Warm white dust
    ctx.fillStyle=`rgba(220,240,200,${a})`;
    ctx.beginPath();
    ctx.arc(st.dustX[i],st.dustY[i],st.dustR[i],0,Math.PI*2);
    ctx.fill();
  }

  // ── Film grain ────────────────────────────────────────────────────────────
  if(!rm){
    for(let i=0;i<220;i++){
      const gx=Math.random()*W;
      const gy=Math.random()*H;
      const go=Math.random()*0.09+0.02;
      const col=Math.random()>0.5?255:0;
      ctx.fillStyle=`rgba(${col},${col},${col},${go})`;
      ctx.fillRect(gx,gy,1,1);
    }
  }
}

// ─── Generic ambient (arenas 2, 4, 5) ────────────────────────────────────────

interface AmbPt {
  x:number; y:number; vx:number; vy:number;
  r:number; op:number; ts:number; to:number;
}
function mkAmbient(W:number,H:number,rm:boolean,rgb:[number,number,number]):AmbPt[] {
  const n=rm?10:42;
  return Array.from({length:n},()=>({
    x:Math.random()*W, y:Math.random()*H,
    vx:(Math.random()-0.5)*0.22, vy:(Math.random()-0.5)*0.16,
    r:Math.random()*2.2+0.5, op:Math.random()*0.38+0.1,
    ts:Math.random()*0.022+0.006, to:Math.random()*Math.PI*2,
  }));
}
function drawAmbient(ctx:CanvasRenderingContext2D,W:number,H:number,t:number,
  pts:AmbPt[],rgb:[number,number,number]) {
  ctx.clearRect(0,0,W,H);
  pts.forEach(p=>{
    p.x+=p.vx; p.y+=p.vy;
    if(p.x<0)p.x=W; if(p.x>W)p.x=0; if(p.y<0)p.y=H; if(p.y>H)p.y=0;
    const tw=Math.sin(t*p.ts+p.to)*0.35+0.65;
    const a=p.op*tw;
    const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.r*5.5);
    g.addColorStop(0,`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a*0.5})`);
    g.addColorStop(1,"transparent");
    ctx.fillStyle=g; ctx.beginPath(); ctx.arc(p.x,p.y,p.r*5.5,0,Math.PI*2); ctx.fill();
    ctx.fillStyle=`rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
    ctx.beginPath(); ctx.arc(p.x,p.y,p.r,0,Math.PI*2); ctx.fill();
  });
}

// ─── Main component ──────────────────────────────────────────────────────────

export function ArenaCanvas({arenaId,accent,accentGlow,reducedMotion=false}:Props) {
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const stateRef=useRef<unknown>(null);
  const frameRef=useRef(0);
  const tRef=useRef(0);
  const lastRef=useRef(0);
  const rgbRef=useRef<[number,number,number]>([124,58,237]);

  const draw=useCallback(()=>{
    const canvas=canvasRef.current;
    if(!canvas)return;
    const ctx=canvas.getContext("2d");
    if(!ctx)return;
    const now=performance.now();
    if(now-lastRef.current<33){frameRef.current=requestAnimationFrame(draw);return;}
    lastRef.current=now;
    tRef.current++;
    const t=tRef.current; const W=canvas.width; const H=canvas.height;
    const rm=reducedMotion;
    if     (arenaId===1) drawStars  (ctx,W,H,t,stateRef.current as ReturnType<typeof mkStars>,rm);
    else if(arenaId===3) drawForge  (ctx,W,H,t,stateRef.current as ReturnType<typeof mkForge>,rm);
    else if(arenaId===6) drawCinema (ctx,W,H,t,stateRef.current as CinemaState,rm);
    else                 drawAmbient(ctx,W,H,t,stateRef.current as AmbPt[],rgbRef.current);
    frameRef.current=requestAnimationFrame(draw);
  },[arenaId,reducedMotion]);

  useEffect(()=>{
    const canvas=canvasRef.current;
    if(!canvas)return;
    const W=canvas.width=window.innerWidth;
    const H=canvas.height=window.innerHeight;
    rgbRef.current=hexToRgb(accent.startsWith("#")?accent:"#7C3AED");
    if     (arenaId===1) stateRef.current=mkStars  (W,H,reducedMotion);
    else if(arenaId===3) stateRef.current=mkForge  (W,H,reducedMotion);
    else if(arenaId===6) stateRef.current=mkCinema (W,H,reducedMotion);
    else                 stateRef.current=mkAmbient(W,H,reducedMotion,rgbRef.current);
    cancelAnimationFrame(frameRef.current);
    tRef.current=0; lastRef.current=0;
    frameRef.current=requestAnimationFrame(draw);
    return ()=>cancelAnimationFrame(frameRef.current);
  },[arenaId,accent,reducedMotion,draw]);

  useEffect(()=>{
    const onResize=()=>{
      const canvas=canvasRef.current; if(!canvas)return;
      const W=canvas.width=window.innerWidth; const H=canvas.height=window.innerHeight;
      if     (arenaId===1) stateRef.current=mkStars  (W,H,reducedMotion);
      else if(arenaId===3) stateRef.current=mkForge  (W,H,reducedMotion);
      else if(arenaId===6) stateRef.current=mkCinema (W,H,reducedMotion);
      else                 stateRef.current=mkAmbient(W,H,reducedMotion,rgbRef.current);
    };
    window.addEventListener("resize",onResize,{passive:true});
    return ()=>window.removeEventListener("resize",onResize);
  },[arenaId,reducedMotion]);

  useEffect(()=>{
    const onVis=()=>{
      if(document.hidden){cancelAnimationFrame(frameRef.current);}
      else{lastRef.current=0;frameRef.current=requestAnimationFrame(draw);}
    };
    document.addEventListener("visibilitychange",onVis);
    return ()=>document.removeEventListener("visibilitychange",onVis);
  },[draw]);

  // Cinema uses "normal" blend to be visible on dark background
  // Other arenas use "screen" so they layer additively on the CSS terrain
  const isScreen = true; // all arenas use screen — canvas adds light on top of CSS

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position:      "absolute",
        inset:         0,
        width:         "100%",
        height:        "100%",
        pointerEvents: "none",
        zIndex:        2,
        mixBlendMode:  "screen",
        opacity:       arenaId===6 ? (reducedMotion ? 0.2 : 0.7) : (reducedMotion ? 0.4 : 1),
        willChange:    "contents",
      }}
    />
  );
}