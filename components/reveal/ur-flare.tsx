"use client";
// Ported from gambit/src/app/play/[gameId]/ur-flare.tsx — procedural WebGL lens flare, no assets.
import { useEffect, useRef, useState } from "react";

const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;
const FRAG = `
precision highp float;
uniform vec2 u_res; uniform vec2 u_center; uniform float u_t; uniform vec3 u_tint; uniform float u_rainbow;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){ vec2 i=floor(p), f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),u.x), mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),u.x), u.y); }
void main(){
  vec2 uv=(gl_FragCoord.xy-u_center)/min(u_res.x,u_res.y); float r=length(uv); float a=atan(uv.y,uv.x); vec2 ca=vec2(cos(a),sin(a));
  float n1=noise(ca*6.5+u_t*0.38); float n2=noise(ca*17.0-u_t*0.30+7.3);
  float rays=pow(n1*0.65+n2*0.55,5.0)*2.2; rays*=0.72+0.28*noise(vec2(a*20.0,r*5.0-u_t*1.6)); rays*=smoothstep(1.25,0.18,r)*smoothstep(0.0,0.14,r);
  float hue=a/6.28318+u_t*0.035; vec3 rainbow=0.55+0.45*cos(6.28318*(hue+vec3(0.0,0.33,0.67))); vec3 base=mix(u_tint,rainbow,u_rainbow);
  float washAmt=mix(0.45,0.32,u_rainbow); float hotMix=mix(0.18,0.35,u_rainbow); vec3 wash=base*washAmt*smoothstep(1.15,0.05,r);
  vec3 rayCol=mix(base,vec3(1.0),hotMix)*rays; float breathe=0.92+0.08*sin(u_t*2.2);
  vec3 core=vec3(1.0)*exp(-r*9.0)*1.6*breathe; vec3 bloom=mix(base,vec3(1.0,0.95,0.88),0.5)*exp(-r*3.2)*0.55*breathe;
  float streak=exp(-pow(abs(uv.y)*16.0,1.4))*exp(-abs(uv.x)*2.4)*0.8; vec3 streakCol=vec3(1.0,0.93,0.82)*streak;
  vec3 col=wash+rayCol+core+bloom+streakCol; col*=smoothstep(1.45,0.9,r)*0.35+0.65*smoothstep(1.2,0.4,r);
  gl_FragColor=vec4(col,1.0); }`;
// tier 1 grey · 2 blue · 3 red · 4 gold · 5 rainbow
const TINTS: Record<number, [number, number, number]> = { 1: [0.72, 0.7, 0.65], 2: [0.33, 0.45, 1.0], 3: [0.95, 0.28, 0.24], 4: [1.0, 0.78, 0.22] };

export function UrFlare({ tier, className }: { tier: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [webgl, setWebgl] = useState(true);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const gl = canvas.getContext("webgl", { antialias: false, depth: false, stencil: false });
    if (!gl) { setWebgl(false); return; }
    const compile = (type: number, src: string) => { const s = gl.createShader(type); if (!s) return null; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const vs = compile(gl.VERTEX_SHADER, VERT), fs = compile(gl.FRAGMENT_SHADER, FRAG), prog = gl.createProgram();
    if (!vs || !fs || !prog) { setWebgl(false); return; }
    gl.attachShader(prog, vs); gl.attachShader(prog, fs); gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) { setWebgl(false); return; }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p"); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, "u_res"), uCenter = gl.getUniformLocation(prog, "u_center"), uT = gl.getUniformLocation(prog, "u_t");
    gl.uniform3f(gl.getUniformLocation(prog, "u_tint"), ...(TINTS[tier] ?? TINTS[1]!));
    gl.uniform1f(gl.getUniformLocation(prog, "u_rainbow"), tier >= 5 ? 1 : 0);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const resize = () => { const w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr); if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; gl.viewport(0, 0, w, h); } };
    const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0; const t0 = performance.now();
    const frame = () => { gl.uniform2f(uRes, canvas.width, canvas.height); gl.uniform2f(uCenter, canvas.width * 0.5, canvas.height * 0.5); gl.uniform1f(uT, still ? 12 : (performance.now() - t0) / 1000); gl.drawArrays(gl.TRIANGLES, 0, 3); if (!still) raf = requestAnimationFrame(frame); };
    frame();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); gl.getExtension("WEBGL_lose_context")?.loseContext(); };
  }, [tier]);
  if (!webgl) return tier >= 5 ? <div aria-hidden className={`${className} bg-[conic-gradient(from_0deg,#f87171,#fbbf24,#4ade80,#60a5fa,#c084fc,#f87171)] opacity-60 blur-2xl`} /> : null;
  return <canvas ref={ref} aria-hidden className={className} />;
}
