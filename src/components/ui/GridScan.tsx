import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// Stripped-down GridScan — webcam/face-api removed, core grid+scan effect only
type GridScanProps = {
  lineThickness?: number;
  linesColor?: string;
  gridScale?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  lineJitter?: number;
  scanColor?: string;
  scanOpacity?: number;
  scanDirection?: 'forward' | 'backward' | 'pingpong';
  scanSoftness?: number;
  scanGlow?: number;
  scanPhaseTaper?: number;
  scanDuration?: number;
  scanDelay?: number;
  noiseIntensity?: number;
  className?: string;
  style?: React.CSSProperties;
};

const vert = `
varying vec2 vUv;
void main(){
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const frag = `
precision highp float;
uniform vec3 iResolution;
uniform float iTime;
uniform vec2 uSkew;
uniform float uTilt;
uniform float uYaw;
uniform float uLineThickness;
uniform vec3 uLinesColor;
uniform vec3 uScanColor;
uniform float uGridScale;
uniform float uLineStyle;
uniform float uLineJitter;
uniform float uScanOpacity;
uniform float uScanDirection;
uniform float uNoise;
uniform float uBloomOpacity;
uniform float uScanGlow;
uniform float uScanSoftness;
uniform float uPhaseTaper;
uniform float uScanDuration;
uniform float uScanDelay;
varying vec2 vUv;

