import { useState, useEffect, useRef, useCallback } from "react";

// ════════════════════════════════════════════════════════════════════════════
//  DESIGN TOKENS
// ════════════════════════════════════════════════════════════════════════════
const C = {
  bg:      "#010409",   // Onyx Profond
  card:    "#0D1117",   // Ardoise Sombre
  border:  "#30363D",   // Bordure fine
  primary: "#58A6FF",   // Bleu primaire
  success: "#3FB950",   // Vert émeraude
  amber:   "#D29922",   // Ambre/Or alertes
  textPri: "#E6EDF3",   // Blanc doux
  textSec: "#8B949E",   // Gris moyen
  textDim: "#3D444D",   // Très sombre
};

// ════════════════════════════════════════════════════════════════════════════
//  CONSTANTS & HELPERS
// ════════════════════════════════════════════════════════════════════════════
const TOTAL_TRIALS = 10;
const SAMPLE_INTERVAL_MS = 16;
const TARGET_SIZES = [44, 36, 52, 28, 44, 36, 60, 28, 52, 40];
const TARGET_POSITIONS = [
  { x: 0.75, y: 0.25 }, { x: 0.20, y: 0.70 }, { x: 0.80, y: 0.65 },
  { x: 0.30, y: 0.20 }, { x: 0.65, y: 0.50 }, { x: 0.15, y: 0.45 },
  { x: 0.70, y: 0.15 }, { x: 0.40, y: 0.75 }, { x: 0.85, y: 0.40 },
  { x: 0.25, y: 0.55 }, { x: 0.60, y: 0.80 },
];

function euclidean(a, b) { return Math.sqrt((b.x-a.x)**2+(b.y-a.y)**2); }
function pathLength(pts) { let l=0; for(let i=1;i<pts.length;i++) l+=euclidean(pts[i-1],pts[i]); return l; }
function fittsID(D, W) { return Math.log2((2*D)/W); }
function mean(arr) { return arr.reduce((a,b)=>a+b,0)/arr.length; }
function stdDev(arr) { const m=mean(arr); return Math.sqrt(arr.reduce((a,b)=>a+(b-m)**2,0)/arr.length); }
function clamp(v,lo,hi) { return Math.max(lo,Math.min(hi,v)); }

function cognitiveScore(trials) {
  const normRT = clamp((mean(trials.map(t=>t.RT))-200)/600,0,1);
  const normSI = clamp((mean(trials.map(t=>t.SI))-1.0)/0.4,0,1);
  const normTP = clamp(1-(mean(trials.map(t=>t.TP))-1)/8,0,1);
  return Math.round((normRT*0.4+normSI*0.3+normTP*0.3)*100);
}
function loadLabel(score) {
  if (score < 30) return { label:"Low",      color: C.success };
  if (score < 60) return { label:"Moderate", color: C.amber   };
  return              { label:"High",     color:"#F85149" };
}

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@300;400;500&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Serif:ital,wght@1,300&display=swap');`;

// ════════════════════════════════════════════════════════════════════════════
//  SHARED TINY COMPONENTS
// ════════════════════════════════════════════════════════════════════════════
const nodes = [
  {x:8,y:15,size:110},{x:85,y:10,size:75},{x:92,y:75,size:130},
  {x:5,y:80,size:85},{x:50,y:5,size:55},{x:75,y:50,size:95},{x:20,y:55,size:65},
];
const conns = [
  [8,15,50,5],[50,5,85,10],[85,10,92,75],[92,75,75,50],
  [75,50,20,55],[20,55,5,80],[5,80,8,15],[20,55,50,5],[75,50,85,10],
];