float smoother01(float a, float b, float x){
  float t = clamp((x - a) / max(1e-5, (b - a)), 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
  vec2 p = (2.0 * fragCoord - iResolution.xy) / iResolution.y;
  vec3 ro = vec3(0.0);
  vec3 rd = normalize(vec3(p, 2.0));
  float cR = cos(uTilt), sR = sin(uTilt);
  rd.xy = mat2(cR, -sR, sR, cR) * rd.xy;
  float cY = cos(uYaw), sY = sin(uYaw);
  rd.xz = mat2(cY, -sY, sY, cY) * rd.xz;
  vec2 skew = clamp(uSkew, vec2(-0.7), vec2(0.7));
  rd.xy += skew * rd.z;

  vec3 color = vec3(0.0);
  float minT = 1e20;
  float gridScale = max(1e-5, uGridScale);
  float fadeStrength = 2.0;
  vec2 gridUV = vec2(0.0);
  float hitIsY = 1.0;

  for (int i = 0; i < 4; i++){
    float isY = float(i < 2);
    float pos = mix(-0.2, 0.2, float(i)) * isY + mix(-0.5, 0.5, float(i - 2)) * (1.0 - isY);
    float num = pos - (isY * ro.y + (1.0 - isY) * ro.x);
    float den = isY * rd.y + (1.0 - isY) * rd.x;
    float t = num / den;
    vec3 h = ro + rd * t;
    float depthBoost = smoothstep(0.0, 3.0, h.z);
    h.xy += skew * 0.15 * depthBoost;
    bool use = t > 0.0 && t < minT;
    gridUV = use ? mix(h.zy, h.xz, isY) / gridScale : gridUV;
    minT = use ? t : minT;
    hitIsY = use ? isY : hitIsY;
  }

  vec3 hit = ro + rd * minT;
  float dist = length(hit - ro);

  float jitterAmt = clamp(uLineJitter, 0.0, 1.0);
  if (jitterAmt > 0.0){
    vec2 j = vec2(sin(gridUV.y*2.7+iTime*1.8), cos(gridUV.x*2.3-iTime*1.6)) * (0.15*jitterAmt);
    gridUV += j;
  }
  float fx=fract(gridUV.x), fy=fract(gridUV.y);
  float ax=min(fx,1.0-fx), ay=min(fy,1.0-fy);
  float wx=fwidth(gridUV.x), wy=fwidth(gridUV.y);
  float halfPx=max(0.0,uLineThickness)*0.5;
  float tx=halfPx*wx, ty=halfPx*wy;
  float lineX=1.0-smoothstep(tx,tx+wx,ax);
  float lineY=1.0-smoothstep(ty,ty+wy,ay);
  if(uLineStyle>0.5){
    float dr=4.0, dd=0.5;
    float vy=fract(gridUV.y*dr), vx=fract(gridUV.x*dr);
    float dmY=step(vy,dd), dmX=step(vx,dd);
    if(uLineStyle<1.5){ lineX*=dmY; lineY*=dmX; }
    else {
      float dr2=6.0, dw=0.18;
      float cy=abs(fract(gridUV.y*dr2)-0.5), cx2=abs(fract(gridUV.x*dr2)-0.5);
      lineX*=1.0-smoothstep(dw,dw+fwidth(gridUV.y*dr2),cy);
      lineY*=1.0-smoothstep(dw,dw+fwidth(gridUV.x*dr2),cx2);
    }
  }
  float primaryMask=max(lineX,lineY);

  vec2 gridUV2=(hitIsY>0.5?hit.xz:hit.zy)/gridScale;
  if(jitterAmt>0.0){
    vec2 j2=vec2(cos(gridUV2.y*2.1-iTime*1.4),sin(gridUV2.x*2.5+iTime*1.7))*(0.15*jitterAmt);
    gridUV2+=j2;
  }
  float fx2=fract(gridUV2.x),fy2=fract(gridUV2.y);
  float ax2=min(fx2,1.0-fx2),ay2=min(fy2,1.0-fy2);
  float wx2=fwidth(gridUV2.x),wy2=fwidth(gridUV2.y);
  float tx2=halfPx*wx2,ty2=halfPx*wy2;
  float lX2=1.0-smoothstep(tx2,tx2+wx2,ax2);
  float lY2=1.0-smoothstep(ty2,ty2+wy2,ay2);
  float edgeDistX=min(abs(hit.x-(-0.5)),abs(hit.x-0.5));
  float edgeDistY=min(abs(hit.y-(-0.2)),abs(hit.y-0.2));
  float edgeDist=mix(edgeDistY,edgeDistX,hitIsY);
  float edgeGate=1.0-smoothstep(gridScale*0.5,gridScale*2.0,edgeDist);
  float altMask=max(lX2,lY2)*edgeGate;
  float lineMask=max(primaryMask,altMask);
  float fade=exp(-dist*fadeStrength);

  float dur=max(0.05,uScanDuration);
  float del=max(0.0,uScanDelay);
  float scanZMax=2.0;
  float sigma=max(0.001,0.18*max(0.1,uScanGlow)*uScanSoftness);
  float sigmaA=sigma*2.0;

  float tCycle=mod(iTime,dur+del);
  float scanPhase=clamp((tCycle-del)/dur,0.0,1.0);
  float phase=scanPhase;
  if(uScanDirection>0.5&&uScanDirection<1.5){ phase=1.0-phase; }
  else if(uScanDirection>1.5){
    float t2=mod(max(0.0,iTime-del),2.0*dur);
    phase=(t2<dur)?(t2/dur):(1.0-(t2-dur)/dur);
  }
  float scanZ=phase*scanZMax;
  float dz=abs(hit.z-scanZ);
  float lineBand=exp(-0.5*(dz*dz)/(sigma*sigma));
  float taper=clamp(uPhaseTaper,0.0,0.49);
  float phaseWindow=smoother01(0.0,taper,phase)*(1.0-smoother01(1.0-taper,1.0,phase));
  float pulse=lineBand*phaseWindow*clamp(uScanOpacity,0.0,1.0);
  float aura=exp(-0.5*(dz*dz)/(sigmaA*sigmaA))*0.25*phaseWindow*clamp(uScanOpacity,0.0,1.0);

  vec3 gridCol=uLinesColor*lineMask*fade;
  vec3 scanCol=uScanColor*pulse;
  vec3 scanAura=uScanColor*aura;
  color=gridCol+scanCol+scanAura;

  float n=fract(sin(dot(gl_FragCoord.xy+vec2(iTime*123.4),vec2(12.9898,78.233)))*43758.5453123);
  color+=(n-0.5)*uNoise;
  color=clamp(color,0.0,1.0);
  float alpha=clamp(max(lineMask,pulse),0.0,1.0);
  float gx=1.0-smoothstep(tx*2.0,tx*2.0+wx*2.0,ax);
  float gy=1.0-smoothstep(ty*2.0,ty*2.0+wy*2.0,ay);
  float halo=max(gx,gy)*fade;
  alpha=max(alpha,halo*clamp(uBloomOpacity,0.0,1.0));
  fragColor=vec4(color,alpha);
}

void main(){
  vec4 c;
  mainImage(c, vUv*iResolution.xy);
  gl_FragColor=c;
}
`;

function srgbColor(hex: string) {
  return new THREE.Color(hex).convertSRGBToLinear();
}

const GridScan: React.FC<GridScanProps> = ({
  lineThickness = 1,
  linesColor = '#392e4e',
  scanColor = '#6366F1',
  scanOpacity = 0.6,
  gridScale = 0.1,
  lineStyle = 'solid',
  lineJitter = 0.1,
  scanDirection = 'pingpong',
  noiseIntensity = 0.01,
  scanGlow = 0.5,
  scanSoftness = 2,
  scanPhaseTaper = 0.9,
  scanDuration = 2.0,
  scanDelay = 1.5,
  className,
  style,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.autoClear = false;
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const uniforms = {
      iResolution: { value: new THREE.Vector3(container.clientWidth, container.clientHeight, renderer.getPixelRatio()) },
      iTime: { value: 0 },
      uSkew: { value: new THREE.Vector2(0, 0) },
      uTilt: { value: 0 },
      uYaw: { value: 0 },
      uLineThickness: { value: lineThickness },
      uLinesColor: { value: srgbColor(linesColor) },
      uScanColor: { value: srgbColor(scanColor) },
      uGridScale: { value: gridScale },
      uLineStyle: { value: lineStyle === 'dashed' ? 1 : lineStyle === 'dotted' ? 2 : 0 },
      uLineJitter: { value: Math.max(0, Math.min(1, lineJitter)) },
      uScanOpacity: { value: scanOpacity },
      uNoise: { value: noiseIntensity },
      uBloomOpacity: { value: 0 },
      uScanGlow: { value: scanGlow },
      uScanSoftness: { value: scanSoftness },
      uPhaseTaper: { value: scanPhaseTaper },
      uScanDuration: { value: scanDuration },
      uScanDelay: { value: scanDelay },
      uScanDirection: { value: scanDirection === 'backward' ? 1 : scanDirection === 'pingpong' ? 2 : 0 },
    };

    const material = new THREE.ShaderMaterial({
      uniforms,
      vertexShader: vert,
      fragmentShader: frag,
      transparent: true,
      depthWrite: false,
      depthTest: false,
    });

    const scene = new THREE.Scene();
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
    scene.add(quad);

    const onResize = () => {
      renderer.setSize(container.clientWidth, container.clientHeight);
      material.uniforms.iResolution.value.set(container.clientWidth, container.clientHeight, renderer.getPixelRatio());
    };
    window.addEventListener('resize', onResize);

    const onMouseMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      const nx = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ny = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      material.uniforms.uSkew.value.set(nx * 0.08, -ny * 0.08);
    };
    container.addEventListener('mousemove', onMouseMove);

    let rafId: number;
    const tick = () => {
      rafId = requestAnimationFrame(tick);
      material.uniforms.iTime.value = performance.now() / 1000;
      renderer.clear(true, true, true);
      renderer.render(scene, camera);
    };
    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      container.removeEventListener('mousemove', onMouseMove);
      material.dispose();
      (quad.geometry as THREE.BufferGeometry).dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, [lineThickness, linesColor, scanColor, scanOpacity, gridScale, lineStyle,
      lineJitter, scanDirection, noiseIntensity, scanGlow, scanSoftness,
      scanPhaseTaper, scanDuration, scanDelay]);

  return <div ref={containerRef} className={`relative w-full h-full overflow-hidden ${className ?? ''}`} style={style} />;
};

export default GridScan;