function useNeuralCanvas(canvasRef) {
  useEffect(() => {
    const cvs = canvasRef.current; if (!cvs) return;
    const ctx = cvs.getContext("2d");
    const resize = () => { cvs.width=cvs.offsetWidth; cvs.height=cvs.offsetHeight; };
    resize(); window.addEventListener("resize", resize);
    let frame=0, animId;
    const draw = () => {
      ctx.clearRect(0,0,cvs.width,cvs.height);
      conns.forEach(([x1,y1,x2,y2],i) => {
        const p=(Math.sin(frame*0.007+i*0.6)+1)/2;
        ctx.beginPath();
        ctx.moveTo(x1/100*cvs.width,y1/100*cvs.height);
        ctx.lineTo(x2/100*cvs.width,y2/100*cvs.height);
        ctx.strokeStyle=`rgba(88,166,255,${0.025+p*0.055})`; ctx.lineWidth=0.6; ctx.stroke();
      });
      nodes.forEach(({x,y,size},i) => {
        const pulse=(Math.sin(frame*0.016+i*0.9)+1)/2;
        const cx=x/100*cvs.width, cy=y/100*cvs.height, r=(size/2)*(0.8+pulse*0.22);
        const g=ctx.createRadialGradient(cx,cy,0,cx,cy,r);
        g.addColorStop(0,`rgba(88,166,255,${0.07+pulse*0.09})`); g.addColorStop(1,"rgba(88,166,255,0)");
        ctx.beginPath(); ctx.arc(cx,cy,r,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
        ctx.beginPath(); ctx.arc(cx,cy,1.5,0,Math.PI*2);
        ctx.fillStyle=`rgba(88,166,255,${0.2+pulse*0.3})`; ctx.fill();
      });
      frame++; animId=requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(animId); window.removeEventListener("resize",resize); };
  }, []);
}

function MetricPill({ label, value, delay }) {
  const [vis, setVis] = useState(false);
  useEffect(() => { const t=setTimeout(()=>setVis(true),delay); return ()=>clearTimeout(t); }, []);
  return (
    <div style={{ opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(10px)", transition:"all 0.7s ease", background:C.card, border:`1px solid ${C.border}`, borderRadius:"6px", padding:"10px 18px", display:"flex", flexDirection:"column", alignItems:"center", gap:"3px", minWidth:"80px" }}>
      <span style={{ color:C.textSec, fontSize:"12px", fontWeight:"500", fontFamily:"'IBM Plex Mono', monospace" }}>{value}</span>
      <span style={{ color:C.textDim, fontSize:"9px", letterSpacing:"0.12em", textTransform:"uppercase" }}>{label}</span>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  SCREEN 1 — WELCOME
// ════════════════════════════════════════════════════════════════════════════
function WelcomeScreen({ onStart }) {
  const [phase, setPhase] = useState(0);
  const [btnHovered, setBtnHovered] = useState(false);
  const [idValue, setIdValue] = useState("");
  const [scanLine, setScanLine] = useState(0);
  const canvasRef = useRef(null);
  useNeuralCanvas(canvasRef);

  useEffect(() => {
    const ts=[150,500,900,1300,1700].map((d,i)=>setTimeout(()=>setPhase(i+1),d));
    return ()=>ts.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const iv=setInterval(()=>setScanLine(p=>(p+1)%100),32);
    return ()=>clearInterval(iv);
  }, []);

  const v = (n) => ({ opacity:phase>=n?1:0, transform:phase>=n?"translateY(0)":"translateY(12px)", transition:"opacity 0.7s ease, transform 0.7s cubic-bezier(0.16,1,0.3,1)" });

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", position:"relative", overflow:"hidden", fontFamily:"'IBM Plex Sans', sans-serif", color:C.textPri }}>
      <style>{`
        ${FONTS}
        @keyframes btnGlow { 0%,100%{box-shadow:0 0 0 0 rgba(88,166,255,0.25),0 0 12px rgba(88,166,255,0.08)} 50%{box-shadow:0 0 0 5px rgba(88,166,255,0),0 0 20px rgba(88,166,255,0.18)} }
        @keyframes gridBreath { 0%,100%{opacity:0.012} 50%{opacity:0.028} }
        @keyframes statusPing { 0%{transform:scale(1);opacity:0.6} 70%{transform:scale(2.2);opacity:0} 100%{transform:scale(2.2);opacity:0} }
      `}</style>

      <canvas ref={canvasRef} style={{ position:"absolute", inset:0, width:"100%", height:"100%", pointerEvents:"none" }} />
      <div style={{ position:"absolute", inset:0, pointerEvents:"none", backgroundImage:`linear-gradient(rgba(88,166,255,0.04) 1px,transparent 1px),linear-gradient(90deg,rgba(88,166,255,0.04) 1px,transparent 1px)`, backgroundSize:"52px 52px", animation:"gridBreath 8s ease-in-out infinite" }} />
      <div style={{ position:"absolute", left:0, right:0, height:"1px", pointerEvents:"none", background:`linear-gradient(90deg,transparent,rgba(88,166,255,0.07),transparent)`, top:`${scanLine}%`, transition:"top 0.032s linear" }} />

      {/* Top bar */}
      <div style={{ position:"absolute", top:0, left:0, right:0, display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 32px", borderBottom:`1px solid ${C.border}`, background:"rgba(1,4,9,0.6)", backdropFilter:"blur(8px)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:"10px" }}>
          <div style={{ position:"relative", width:"8px", height:"8px" }}>
            <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:C.success, animation:"statusPing 2.5s ease-out infinite" }} />
            <div style={{ position:"absolute", inset:0, borderRadius:"50%", background:C.success, boxShadow:`0 0 6px ${C.success}` }} />
          </div>
          <span style={{ color:C.textDim, fontSize:"10px", letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:"'IBM Plex Mono', monospace" }}>NeuralTrack — v1.0.0</span>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:"12px" }}>
          <span style={{ color:C.textDim, fontSize:"10px", fontFamily:"'IBM Plex Mono', monospace" }}>PROTOCOL / FITTS-1954</span>
          <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"4px", padding:"3px 8px" }}>
            <span style={{ color:C.success, fontSize:"9px", letterSpacing:"0.1em", fontFamily:"'IBM Plex Mono', monospace" }}>● READY</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ position:"relative", zIndex:10, display:"flex", flexDirection:"column", alignItems:"center", maxWidth:"660px", padding:"0 32px", textAlign:"center" }}>
        <div style={{ ...v(1), marginBottom:"20px", display:"flex", alignItems:"center", gap:"12px" }}>
          <div style={{ height:"1px", width:"28px", background:"rgba(88,166,255,0.3)" }} />
          <span style={{ color:C.primary, fontSize:"10px", letterSpacing:"0.22em", textTransform:"uppercase", fontFamily:"'IBM Plex Mono', monospace" }}>Cognitive Neuroscience · Motor Control Lab</span>
          <div style={{ height:"1px", width:"28px", background:"rgba(88,166,255,0.3)" }} />
        </div>

        <h1 style={{ ...v(2), fontFamily:"'IBM Plex Sans', sans-serif", fontWeight:600, fontSize:"clamp(38px,6vw,62px)", letterSpacing:"0.12em", textTransform:"uppercase", lineHeight:1, color:C.textPri, marginBottom:"6px" }}>
          NeuralTrack
        </h1>
        <p style={{ ...v(2), fontFamily:"'IBM Plex Serif', serif", fontStyle:"italic", fontWeight:300, fontSize:"15px", color:C.textSec, marginTop:"8px", marginBottom:"28px" }}>
          Cognitive Load via Motor Precision
        </p>

        <div style={{ ...v(3), width:"36px", height:"1px", background:"rgba(88,166,255,0.25)", marginBottom:"24px" }} />

        <p style={{ ...v(3), fontWeight:300, fontSize:"14px", lineHeight:1.85, color:C.textSec, maxWidth:"520px", marginBottom:"12px" }}>
          A browser-based implementation of the <span style={{ color:C.textPri, fontStyle:"italic" }}>Fitts's Law serial targeting paradigm</span>, designed to measure kinematic micro-variability as a quantitative proxy for cognitive load. Reaction time, movement jitter, and throughput are derived per-trial and aggregated into a <span style={{ color:C.primary, fontWeight:400 }}>motor phenotype profile</span>.
        </p>
        <p style={{ ...v(3), fontFamily:"'IBM Plex Mono', monospace", fontSize:"10px", color:C.textDim, letterSpacing:"0.06em", marginBottom:"36px" }}>
          ref. Fitts, P.M. (1954) · Welford, A.T. (1968) · MacKenzie, I.S. (1992)
        </p>

        <div style={{ ...v(4), display:"flex", flexDirection:"column", alignItems:"center", gap:"6px", marginBottom:"28px" }}>
          <label style={{ fontFamily:"'IBM Plex Mono', monospace", fontSize:"9px", letterSpacing:"0.18em", textTransform:"uppercase", color:C.textDim }}>
            Subject ID <span style={{ color:"#21262D" }}>(optional)</span>
          </label>
          <input type="text" placeholder="e.g. S-001" value={idValue} onChange={e=>setIdValue(e.target.value)} maxLength={12}
            style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"6px", color:C.textPri, fontSize:"13px", fontFamily:"'IBM Plex Mono', monospace", letterSpacing:"0.1em", padding:"9px 18px", outline:"none", textAlign:"center", width:"150px", transition:"border-color 0.2s, box-shadow 0.2s" }}
            onFocus={e=>{e.target.style.borderColor=C.primary;e.target.style.boxShadow=`0 0 0 3px rgba(88,166,255,0.1)`;}}
            onBlur={e=>{e.target.style.borderColor=C.border;e.target.style.boxShadow="none";}}
          />
        </div>

        <button onMouseEnter={()=>setBtnHovered(true)} onMouseLeave={()=>setBtnHovered(false)}
          onClick={()=>onStart(idValue||"S-001")}
          style={{ ...v(4), background:btnHovered?C.primary:"rgba(88,166,255,0.1)", border:`1px solid ${btnHovered?C.primary:"rgba(88,166,255,0.35)"}`, borderRadius:"6px", color:btnHovered?C.bg:C.primary, fontSize:"11px", fontWeight:"600", letterSpacing:"0.2em", textTransform:"uppercase", padding:"13px 52px", cursor:"pointer", fontFamily:"'IBM Plex Mono', monospace", animation:phase>=4?"btnGlow 3.5s ease-in-out infinite":"none", transition:"background 0.2s, color 0.2s, border-color 0.2s, opacity 0.7s, transform 0.7s" }}>
          Initialize Protocol →
        </button>

        <div style={{ display:"flex", gap:"10px", marginTop:"44px", flexWrap:"wrap", justifyContent:"center" }}>
          <MetricPill label="Trials"   value="n = 10"   delay={2000} />
          <MetricPill label="Sampling" value="~60 Hz"   delay={2200} />
          <MetricPill label="Duration" value="≈ 2 min"  delay={2400} />
          <MetricPill label="Paradigm" value="Serial"   delay={2600} />
          <MetricPill label="Index"    value="Fitts ID" delay={2800} />
        </div>
      </div>

      {/* Footer */}
      <div style={{ position:"absolute", bottom:0, left:0, right:0, display:"flex", justifyContent:"space-between", padding:"12px 32px", borderTop:`1px solid ${C.border}`, background:"rgba(1,4,9,0.6)", backdropFilter:"blur(8px)" }}>
        <span style={{ color:C.textDim, fontSize:"9px", letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:"'IBM Plex Mono', monospace" }}>For research purposes only — Non-clinical tool</span>
        <span style={{ color:C.textDim, fontSize:"9px", fontFamily:"'IBM Plex Mono', monospace" }}>Browser-based · No data transmission</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  SCREEN 2 — EXPERIMENT
// ════════════════════════════════════════════════════════════════════════════
function ExperimentScreen({ subjectId, onComplete }) {
  const canvasRef = useRef(null);
  const samplerRef = useRef(null);
  const mouseRef = useRef({x:0,y:0});
  const stateRef = useRef({ phase:"countdown", trialIndex:0, trialData:[], currentPath:[], reactionStart:null, moveStart:null, targetPos:null, targetSize:null, prevTargetPos:null, countdown:3 });
  const [ui, setUi] = useState({ phase:"countdown", trialIndex:0, countdown:3 });
  const rafRef = useRef(null);

  const syncUi = useCallback(() => {
    const s=stateRef.current;
    setUi({ phase:s.phase, trialIndex:s.trialIndex, countdown:s.countdown });
  }, []);

  const getTargetPx = useCallback((pos) => {
    const cvs=canvasRef.current; if(!cvs) return {x:0,y:0};
    return { x:pos.x*cvs.width, y:pos.y*cvs.height };
  }, []);

  const advanceTrial = useCallback(() => {
    const s=stateRef.current;
    const next=s.trialIndex+1;
    if (next>=TOTAL_TRIALS) {
      s.phase="done"; syncUi();
      setTimeout(()=>onComplete(s.trialData),1200);
      return;
    }
    s.prevTargetPos=s.targetPos; s.trialIndex=next;
    s.targetPos=TARGET_POSITIONS[next+1]??TARGET_POSITIONS[0];
    s.targetSize=TARGET_SIZES[next];
    s.currentPath=[]; s.reactionStart=performance.now(); s.moveStart=null; s.phase="waiting";
    syncUi();
  }, [syncUi, onComplete]);

  const draw = useCallback(() => {
    const cvs=canvasRef.current; if(!cvs) return;
    const ctx=cvs.getContext("2d");
    ctx.clearRect(0,0,cvs.width,cvs.height);
    const s=stateRef.current;

    // Trajectory — bleu primaire
    if (s.currentPath.length>1) {
      ctx.beginPath();
      ctx.moveTo(s.currentPath[0].x,s.currentPath[0].y);
      for(let i=1;i<s.currentPath.length;i++) ctx.lineTo(s.currentPath[i].x,s.currentPath[i].y);
      ctx.strokeStyle="rgba(88,166,255,0.2)"; ctx.lineWidth=1.5; ctx.lineJoin="round"; ctx.lineCap="round"; ctx.stroke();
      const last=s.currentPath[s.currentPath.length-1];
      const g=ctx.createRadialGradient(last.x,last.y,0,last.x,last.y,8);
      g.addColorStop(0,"rgba(88,166,255,0.4)"); g.addColorStop(1,"rgba(88,166,255,0)");
      ctx.beginPath(); ctx.arc(last.x,last.y,8,0,Math.PI*2); ctx.fillStyle=g; ctx.fill();
    }

    // Target
    if (s.targetPos && s.phase!=="countdown" && s.phase!=="done") {
      const {x:tx,y:ty}=getTargetPx(s.targetPos);
      const r=s.targetSize/2;
      const glow=ctx.createRadialGradient(tx,ty,r*0.4,tx,ty,r*2.2);
      glow.addColorStop(0,"rgba(88,166,255,0.2)"); glow.addColorStop(1,"rgba(88,166,255,0)");
      ctx.beginPath(); ctx.arc(tx,ty,r*2.2,0,Math.PI*2); ctx.fillStyle=glow; ctx.fill();
      ctx.beginPath(); ctx.arc(tx,ty,r,0,Math.PI*2); ctx.fillStyle=C.primary; ctx.fill();
      ctx.beginPath(); ctx.arc(tx,ty,r*0.3,0,Math.PI*2); ctx.fillStyle="rgba(255,255,255,0.5)"; ctx.fill();
      ctx.beginPath(); ctx.arc(tx,ty,r+6,0,Math.PI*2); ctx.strokeStyle="rgba(88,166,255,0.3)"; ctx.lineWidth=1; ctx.stroke();
    }
    rafRef.current=requestAnimationFrame(draw);
  }, [getTargetPx]);

  const handleMouseMove = useCallback((e) => {
    const cvs=canvasRef.current; if(!cvs) return;
    const rect=cvs.getBoundingClientRect();
    mouseRef.current={x:e.clientX-rect.left,y:e.clientY-rect.top};
    const s=stateRef.current;
    if (s.phase==="waiting") {
      s.moveStart=performance.now(); s.phase="moving";
      s.currentPath=[{...mouseRef.current,t:s.moveStart}];
      syncUi();
    }
  }, [syncUi]);

  const handleClick = useCallback((e) => {
    const s=stateRef.current;
    if (s.phase!=="moving"&&s.phase!=="waiting") return;
    const cvs=canvasRef.current; if(!cvs) return;
    const rect=cvs.getBoundingClientRect();
    const cx=e.clientX-rect.left, cy=e.clientY-rect.top;
    if (!s.targetPos||!s.targetSize) return;
    const {x:tx,y:ty}=getTargetPx(s.targetPos);
    if (euclidean({x:cx,y:cy},{x:tx,y:ty})>s.targetSize/2+8) return;
    const now=performance.now();
    const RT=s.moveStart?s.moveStart-s.reactionStart:now-s.reactionStart;
    const MT=s.moveStart?now-s.moveStart:0;
    const path=[...s.currentPath,{x:cx,y:cy,t:now}];
    const prevPx=s.prevTargetPos?getTargetPx(s.prevTargetPos):null;
    const D=prevPx?euclidean(prevPx,{x:tx,y:ty}):300;
    const W=s.targetSize;
    const ID=fittsID(D,W);
    const TP=MT>0?ID/(MT/1000):0;
    const actual=pathLength(path);
    const SI=D>0&&actual>0?actual/D:1;
    s.trialData.push({ trial:s.trialIndex+1, RT:Math.round(RT), MT:Math.round(MT), D:Math.round(D), W, ID:parseFloat(ID.toFixed(3)), TP:parseFloat(TP.toFixed(3)), SI:parseFloat(SI.toFixed(4)), path });
    advanceTrial();
  }, [getTargetPx, advanceTrial]);

  useEffect(() => {
    const resize=()=>{const cvs=canvasRef.current;if(cvs){cvs.width=cvs.offsetWidth;cvs.height=cvs.offsetHeight;}};
    resize(); window.addEventListener("resize",resize);
    return ()=>window.removeEventListener("resize",resize);
  }, []);

  useEffect(()=>{ rafRef.current=requestAnimationFrame(draw); return ()=>cancelAnimationFrame(rafRef.current); },[draw]);

  useEffect(() => {
    let count=3; const s=stateRef.current;
    const tick=setInterval(()=>{
      count--; s.countdown=count; syncUi();
      if(count<=0){
        clearInterval(tick);
        s.phase="waiting"; s.trialIndex=0;
        s.targetPos=TARGET_POSITIONS[1]; s.targetSize=TARGET_SIZES[0];
        s.reactionStart=performance.now(); syncUi();
        samplerRef.current=setInterval(()=>{
          if(stateRef.current.phase==="moving") stateRef.current.currentPath.push({...mouseRef.current,t:performance.now()});
        },SAMPLE_INTERVAL_MS);
      }
    },1000);
    return ()=>{clearInterval(tick);clearInterval(samplerRef.current);};
  },[syncUi]);

  const progress=ui.trialIndex/TOTAL_TRIALS;

  return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", position:"relative", overflow:"hidden", fontFamily:"'IBM Plex Sans', sans-serif", userSelect:"none" }}>
      <style>{`
        ${FONTS}
        @keyframes countPulse{0%{opacity:0;transform:scale(0.7)}20%{opacity:1;transform:scale(1.05)}80%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(1.1)}}
        @keyframes fadeIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
        @keyframes barShimmer{0%,100%{opacity:0.8}50%{opacity:1}}
      `}</style>

      {/* Progress bar */}
      <div style={{ position:"absolute", top:0, left:0, right:0, zIndex:20 }}>
        <div style={{ width:"100%", height:"2px", background:"rgba(255,255,255,0.04)" }}>
          <div style={{ height:"100%", width:`${progress*100}%`, background:`linear-gradient(90deg,rgba(88,166,255,0.5),${C.primary})`, transition:"width 0.5s cubic-bezier(0.4,0,0.2,1)", boxShadow:`0 0 8px rgba(88,166,255,0.4)`, animation:"barShimmer 2s ease-in-out infinite" }} />
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"10px 28px", borderBottom:`1px solid ${C.border}`, background:"rgba(1,4,9,0.7)", backdropFilter:"blur(8px)" }}>
          <span style={{ color:C.textDim, fontSize:"10px", letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:"'IBM Plex Mono', monospace" }}>NeuralTrack</span>
          <div style={{ display:"flex", alignItems:"center", gap:"8px" }}>
            <span style={{ color:C.textDim, fontSize:"10px", letterSpacing:"0.1em", fontFamily:"'IBM Plex Mono', monospace" }}>TRIAL</span>
            <span style={{ color:C.primary, fontSize:"13px", fontWeight:"500", fontFamily:"'IBM Plex Mono', monospace" }}>{ui.phase==="countdown"?"—":ui.trialIndex+1}</span>
            <span style={{ color:C.textDim, fontSize:"12px", fontFamily:"'IBM Plex Mono', monospace" }}>/ {TOTAL_TRIALS}</span>
          </div>
          <span style={{ color:C.textDim, fontSize:"10px", fontFamily:"'IBM Plex Mono', monospace" }}>{subjectId}</span>
        </div>
      </div>

      <canvas ref={canvasRef} onMouseMove={handleMouseMove} onClick={handleClick}
        style={{ position:"absolute", inset:0, width:"100%", height:"100%", cursor:(ui.phase==="waiting"||ui.phase==="moving")?"crosshair":"default" }} />

      {/* Recording indicator */}
      {(ui.phase==="waiting"||ui.phase==="moving") && (
        <div style={{ position:"absolute", bottom:"28px", right:"28px", zIndex:20, display:"flex", alignItems:"center", gap:"6px" }}>
          <div style={{ width:"5px", height:"5px", borderRadius:"50%", background:ui.phase==="moving"?C.primary:C.textDim, boxShadow:ui.phase==="moving"?`0 0 8px ${C.primary}`:"none", transition:"all 0.3s ease" }} />
          <span style={{ color:C.textDim, fontSize:"9px", letterSpacing:"0.12em", textTransform:"uppercase", fontFamily:"'IBM Plex Mono', monospace" }}>{ui.phase==="moving"?"Recording":"Standby"}</span>
        </div>
      )}

      {/* Hint */}
      {ui.phase==="waiting" && (
        <div style={{ position:"absolute", bottom:"36px", left:"50%", transform:"translateX(-50%)", zIndex:20, pointerEvents:"none" }}>
          <span style={{ color:C.textDim, fontSize:"10px", letterSpacing:"0.14em", textTransform:"uppercase", fontFamily:"'IBM Plex Mono', monospace" }}>Move toward target · Click to register</span>
        </div>
      )}

      {/* Countdown overlay */}
      {ui.phase==="countdown" && (
        <div style={{ position:"absolute", inset:0, zIndex:30, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"rgba(1,4,9,0.88)", backdropFilter:"blur(4px)" }}>
          <p style={{ color:C.textDim, fontSize:"10px", letterSpacing:"0.2em", textTransform:"uppercase", fontFamily:"'IBM Plex Mono', monospace", marginBottom:"24px" }}>Initializing protocol</p>
          <div key={ui.countdown} style={{ color:C.textPri, fontSize:"96px", fontWeight:"300", fontFamily:"'IBM Plex Mono', monospace", lineHeight:1, animation:"countPulse 1s ease forwards" }}>
            {ui.countdown===0?"GO":ui.countdown}
          </div>
          <p style={{ color:C.textDim, fontSize:"10px", letterSpacing:"0.12em", fontFamily:"'IBM Plex Mono', monospace", marginTop:"28px" }}>Click each target as quickly and accurately as possible</p>
        </div>
      )}

      {/* Done overlay */}
      {ui.phase==="done" && (
        <div style={{ position:"absolute", inset:0, zIndex:30, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", background:"rgba(1,4,9,0.92)", backdropFilter:"blur(6px)", animation:"fadeIn 0.6s ease" }}>
          <div style={{ width:"48px", height:"48px", borderRadius:"50%", border:`1px solid ${C.success}44`, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:"20px", boxShadow:`0 0 24px ${C.success}22` }}>
            <span style={{ color:C.success, fontSize:"20px" }}>✓</span>
          </div>
          <p style={{ fontSize:"18px", fontWeight:"300", color:C.textPri, marginBottom:"8px" }}>Session Complete</p>
          <p style={{ color:C.textSec, fontSize:"11px", letterSpacing:"0.12em", fontFamily:"'IBM Plex Mono', monospace" }}>Processing results…</p>
        </div>
      )}

      <div style={{ position:"absolute", bottom:0, left:0, right:0, zIndex:10, display:"flex", justifyContent:"space-between", padding:"10px 28px", borderTop:`1px solid ${C.border}`, background:"rgba(1,4,9,0.6)", pointerEvents:"none" }}>
        <span style={{ color:C.textDim, fontSize:"9px", letterSpacing:"0.1em", textTransform:"uppercase", fontFamily:"'IBM Plex Mono', monospace" }}>For research purposes only — Non-clinical tool</span>
        <span style={{ color:C.textDim, fontSize:"9px", fontFamily:"'IBM Plex Mono', monospace" }}>~60Hz · Fitts paradigm</span>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  SCREEN 3 — DASHBOARD
// ════════════════════════════════════════════════════════════════════════════
function MetricCard({ label, value, unit, sub, color, delay }) {
  const [vis, setVis] = useState(false);
  useEffect(()=>{const t=setTimeout(()=>setVis(true),delay);return()=>clearTimeout(t);},[delay]);
  return (
    <div style={{ opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(14px)", transition:"all 0.6s ease", background:C.card, border:`1px solid ${C.border}`, borderRadius:"6px", padding:"18px 20px", display:"flex", flexDirection:"column", gap:"6px", flex:"1", minWidth:"120px" }}>
      <span style={{ color:C.textDim, fontSize:"9px", letterSpacing:"0.16em", textTransform:"uppercase", fontFamily:"'IBM Plex Mono', monospace" }}>{label}</span>
      <div style={{ display:"flex", alignItems:"baseline", gap:"4px" }}>
        <span style={{ color, fontSize:"28px", fontWeight:"500", fontFamily:"'IBM Plex Mono', monospace", lineHeight:1 }}>{value}</span>
        {unit&&<span style={{ color:C.textSec, fontSize:"11px", fontFamily:"'IBM Plex Mono', monospace" }}>{unit}</span>}
      </div>
      {sub&&<span style={{ color:C.textSec, fontSize:"9px" }}>{sub}</span>}
    </div>
  );
}

function VelocityChart({ trials }) {
  const ref=useRef(null);
  useEffect(()=>{
    const cvs=ref.current; if(!cvs) return;
    const ctx=cvs.getContext("2d");
    const dpr=window.devicePixelRatio||1;
    cvs.width=cvs.offsetWidth*dpr; cvs.height=cvs.offsetHeight*dpr;
    ctx.scale(dpr,dpr);
    const W=cvs.offsetWidth,H=cvs.offsetHeight;
    const P={top:16,right:16,bottom:32,left:44};
    const iW=W-P.left-P.right,iH=H-P.top-P.bottom;
    ctx.clearRect(0,0,W,H);
    const profiles=trials.map(t=>{
      const pts=t.path; if(pts.length<2) return [];
      return pts.slice(1).map((p,i)=>{const dx=p.x-pts[i].x,dy=p.y-pts[i].y,dt=(p.t-pts[i].t)||1;return Math.sqrt(dx*dx+dy*dy)/dt;});
    });
    const maxV=Math.max(...profiles.flat(),0.1);
    ctx.strokeStyle=`rgba(48,54,61,0.8)`; ctx.lineWidth=1;
    for(let i=0;i<=4;i++){
      const y=P.top+(i/4)*iH;
      ctx.beginPath();ctx.moveTo(P.left,y);ctx.lineTo(P.left+iW,y);ctx.stroke();
      ctx.fillStyle=C.textDim;ctx.font=`9px 'IBM Plex Mono',monospace`;ctx.textAlign="right";
      ctx.fillText(((1-i/4)*maxV).toFixed(2),P.left-6,y+3);
    }
    ctx.fillStyle=C.textDim;ctx.font=`8px 'IBM Plex Mono',monospace`;ctx.textAlign="center";
    ctx.fillText("Time (normalized)",P.left+iW/2,H-4);
    profiles.forEach((vels,idx)=>{
      if(vels.length<2) return;
      ctx.beginPath();
      vels.forEach((v,i)=>{const x=P.left+(i/(vels.length-1))*iW,y=P.top+(1-v/maxV)*iH;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
      ctx.strokeStyle=`rgba(88,166,255,${idx===trials.length-1?0.65:0.18})`;
      ctx.lineWidth=idx===trials.length-1?1.8:0.8;ctx.lineJoin="round";ctx.stroke();
    });
    const mean60=Array.from({length:60},(_,i)=>{const t=i/59;return mean(profiles.map(p=>p[Math.floor(t*(p.length-1))]||0));});
    ctx.beginPath();
    mean60.forEach((v,i)=>{const x=P.left+(i/59)*iW,y=P.top+(1-v/maxV)*iH;i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);});
    ctx.strokeStyle=C.primary;ctx.lineWidth=2;ctx.stroke();
  },[trials]);
  return <canvas ref={ref} style={{ width:"100%",height:"100%",display:"block" }} />;
}

function ScatterPlot({ trials }) {
  const ref=useRef(null);
  useEffect(()=>{
    const cvs=ref.current; if(!cvs) return;
    const ctx=cvs.getContext("2d");
    const dpr=window.devicePixelRatio||1;
    cvs.width=cvs.offsetWidth*dpr;cvs.height=cvs.offsetHeight*dpr;
    ctx.scale(dpr,dpr);
    const W=cvs.offsetWidth,H=cvs.offsetHeight;
    const P={top:16,right:16,bottom:32,left:44};
    const iW=W-P.left-P.right,iH=H-P.top-P.bottom;
    ctx.clearRect(0,0,W,H);
    const maxID=Math.max(...trials.map(t=>t.ID),1);
    const maxTP=Math.max(...trials.map(t=>t.TP),1);
    ctx.strokeStyle=`rgba(48,54,61,0.8)`;ctx.lineWidth=1;
    for(let i=0;i<=4;i++){
      const y=P.top+(i/4)*iH;ctx.beginPath();ctx.moveTo(P.left,y);ctx.lineTo(P.left+iW,y);ctx.stroke();
      const x=P.left+(i/4)*iW;ctx.beginPath();ctx.moveTo(x,P.top);ctx.lineTo(x,P.top+iH);ctx.stroke();
    }
    ctx.fillStyle=C.textDim;ctx.font=`8px 'IBM Plex Mono',monospace`;ctx.textAlign="center";
    ctx.fillText("Fitts ID (bits)",P.left+iW/2,H-4);
    const xs=trials.map(t=>t.ID),ys=trials.map(t=>t.TP);
    const mx=mean(xs),my=mean(ys);
    const slope=xs.reduce((a,x,i)=>a+(x-mx)*(ys[i]-my),0)/xs.reduce((a,x)=>a+(x-mx)**2,0)||0;
    const b=my-slope*mx;
    ctx.beginPath();ctx.moveTo(P.left,P.top+(1-b/maxTP)*iH);ctx.lineTo(P.left+iW,P.top+(1-(slope*maxID+b)/maxTP)*iH);
    ctx.strokeStyle=`rgba(88,166,255,0.12)`;ctx.lineWidth=1;ctx.setLineDash([4,4]);ctx.stroke();ctx.setLineDash([]);
    trials.forEach(t=>{
      const x=P.left+(t.ID/maxID)*iW,y=P.top+(1-t.TP/maxTP)*iH;
      const g=ctx.createRadialGradient(x,y,0,x,y,10);
      g.addColorStop(0,"rgba(88,166,255,0.25)");g.addColorStop(1,"rgba(88,166,255,0)");
      ctx.beginPath();ctx.arc(x,y,10,0,Math.PI*2);ctx.fillStyle=g;ctx.fill();
      ctx.beginPath();ctx.arc(x,y,3.5,0,Math.PI*2);ctx.fillStyle=C.primary;ctx.fill();
      ctx.fillStyle=C.textDim;ctx.font=`8px 'IBM Plex Mono',monospace`;ctx.textAlign="center";
      ctx.fillText(`T${t.trial}`,x,y-9);
    });
  },[trials]);
  return <canvas ref={ref} style={{ width:"100%",height:"100%",display:"block" }} />;
}

function ResultsDashboard({ trialData, subjectId, onRestart }) {
  const trials=trialData;
  const [vis, setVis] = useState(false);
  const [limitsOpen, setLimitsOpen] = useState(false);
  useEffect(()=>{setTimeout(()=>setVis(true),100);},[]);

  const meanRT=Math.round(mean(trials.map(t=>t.RT)));
  const meanMT=Math.round(mean(trials.map(t=>t.MT)));
  const meanSI=mean(trials.map(t=>t.SI)).toFixed(3);
  const meanTP=mean(trials.map(t=>t.TP)).toFixed(2);
  const cogScore=cognitiveScore(trials);
  const load=loadLabel(cogScore);
  const siColor=parseFloat(meanSI)>1.15?C.amber:C.success;

  const handleExport=()=>{
    const blob=new Blob([JSON.stringify({meta:{tool:"NeuralTrack v1.0",protocol:"Fitts's Law Serial Targeting",subject:subjectId,date:new Date().toISOString(),references:["Fitts (1954)","Welford (1968)","MacKenzie (1992)"]},summary:{meanRT,meanMT,meanSI:parseFloat(meanSI),meanTP:parseFloat(meanTP),cognitiveLoadScore:cogScore,loadLabel:load.label},trials},null,2)],{type:"application/json"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`neuraltrack_${subjectId}_${Date.now()}.json`;a.click();
  };

  const btnStyle=(primary)=>({
    background:primary?`rgba(88,166,255,0.1)`:"transparent",
    border:`1px solid ${primary?"rgba(88,166,255,0.35)":C.border}`,
    borderRadius:"6px",
    color:primary?C.primary:C.textSec,
    fontSize:"10px",fontWeight:"500",letterSpacing:"0.12em",textTransform:"uppercase",
    padding:"8px 16px",cursor:"pointer",fontFamily:"'IBM Plex Mono', monospace",
    transition:"background 0.2s, color 0.2s",
  });

  return (
    <div style={{ minHeight:"100vh", background:C.bg, color:C.textPri, fontFamily:"'IBM Plex Sans', sans-serif", overflowY:"auto" }}>
      <style>{`
        ${FONTS}
        @keyframes slideUp{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
        ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-track{background:${C.bg}}::-webkit-scrollbar-thumb{background:${C.border};border-radius:2px}
      `}</style>

      {/* Header */}
      <div style={{ borderBottom:`1px solid ${C.border}`, padding:"18px 32px", display:"flex", justifyContent:"space-between", alignItems:"center", background:"rgba(1,4,9,0.8)", backdropFilter:"blur(8px)", opacity:vis?1:0, transition:"opacity 0.6s ease", position:"sticky", top:0, zIndex:10 }}>
        <div>
          <div style={{ display:"flex", alignItems:"center", gap:"10px", marginBottom:"2px" }}>
            <div style={{ width:"5px", height:"5px", borderRadius:"50%", background:C.primary, boxShadow:`0 0 6px ${C.primary}` }} />
            <span style={{ color:C.primary, fontSize:"10px", letterSpacing:"0.2em", textTransform:"uppercase", fontFamily:"'IBM Plex Mono', monospace" }}>Neural Profile — Session Report</span>
          </div>
          <p style={{ color:C.textDim, fontSize:"10px", fontFamily:"'IBM Plex Mono', monospace", letterSpacing:"0.08em" }}>
            Subject: {subjectId} · {new Date().toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"})} · n={trials.length} trials
          </p>
        </div>
        <div style={{ display:"flex", gap:"10px" }}>
          <button onClick={handleExport} style={btnStyle(true)}
            onMouseEnter={e=>e.target.style.background="rgba(88,166,255,0.18)"}
            onMouseLeave={e=>e.target.style.background="rgba(88,166,255,0.1)"}>↓ Export JSON</button>
          <button onClick={onRestart} style={btnStyle(false)}
            onMouseEnter={e=>{e.target.style.color=C.textPri;e.target.style.borderColor="rgba(255,255,255,0.2)";}}
            onMouseLeave={e=>{e.target.style.color=C.textSec;e.target.style.borderColor=C.border;}}>↺ New Session</button>
        </div>
      </div>

      <div style={{ padding:"24px 32px", display:"flex", flexDirection:"column", gap:"20px" }}>

        {/* Metric cards */}
        <div style={{ display:"flex", gap:"12px", flexWrap:"wrap", animation:vis?"slideUp 0.6s ease 0.1s both":"none" }}>
          <MetricCard label="Mean Reaction Time" value={meanRT} unit="ms" sub={`SD = ${Math.round(stdDev(trials.map(t=>t.RT)))} ms`} color={C.primary} delay={200} />
          <MetricCard label="Mean Movement Time" value={meanMT} unit="ms" sub={`across ${trials.length} trials`} color={C.primary} delay={300} />
          <MetricCard label="Straightness Index" value={meanSI} sub={parseFloat(meanSI)>1.15?"⚠ Elevated jitter":"Within normal range"} color={siColor} delay={400} />
          <MetricCard label="Fitts Throughput" value={meanTP} unit="bps" sub={`ID: ${Math.min(...trials.map(t=>t.ID)).toFixed(1)}–${Math.max(...trials.map(t=>t.ID)).toFixed(1)} bits`} color={C.primary} delay={500} />

          {/* Score circle */}
          <div style={{ opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(14px)", transition:"all 0.6s ease 0.6s", background:C.card, border:`1px solid ${C.border}`, borderRadius:"6px", padding:"18px 24px", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:"4px", flex:"1", minWidth:"160px" }}>
            <span style={{ color:C.textDim, fontSize:"9px", letterSpacing:"0.16em", textTransform:"uppercase", fontFamily:"'IBM Plex Mono', monospace" }}>Cognitive Load</span>
            <svg width="72" height="72" viewBox="0 0 72 72">
              <circle cx="36" cy="36" r="28" fill="none" stroke={C.border} strokeWidth="4"/>
              <circle cx="36" cy="36" r="28" fill="none" stroke={load.color} strokeWidth="4" strokeLinecap="round" strokeDasharray="175.9" strokeDashoffset={175.9-(cogScore/100)*175.9} transform="rotate(-90 36 36)" style={{ transition:"stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1) 0.8s" }}/>
              <text x="36" y="40" textAnchor="middle" fill={load.color} fontSize="16" fontFamily="IBM Plex Mono" fontWeight="500">{cogScore}</text>
            </svg>
            <span style={{ color:load.color, fontSize:"11px", fontWeight:"500", fontFamily:"'IBM Plex Mono', monospace" }}>{load.label}</span>
            <p style={{ color:C.textDim, fontSize:"9px", fontWeight:300, lineHeight:1.6, textAlign:"center", maxWidth:"130px", marginTop:"2px" }}>
              {cogScore<30
                ? "Fast reactions & straight trajectories — minimal cognitive interference detected."
                : cogScore<60
                ? "Moderate hesitation & path deviation — some cognitive load present."
                : "Slow RT & high jitter — significant cognitive load detected across trials."}
            </p>
          </div>
        </div>

        {/* Charts */}
        <div style={{ display:"flex", gap:"16px", flexWrap:"wrap", animation:vis?"slideUp 0.6s ease 0.3s both":"none" }}>
          <div style={{ flex:"3", minWidth:"300px", height:"220px", background:C.card, border:`1px solid ${C.border}`, borderRadius:"6px", padding:"16px", display:"flex", flexDirection:"column", gap:"10px" }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <span style={{ color:C.textDim, fontSize:"9px", letterSpacing:"0.16em", textTransform:"uppercase", fontFamily:"'IBM Plex Mono', monospace" }}>Velocity Profile · All Trials</span>
              <div style={{ display:"flex", gap:"10px" }}>
                {[["individual","rgba(88,166,255,0.4)",1],["mean",C.primary,2]].map(([l,c,w])=>(
                  <div key={l} style={{ display:"flex", alignItems:"center", gap:"4px" }}>
                    <div style={{ width:"16px", height:`${w}px`, background:c }} />
                    <span style={{ color:C.textDim, fontSize:"8px", fontFamily:"'IBM Plex Mono', monospace" }}>{l}</span>
                  </div>
                ))}
              </div>
            </div>
            <div style={{ flex:1 }}><VelocityChart trials={trials} /></div>
          </div>
          <div style={{ flex:"2", minWidth:"220px", height:"220px", background:C.card, border:`1px solid ${C.border}`, borderRadius:"6px", padding:"16px", display:"flex", flexDirection:"column", gap:"10px" }}>
            <span style={{ color:C.textDim, fontSize:"9px", letterSpacing:"0.16em", textTransform:"uppercase", fontFamily:"'IBM Plex Mono', monospace" }}>Fitts ID × Throughput</span>
            <div style={{ flex:1 }}><ScatterPlot trials={trials} /></div>
          </div>
        </div>

        {/* Table */}
        <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:"6px", overflow:"hidden", animation:vis?"slideUp 0.6s ease 0.5s both":"none" }}>
          <div style={{ padding:"12px 16px", borderBottom:`1px solid ${C.border}` }}>
            <span style={{ color:C.textDim, fontSize:"9px", letterSpacing:"0.16em", textTransform:"uppercase", fontFamily:"'IBM Plex Mono', monospace" }}>Trial-by-Trial Data</span>
          </div>
          <div style={{ overflowX:"auto" }}>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:"11px", fontFamily:"'IBM Plex Mono', monospace" }}>
              <thead>
                <tr>{["Trial","RT (ms)","MT (ms)","Distance","Width","Fitts ID","TP (bps)","SI"].map(h=>(
                  <th key={h} style={{ padding:"8px 14px", textAlign:"right", color:C.textDim, fontSize:"8px", letterSpacing:"0.1em", textTransform:"uppercase", fontWeight:400, borderBottom:`1px solid ${C.border}`, whiteSpace:"nowrap" }}>{h}</th>
                ))}</tr>
              </thead>
              <tbody>
                {trials.map((t,i)=>{
                  const hi=t.SI>1.15;
                  return (
                    <tr key={i} style={{ borderBottom:`1px solid rgba(48,54,61,0.5)` }}
                      onMouseEnter={e=>e.currentTarget.style.background="rgba(88,166,255,0.04)"}
                      onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                      <td style={{ padding:"7px 14px", textAlign:"right", color:C.textDim }}>T{t.trial}</td>
                      <td style={{ padding:"7px 14px", textAlign:"right", color:C.textSec }}>{t.RT}</td>
                      <td style={{ padding:"7px 14px", textAlign:"right", color:C.textSec }}>{t.MT}</td>
                      <td style={{ padding:"7px 14px", textAlign:"right", color:C.textDim }}>{t.D}px</td>
                      <td style={{ padding:"7px 14px", textAlign:"right", color:C.textDim }}>{t.W}px</td>
                      <td style={{ padding:"7px 14px", textAlign:"right", color:C.primary }}>{t.ID.toFixed(2)}</td>
                      <td style={{ padding:"7px 14px", textAlign:"right", color:C.primary }}>{t.TP.toFixed(2)}</td>
                      <td style={{ padding:"7px 14px", textAlign:"right", color:hi?C.amber:C.textDim }}>{t.SI.toFixed(3)}{hi?" ⚠":""}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr style={{ borderTop:`1px solid ${C.border}` }}>
                  <td style={{ padding:"8px 14px", textAlign:"right", color:C.textDim, fontSize:"8px" }}>MEAN</td>
                  <td style={{ padding:"8px 14px", textAlign:"right", color:C.primary }}>{meanRT}</td>
                  <td style={{ padding:"8px 14px", textAlign:"right", color:C.primary }}>{meanMT}</td>
                  <td colSpan={2}/>
                  <td style={{ padding:"8px 14px", textAlign:"right", color:C.primary }}>{mean(trials.map(t=>t.ID)).toFixed(2)}</td>
                  <td style={{ padding:"8px 14px", textAlign:"right", color:C.primary }}>{meanTP}</td>
                  <td style={{ padding:"8px 14px", textAlign:"right", color:parseFloat(meanSI)>1.15?C.amber:C.success }}>{meanSI}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Limitations */}
        <div style={{ border:`1px solid ${C.border}`, borderRadius:"6px", overflow:"hidden", animation:vis?"slideUp 0.6s ease 0.7s both":"none" }}>
          <button onClick={()=>setLimitsOpen(o=>!o)} style={{ width:"100%", display:"flex", justifyContent:"space-between", alignItems:"center", padding:"12px 16px", background:"transparent", border:"none", cursor:"pointer" }}>
            <span style={{ color:C.textDim, fontSize:"9px", letterSpacing:"0.16em", textTransform:"uppercase", fontFamily:"'IBM Plex Mono', monospace" }}>Methodological Limitations</span>
            <span style={{ color:C.textDim, fontSize:"11px", fontFamily:"'IBM Plex Mono', monospace" }}>{limitsOpen?"−":"+"}</span>
          </button>
          {limitsOpen && (
            <div style={{ padding:"4px 16px 16px", display:"flex", flexDirection:"column", gap:"8px", borderTop:`1px solid ${C.border}` }}>
              {[
                ["Sampling frequency","Browser capped at ~60Hz vs. 1000Hz in clinical setups — sub-millisecond precision unavailable."],
                ["Hardware bias","Results vary across input devices (gaming mouse vs. trackpad). No hardware normalization applied."],
                ["DOM latency","JavaScript event loop introduces non-deterministic delays. This is not hard real-time (RTOS)."],
                ["Ecological validity","Screen-based motor tasks do not fully replicate pen-tablet or physical manipulation paradigms."],
                ["Sample size","n=10 trials per session is insufficient for clinical inference. Minimum n=50 recommended for research use."],
              ].map(([title,desc])=>(
                <div key={title} style={{ display:"flex", gap:"12px" }}>
                  <span style={{ color:C.textSec, fontSize:"9px", fontFamily:"'IBM Plex Mono', monospace", minWidth:"140px", paddingTop:"1px" }}>{title}</span>
                  <span style={{ color:C.textDim, fontSize:"11px", fontWeight:300, lineHeight:1.6 }}>{desc}</span>
                </div>
              ))}
              <p style={{ color:C.textDim, fontSize:"9px", fontFamily:"'IBM Plex Mono', monospace", marginTop:"4px", letterSpacing:"0.06em" }}>
                ref. Fitts, P.M. (1954) · Welford, A.T. (1968) · MacKenzie, I.S. (1992)
              </p>
            </div>
          )}
        </div>

        <div style={{ display:"flex", justifyContent:"space-between", padding:"4px 0 12px", opacity:0.3 }}>
          <span style={{ color:C.textSec, fontSize:"9px", fontFamily:"'IBM Plex Mono', monospace", letterSpacing:"0.1em" }}>For research purposes only — Non-clinical tool</span>
          <span style={{ color:C.textSec, fontSize:"9px", fontFamily:"'IBM Plex Mono', monospace" }}>NeuralTrack v1.0 · Browser-based · No data transmission</span>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  ROOT APP
// ════════════════════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState("welcome");
  const [subjectId, setSubjectId] = useState("S-001");
  const [trialData, setTrialData] = useState(null);

  const handleStart    = (id) => { setSubjectId(id); setScreen("experiment"); };
  const handleComplete = (data) => { setTrialData(data); setScreen("dashboard"); };
  const handleRestart  = () => { setTrialData(null); setScreen("welcome"); };

  return (
    <div style={{ fontFamily:"'IBM Plex Sans', sans-serif" }}>
      {screen==="welcome"    && <WelcomeScreen onStart={handleStart} />}
      {screen==="experiment" && <ExperimentScreen subjectId={subjectId} onComplete={handleComplete} />}
      {screen==="dashboard"  && trialData && <ResultsDashboard trialData={trialData} subjectId={subjectId} onRestart={handleRestart} />}
    </div>
  );
}
