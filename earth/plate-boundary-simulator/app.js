import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { Sky } from "three/addons/objects/Sky.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

/* =========================================================
   DOM
========================================================= */
const $ = (id) => document.getElementById(id);
const canvas = $("simCanvas");
const wrap = $("canvasWrap");
const boundaryType = $("boundaryType");
const speedSlider = $("speed");
const magmaSlider = $("magma");
const quakeSlider = $("quake");
const showArrows = $("showArrows");
const showLabels = $("showLabels");
const showQuakes = $("showQuakes");
const showMagma = $("showMagma");
const showPlates = $("showPlates");
const showMantle = $("showMantle");
const showBoundary = $("showBoundary");
const infoTitle = $("infoTitle");
const infoText = $("infoText");
const exampleList = $("exampleList");
const mapMarkers = $("mapMarkers");
const labelLayer = $("labelLayer");
const legendBox = $("legend");
const loadingBox = $("loading");

/* =========================================================
   CONSTANTS  (1 unit ≈ 수십 km, 수직 과장 포함)
========================================================= */
const X0 = -10, X1 = 10, Z0 = -5, Z1 = 5, YB = -6;
const XT = -1.5;   // 수렴형: 해구 위치
const KS = 0.075;  // 수렴형: 섭입판 곡률
const FAULT_D = 1.2; // 보존형: 고착 깊이(탄성 휨 폭)

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (e0, e1, x) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};
const sq = (v) => v * v;

/* =========================================================
   SIMPLEX NOISE (2D)
========================================================= */
const perm = new Uint8Array(512);
const permMod8 = new Uint8Array(512);
(() => {
  const p = new Uint8Array(256);
  for (let i = 0; i < 256; i++) p[i] = i;
  let s = 20240611;
  for (let i = 255; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    const t = p[i]; p[i] = p[j]; p[j] = t;
  }
  for (let i = 0; i < 512; i++) {
    perm[i] = p[i & 255];
    permMod8[i] = perm[i] % 8;
  }
})();
const GR = new Float32Array([1, 1, -1, 1, 1, -1, -1, -1, 1, 0, -1, 0, 0, 1, 0, -1]);
const F2 = 0.5 * (Math.sqrt(3) - 1);
const G2 = (3 - Math.sqrt(3)) / 6;

function snoise(xin, yin) {
  const s = (xin + yin) * F2;
  const i = Math.floor(xin + s), j = Math.floor(yin + s);
  const t = (i + j) * G2;
  const x0 = xin - (i - t), y0 = yin - (j - t);
  let i1, j1;
  if (x0 > y0) { i1 = 1; j1 = 0; } else { i1 = 0; j1 = 1; }
  const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
  const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
  const ii = i & 255, jj = j & 255;
  let n = 0;
  let t0 = 0.5 - x0 * x0 - y0 * y0;
  if (t0 > 0) { const g = permMod8[ii + perm[jj]] * 2; t0 *= t0; n += t0 * t0 * (GR[g] * x0 + GR[g + 1] * y0); }
  let t1 = 0.5 - x1 * x1 - y1 * y1;
  if (t1 > 0) { const g = permMod8[ii + i1 + perm[jj + j1]] * 2; t1 *= t1; n += t1 * t1 * (GR[g] * x1 + GR[g + 1] * y1); }
  let t2 = 0.5 - x2 * x2 - y2 * y2;
  if (t2 > 0) { const g = permMod8[ii + 1 + perm[jj + 1]] * 2; t2 *= t2; n += t2 * t2 * (GR[g] * x2 + GR[g + 1] * y2); }
  return 70 * n;
}

function fbm(x, y, oct = 4) {
  let s = 0, a = 0.5, f = 1;
  for (let o = 0; o < oct; o++) {
    s += a * snoise(x * f + o * 17.3, y * f - o * 9.1);
    a *= 0.5; f *= 2.03;
  }
  return s;
}

function ridged(x, y, oct = 4) {
  let s = 0, a = 0.5, f = 1, w = 1, norm = 0;
  for (let o = 0; o < oct; o++) {
    let n = 1 - Math.abs(snoise(x * f + o * 31.7, y * f + o * 7.7));
    n *= n;
    s += n * a * w;
    norm += a;
    w = clamp(n * 1.6, 0, 1);
    a *= 0.5; f *= 2.1;
  }
  return s / norm;
}

/* =========================================================
   SIMULATION STATE
========================================================= */
let modeId = 0; // 0 발산, 1 수렴, 2 보존
let T = 0;      // 누적 판 이동량
let S = 0;      // 보존형: 누적 단층 미끄러짐
let slipTarget = 0;
let simTime = 0;
let shake = 0;
let colorTick = 0;

/* =========================================================
   HEIGHT FIELDS
========================================================= */
// --- 발산형 (해령)
function divBase(x) {
  const a = Math.abs(x);
  return -0.5 - 0.95 * Math.sqrt(a / 10) - 0.36 * (1 - smooth(0.35, 1.05, a)) +
    0.13 * Math.exp(-sq((a - 1.25) / 0.45));
}
function divH(x, z) {
  const a = Math.abs(x);
  const off = x < 0 ? 37.2 : 0;
  const u = a - T + off;
  const amp = 0.07 + 0.26 * smooth(0.5, 2.2, a);
  const hills = (ridged(u * 0.85, z * 0.17 + off * 0.3, 3) - 0.42) * amp;
  const fine = fbm(u * 4.0, z * 3.0, 2) * 0.014;
  const neo = 0.09 * Math.exp(-sq(x / 0.16)) * (0.6 + 0.4 * snoise(z * 0.7, 3.1));
  return divBase(x) + hills + fine + neo;
}

// --- 수렴형 (해양판-대륙판 섭입)
const VOLCANOES = [
  { x: 3.7, z: 4.4, H: 1.05, R: 1.5, active: true },
  { x: 4.15, z: 0.6, H: 0.95, R: 1.35 },
  { x: 3.45, z: -3.2, H: 0.85, R: 1.25 }
];
function convOcean(x) {
  return -1.55 + 0.16 * Math.exp(-sq((x + 4.2) / 1.6)) - 1.05 * Math.exp(-sq((x - XT) / 0.9));
}
function convCont(x) {
  return -2.6 + 2.45 * smooth(XT, 1.0, x) + 0.32 * smooth(1.0, 1.7, x) +
    1.15 * smooth(1.9, 4.2, x) - 0.55 * smooth(6.8, 9.8, x) +
    0.35 * Math.exp(-sq((x - 4.4) / 0.9));
}
function volcAt(x, z) {
  let h = 0, inf = 0;
  for (const v of VOLCANOES) {
    const d = Math.hypot(x - v.x, z - v.z);
    if (d < v.R) {
      const t = 1 - d / v.R;
      h += v.H * Math.pow(t, 1.7) - 0.2 * v.H * Math.exp(-sq(d / (0.11 * v.R)));
      inf = Math.max(inf, t);
    }
  }
  return [h, inf];
}
function convH(x, z) {
  if (x < XT) {
    const u = x - T;
    const damp = smooth(XT + 0.05, XT - 1.4, x);
    return convOcean(x) + damp * (0.08 * (ridged(u * 1.2, z * 0.3, 3) - 0.42) + 0.022 * fbm(u * 5, z * 5, 2));
  }
  const land = smooth(0.9, 1.6, x);
  const [vh, vinf] = volcAt(x, z);
  const mAmp = 0.12 + 0.78 * Math.exp(-sq((x - 4.9) / 1.7));
  const r = ridged(x * 0.5 + 3.3, z * 0.33, 5);
  return convCont(x) + land * mAmp * (r - 0.5) * 1.35 * (1 - vinf * 0.85) +
    (1 - land) * 0.05 * fbm(x * 1.5, z * 1.5, 3) * smooth(XT, XT + 0.8, x) + vh;
}

// --- 보존형 (변환 단층, 탄성 반발)
function trDisp(x) {
  return Math.sign(x) * S * 0.5 + (T - S) * Math.atan(x / FAULT_D) / Math.PI;
}
function trH(x, z) {
  const zz = z - trDisp(x);
  const off = x < 0 ? 11.7 : 0;
  const low = 0.62 + 0.34 * fbm(x * 0.16 + off, zz * 0.16 + off, 3) - 0.34 * Math.exp(-sq(x / 0.75));
  let h = low + 0.36 * (ridged(x * 0.3 + off, zz * 0.17 + off, 4) - 0.45) + 0.015 * fbm(x * 3 + off, zz * 3, 2);
  // 도로 노반(평탄화)
  const per = 6.5;
  const rz = (((zz + 1.3) % per) + per) % per - per * 0.5;
  const m = 1 - smooth(0.2, 0.55, Math.abs(rz));
  h = lerp(h, low + 0.02, m * 0.9);
  return Math.max(h, 0.1);
}

function H(x, z) {
  if (modeId === 0) return divH(x, z);
  if (modeId === 1) return convH(x, z);
  return trH(x, z);
}

/* =========================================================
   TERRAIN COLOURS (sRGB)
========================================================= */
const _c = [0, 0, 0];
function setC(r, g, b) { _c[0] = r; _c[1] = g; _c[2] = b; return _c; }
function mixC(c, r, g, b, t) {
  c[0] += (r - c[0]) * t; c[1] += (g - c[1]) * t; c[2] += (b - c[2]) * t; return c;
}

function seafloorColor(x, z, h, slope, fresh, u) {
  const n = snoise(u * 1.7, z * 1.7) * 0.5 + 0.5;
  const t = clamp(fresh * 1.25 - n * 0.3 + Math.max(0, slope - 0.35) * 0.9, 0, 1);
  const c = setC(lerp(0.4, 0.09, t), lerp(0.37, 0.09, t), lerp(0.31, 0.1, t));
  const f = lerp(1, 0.7, clamp(-h / 2.4, 0, 1));
  c[0] *= f; c[1] *= f; c[2] *= f;
  return c;
}

function colorAt(x, z, h, slope) {
  if (modeId === 0) {
    const a = Math.abs(x);
    return seafloorColor(x, z, h, slope, 1 - smooth(0.2, 3.5, a), a - T + (x < 0 ? 37.2 : 0));
  }
  if (modeId === 1) {
    if (x < XT) return seafloorColor(x, z, h, slope, 0, x - T);
    const n = snoise(x * 1.1, z * 1.1) * 0.5 + 0.5;
    const n2 = snoise(x * 4.3 + 5, z * 4.3) * 0.5 + 0.5;
    if (h < -0.03) {
      const c = setC(0.44, 0.41, 0.35);
      mixC(c, 0.25, 0.24, 0.23, smooth(0.5, 1.2, slope));
      const f = lerp(1, 0.75, clamp(-h / 2.4, 0, 1));
      c[0] *= f; c[1] *= f; c[2] *= f;
      return c;
    }
    if (h < 0.07) return setC(0.78, 0.72, 0.56);
    const c = setC(lerp(0.36, 0.2, n), lerp(0.43, 0.31, n), lerp(0.2, 0.13, n));
    const ar = smooth(0.95, 1.55, h + (n2 - 0.5) * 0.3);
    const sr = smooth(0.55, 1.15, slope);
    mixC(c, 0.45 + n2 * 0.08, 0.4 + n2 * 0.06, 0.35 + n2 * 0.05, Math.max(ar, sr));
    const [, vinf] = volcAt(x, z);
    mixC(c, 0.24, 0.215, 0.2, smooth(0.15, 0.5, vinf) * 0.85);
    let snow = smooth(1.72, 1.95, h + (n2 - 0.5) * 0.25) * (1 - smooth(0.95, 1.5, slope));
    const dv = Math.hypot(x - VOLCANOES[0].x, z - VOLCANOES[0].z);
    snow *= smooth(0.25, 0.6, dv);
    mixC(c, 0.94, 0.95, 0.97, snow);
    return c;
  }
  // 보존형
  const zz = z - trDisp(x);
  const off = x < 0 ? 11.7 : 0;
  const n = snoise(x * 0.55 + off, zz * 0.55) * 0.5 + 0.5;
  const n2 = snoise(x * 2.6 + off, zz * 2.6) * 0.5 + 0.5;
  const c = setC(0.73, 0.6, 0.35);
  mixC(c, 0.36, 0.37, 0.21, smooth(0.5, 0.85, n + slope * 0.35) * 0.85);
  mixC(c, 0.2, 0.25, 0.13, smooth(0.68, 0.8, n2) * smooth(0.3, 0.7, n) * 0.7);
  mixC(c, 0.3, 0.39, 0.19, (1 - smooth(0.12, 0.65, Math.abs(x))) * 0.6);
  mixC(c, 0.52, 0.48, 0.42, smooth(0.75, 1.3, slope) * 0.8);
  mixC(c, 0.45, 0.36, 0.27, smooth(1.4, 3.0, slope) * (Math.abs(x) < 0.15 ? 1 : 0));
  return c;
}

/* =========================================================
   RENDERER / SCENE
========================================================= */
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, preserveDrawingBuffer: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();

// 스튜디오 배경 그라디언트
(() => {
  const c = document.createElement("canvas");
  c.width = 4; c.height = 256;
  const g = c.getContext("2d");
  const grd = g.createLinearGradient(0, 0, 0, 256);
  grd.addColorStop(0, "#dfe7ee");
  grd.addColorStop(0.55, "#b9c6d1");
  grd.addColorStop(1, "#7e8c99");
  g.fillStyle = grd;
  g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  scene.background = tex;
})();

const camera = new THREE.PerspectiveCamera(34, 1100 / 620, 0.1, 400);
camera.position.set(15, 8.6, 20.5);

const controls = new OrbitControls(camera, canvas);
controls.target.set(0.3, -2.0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enableZoom = true;
controls.zoomSpeed = 1.1;
controls.minDistance = 6;
controls.maxDistance = 45;
controls.enablePan = true;
controls.screenSpacePanning = true;
controls.panSpeed = 0.8;
controls.minPolarAngle = 0.15;
controls.maxPolarAngle = 1.5;
controls.update();
const HOME_POS = camera.position.clone();
const HOME_TARGET = controls.target.clone();
// Ctrl(또는 트랙패드 핀치) + 스크롤일 때만 확대/축소, 아니면 페이지 스크롤
// (전체화면에서는 스크롤만으로 확대/축소)
wrap.addEventListener("wheel", (e) => {
  if (!e.ctrlKey && !e.metaKey && !isFullscreen()) e.stopPropagation();
}, { capture: true });
// 이동 범위 제한
controls.addEventListener("change", () => {
  const t = controls.target;
  const cx = clamp(t.x, -9, 9), cy = clamp(t.y, -5.5, 2), cz = clamp(t.z, -5, 5);
  if (cx !== t.x || cy !== t.y || cz !== t.z) {
    const d = new THREE.Vector3(cx - t.x, cy - t.y, cz - t.z);
    t.add(d); camera.position.add(d);
  }
});
canvas.addEventListener("dblclick", () => {
  camera.position.copy(HOME_POS);
  controls.target.copy(HOME_TARGET);
  controls.update();
});
canvas.addEventListener("contextmenu", (e) => e.preventDefault());

// 태양 / 하늘 환경광
const SUN_DIR = new THREE.Vector3(0.66, 0.56, 0.5).normalize();
const sun = new THREE.DirectionalLight(0xffeed6, 3.4);
sun.position.copy(SUN_DIR).multiplyScalar(30);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.camera.left = -15; sun.shadow.camera.right = 15;
sun.shadow.camera.top = 15; sun.shadow.camera.bottom = -15;
sun.shadow.camera.near = 5; sun.shadow.camera.far = 70;
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xcfe3ff, 0x5a4a3a, 0.45));

(() => {
  const sky = new Sky();
  sky.scale.setScalar(40);
  const u = sky.material.uniforms;
  u.turbidity.value = 4;
  u.rayleigh.value = 1.4;
  u.mieCoefficient.value = 0.004;
  u.mieDirectionalG.value = 0.8;
  u.sunPosition.value.copy(SUN_DIR);
  const skyScene = new THREE.Scene();
  skyScene.add(sky);
  const pm = new THREE.PMREMGenerator(renderer);
  scene.environment = pm.fromScene(skyScene, 0, 0.1, 100).texture;
  pm.dispose();
})();

// 바닥 접지 그림자
(() => {
  const shadowPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80),
    new THREE.ShadowMaterial({ opacity: 0.22 })
  );
  shadowPlane.rotation.x = -Math.PI / 2;
  shadowPlane.position.y = YB - 0.6;
  shadowPlane.receiveShadow = true;
  scene.add(shadowPlane);

  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(128, 128, 10, 128, 128, 128);
  grd.addColorStop(0, "rgba(0,0,0,0.55)");
  grd.addColorStop(0.5, "rgba(0,0,0,0.25)");
  grd.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 256, 256);
  const ao = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 17),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false })
  );
  ao.rotation.x = -Math.PI / 2;
  ao.position.y = YB - 0.59;
  scene.add(ao);
})();

/* =========================================================
   PROCEDURAL TEXTURES
========================================================= */
function waveNormalMap(size, waves, maxFreq, strength, seed) {
  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const W = [];
  for (let i = 0; i < waves; i++) {
    const kx = Math.round((rnd() * 2 - 1) * maxFreq);
    const ky = Math.round((rnd() * 2 - 1) * maxFreq) || 1;
    const k = Math.hypot(kx, ky);
    W.push({ kx, ky, a: 1 / (k + 1.5), p: rnd() * Math.PI * 2 });
  }
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const img = g.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size, v = y / size;
      let dx = 0, dy = 0;
      for (const w of W) {
        const ph = 2 * Math.PI * (w.kx * u + w.ky * v) + w.p;
        const cc = Math.cos(ph) * w.a * 2 * Math.PI;
        dx += cc * w.kx; dy += cc * w.ky;
      }
      dx *= strength / waves; dy *= strength / waves;
      const len = Math.hypot(dx, dy, 1);
      const o = (y * size + x) * 4;
      img.data[o] = ((-dx / len) * 0.5 + 0.5) * 255;
      img.data[o + 1] = ((-dy / len) * 0.5 + 0.5) * 255;
      img.data[o + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.NoColorSpace;
  return tex;
}

function smokeTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  let s = 77;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 22; i++) {
    const x = 64 + (rnd() - 0.5) * 50, y = 64 + (rnd() - 0.5) * 50, r = 18 + rnd() * 30;
    const grd = g.createRadialGradient(x, y, 0, x, y, r);
    grd.addColorStop(0, "rgba(255,255,255,0.22)");
    grd.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = grd;
    g.fillRect(0, 0, 128, 128);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function glowTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d");
  const grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, "rgba(255,255,255,1)");
  grd.addColorStop(0.3, "rgba(255,255,255,0.45)");
  grd.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function motionSymbolTexture(type) {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const g = c.getContext("2d");
  g.strokeStyle = "rgba(255,255,255,0.95)";
  g.fillStyle = "rgba(255,255,255,0.95)";
  g.lineWidth = 9;
  g.beginPath(); g.arc(64, 64, 50, 0, Math.PI * 2); g.stroke();
  if (type === "out") {
    g.beginPath(); g.arc(64, 64, 13, 0, Math.PI * 2); g.fill();
  } else {
    g.beginPath(); g.moveTo(36, 36); g.lineTo(92, 92); g.moveTo(92, 36); g.lineTo(36, 92); g.stroke();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

const TEX = {
  detail: waveNormalMap(256, 60, 18, 0.9, 12345),
  water: waveNormalMap(256, 90, 14, 1.0, 777),
  smoke: smokeTexture(),
  glow: glowTexture()
};
TEX.detail.repeat.set(1, 1);

/* =========================================================
   SHARED UNIFORMS + GLSL
========================================================= */
const U = {
  uTime: { value: 0 },
  uT: { value: 0 },
  uMode: { value: 0 },
  uMagma: { value: 1 },
  uFlow: { value: 1 },
  uOutline: { value: 1 },
  uOverlay: { value: 0 },
  uSlip: { value: 0 },
  uDef: { value: 0 },
  uQuakeOn: { value: 1 },
  uQuakes: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, 0, 0, -99)) },
  uQMag: { value: new Array(8).fill(0) },
  uLight: { value: SUN_DIR.clone() }
};

const GLSL_HELPERS = /* glsl */ `
#define XT ${XT.toFixed(3)}
#define KS ${KS.toFixed(4)}
#define FAULT_D ${FAULT_D.toFixed(3)}
float pb_hash(vec2 p){ vec3 p3=fract(vec3(p.xyx)*.1031); p3+=dot(p3,p3.yzx+33.33); return fract((p3.x+p3.y)*p3.z); }
float pb_hash3(vec3 p3){ p3=fract(p3*.1031); p3+=dot(p3,p3.zyx+31.32); return fract((p3.x+p3.y)*p3.z); }
float pb_noise(vec2 p){ vec2 i=floor(p); vec2 f=fract(p); vec2 u=f*f*(3.-2.*f);
  return mix(mix(pb_hash(i),pb_hash(i+vec2(1.,0.)),u.x),mix(pb_hash(i+vec2(0.,1.)),pb_hash(i+vec2(1.,1.)),u.x),u.y); }
float pb_noise3(vec3 p){ vec3 i=floor(p); vec3 f=fract(p); vec3 u=f*f*(3.-2.*f);
  float a=pb_hash3(i), b=pb_hash3(i+vec3(1.,0.,0.)), c=pb_hash3(i+vec3(0.,1.,0.)), d=pb_hash3(i+vec3(1.,1.,0.));
  float e=pb_hash3(i+vec3(0.,0.,1.)), f1=pb_hash3(i+vec3(1.,0.,1.)), g=pb_hash3(i+vec3(0.,1.,1.)), h=pb_hash3(i+vec3(1.,1.,1.));
  return mix(mix(mix(a,b,u.x),mix(c,d,u.x),u.y),mix(mix(e,f1,u.x),mix(g,h,u.x),u.y),u.z); }
float pb_fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<4;i++){ s+=a*pb_noise(p); p=p*2.03+vec2(17.1,9.3); a*=.5; } return s/.9375; }
float pb_ss(float e0,float e1,float x){ float t=clamp((x-e0)/(e1-e0),0.,1.); return t*t*(3.-2.*t); }
float pb_sq(float x){ return x*x; }
vec2 pb_vor(vec2 x){ vec2 n=floor(x), f=fract(x); float F1=8., F2=8.;
  for(int j=-1;j<=1;j++) for(int i=-1;i<=1;i++){ vec2 g=vec2(float(i),float(j));
    vec2 o=vec2(pb_hash(n+g),pb_hash(n+g+19.7)); vec2 r=g+o-f; float d=dot(r,r);
    if(d<F1){ F2=F1; F1=d; } else if(d<F2){ F2=d; } }
  F1=sqrt(F1); F2=sqrt(F2); return vec2(F1,F2-F1); }
vec3 pb_lin(vec3 c){ return pow(max(c,vec3(0.)),vec3(2.2)); }
float pb_trDisp(float x, float slip, float def){ return sign(x)*slip*.5 + def*atan(x/FAULT_D)/3.14159265; }
`;

/* ---------- 지형(윗면) 재질 ---------- */
const terrainMat = new THREE.MeshStandardMaterial({
  vertexColors: true,
  roughness: 0.93,
  metalness: 0,
  normalMap: TEX.detail,
  normalScale: new THREE.Vector2(0.45, 0.45),
  envMapIntensity: 0.55
});
terrainMat.onBeforeCompile = (sh) => {
  for (const k of ["uTime", "uT", "uMode", "uOverlay", "uSlip", "uDef", "uQuakes", "uQMag", "uQuakeOn", "uMagma"]) sh.uniforms[k] = U[k];
  sh.vertexShader = "varying vec3 vWP;\n" + sh.vertexShader.replace(
    "#include <worldpos_vertex>",
    "#include <worldpos_vertex>\n vWP = (modelMatrix * vec4(transformed, 1.0)).xyz;"
  );
  sh.fragmentShader =
    "uniform float uTime, uT, uMode, uOverlay, uSlip, uDef, uQuakeOn, uMagma;\nuniform vec4 uQuakes[8];\nuniform float uQMag[8];\nvarying vec3 vWP;\n" +
    GLSL_HELPERS +
    sh.fragmentShader
      .replace("#include <color_fragment>", `#include <color_fragment>
      {
        vec2 rp = mat2(.8,-.6,.6,.8)*vWP.xz;
        float n1 = .5*(pb_noise(vWP.xz*5.3)+pb_noise(rp*7.1+3.)), n2 = pb_noise(rp*23.);
        diffuseColor.rgb *= 0.88 + 0.16*n1 + 0.08*n2;
        if (uMode > 1.5) {
          // 단층을 가로지르는 도로 (판과 함께 움직이고, 지진 때 끊어진다)
          float zz = vWP.z - pb_trDisp(vWP.x, uSlip, uDef);
          float per = 6.5;
          float rz = mod(zz + 1.3, per) - per*.5;
          float road = 1. - pb_ss(.15, .175, abs(rz));
          float shoulder = 1. - pb_ss(.175, .25, abs(rz));
          diffuseColor.rgb = mix(diffuseColor.rgb, pb_lin(vec3(.42,.37,.30)), shoulder*(1.-road));
          diffuseColor.rgb = mix(diffuseColor.rgb, pb_lin(vec3(.17,.17,.18))*(.85+.3*n2), road);
          float cl = (1. - pb_ss(.010, .02, abs(rz))) * step(.45, fract(vWP.x*1.7));
          diffuseColor.rgb = mix(diffuseColor.rgb, pb_lin(vec3(.86,.68,.16)), cl*road);
          float edge = 1. - pb_ss(.006, .014, abs(abs(rz)-.135));
          diffuseColor.rgb = mix(diffuseColor.rgb, pb_lin(vec3(.85)), edge*road);
        }
        if (uMode > .5 && uMode < 1.5) {
          float sh = vWP.y;
          float wave = .5 + .5*sin(vWP.x*9. - uTime*1.6 + pb_noise(vWP.xz*3.)*4.);
          float foam = (1. - pb_ss(.0, .05, abs(sh + .015))) * pb_ss(.35, .75, pb_noise(vWP.xz*14. + uTime*.4)*wave + .3);
          diffuseColor.rgb *= mix(1., .7, (1. - pb_ss(-.01, .07, sh)) * pb_ss(-.08, -.0, sh) + (1.-pb_ss(0.,.06,sh))*step(0.,sh)*.6);
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(.92), foam*.85);
        }
        if (uMode < 0.5 && uOverlay > 0.5) {
          // 고지자기 줄무늬 (해령 대칭)
          float u = abs(vWP.x) - uT;
          float st = step(0., sin(u*1.9 + sin(u*.63)*1.4 + .4));
          vec3 sc = st > .5 ? vec3(.85,.18,.12) : vec3(.15,.35,.85);
          diffuseColor.rgb = mix(diffuseColor.rgb, pb_lin(sc), .5);
        }
      }`)
      .replace("#include <opaque_fragment>", `
      if (uMode < 1.5 && vWP.y < 0.) {
        // 수심에 따른 빛 흡수 (얕은 해령은 밝고, 깊은 해저는 어둡다)
        float dep = -vWP.y;
        vec2 cp = vWP.xz*3.2 + vec2(uTime*.18, uTime*.11);
        float ca = pow(1. - pb_vor(cp).x, 6.) + pow(1. - pb_vor(cp*1.3 + 5.).x, 6.);
        outgoingLight += vec3(.55,.85,.95) * ca * .1 * exp(-dep*.9);
        outgoingLight *= mix(vec3(1.), vec3(.55,.85,.95), 1. - exp(-dep*.8));
        outgoingLight = mix(outgoingLight, vec3(.008,.06,.09), 1. - exp(-dep*.3));
      }
      #include <opaque_fragment>`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>
      {
        if (uOverlay > 0.5) {
          float bx = (uMode > .5 && uMode < 1.5) ? XT : 0.;
          float l = 1. - pb_ss(.03, .08, abs(vWP.x - bx));
          totalEmissiveRadiance += vec3(1., .22, .12) * l * 1.6;
        }
        if (uMode < .5) {
          // 열곡 중앙의 새 용암 틈
          float fis = (1. - pb_ss(.02, .07, abs(vWP.x))) * pb_ss(.62, .85, pb_noise(vec2(vWP.z*2.4 - uTime*.15, 3.)));
          totalEmissiveRadiance += vec3(1., .3, .05) * fis * uMagma * 1.6;
        }
        if (uMode > .5 && uMode < 1.5) {
          // 활화산 분화구 / 용암류
          vec2 d = vWP.xz - vec2(${VOLCANOES[0].x.toFixed(2)}, ${VOLCANOES[0].z.toFixed(2)});
          float r = length(d);
          float th = atan(d.y, d.x);
          float crater = exp(-r*r/.012);
          float flow = (1. - pb_ss(.02, .06, abs(th + .35 - .18*sin(r*6.))*r)) * (1. - pb_ss(.55, .95, r)) * pb_ss(.06, .14, r);
          float flick = .75 + .25*sin(uTime*7.) * pb_noise(vec2(uTime*2., 1.));
          totalEmissiveRadiance += vec3(1., .28, .04) * (crater*3. + flow*(1.4 - r)*1.6*(.6+.4*pb_noise(vec2(r*10. - uTime, 2.)))) * uMagma * flick;
        }
        for (int i = 0; i < 8; i++) {
          vec4 q = uQuakes[i];
          float age = uTime - q.w;
          if (age < 0. || age > 3.2) continue;
          float d = length(vWP - q.xyz);
          float m = uQMag[i];
          float ring = exp(-pb_sq((d - age*2.6)/(.05+.03*m))) * (1. - age/3.2) * m;
          float ring2 = exp(-pb_sq((d - age*1.5)/(.05+.02*m))) * (1. - age/3.2) * m * .5;
          totalEmissiveRadiance += vec3(1., .78, .45) * (ring + ring2) * .8 * (1. - pb_ss(1.5, 5., d)) * uQuakeOn;
        }
      }`);
};

/* ---------- 단면(측면) 셰이더 ---------- */
const SECTION_FRAG = /* glsl */ `
uniform float uTime, uT, uMode, uMagma, uFlow, uOutline, uSlip, uDef, uQuakeOn;
uniform vec4 uQuakes[8];
uniform float uQMag[8];
uniform vec3 uLight;
varying vec3 vW;
varying float vSurf;
varying vec3 vN;
${GLSL_HELPERS}

float divBase(float x){ float a=abs(x); return -0.5-0.95*sqrt(a/10.)-0.36*(1.-pb_ss(0.35,1.05,a))+0.13*exp(-pb_sq((a-1.25)/0.45)); }
float convOcean(float x){ return -1.55+0.16*exp(-pb_sq((x+4.2)/1.6))-1.05*exp(-pb_sq((x-XT)/0.9)); }

vec4 rSed(vec2 p){ float l=pb_noise(vec2(p.x*.7,p.y*38.))*.65+pb_noise(vec2(p.x*3.,p.y*95.))*.35; vec3 c=mix(vec3(.50,.46,.38),vec3(.70,.65,.55),l); c*=.9+.18*pb_noise(p*34.); return vec4(c,l*.25); }
vec4 rPillow(vec2 p){ vec2 v=pb_vor(p*vec2(6.5,8.5)); float e=pb_ss(0.,.13,v.y); vec3 c=mix(vec3(.32,.27,.22),vec3(.12,.12,.13),e); c*=.82+.3*pb_noise(p*45.); return vec4(c,(1.-v.x)*e*.8); }
vec4 rDike(vec2 p){ float s=pb_noise(vec2(p.x*20.,p.y*1.3)), s2=pb_noise(vec2(p.x*64.,p.y*4.)); vec3 c=mix(vec3(.16,.18,.17),vec3(.32,.33,.31),s*.7+s2*.3); return vec4(c,s*.4+s2*.2); }
vec4 rGabbro(vec2 p){ float g=pb_noise(p*52.), g2=pb_noise(p*16.+3.); vec3 c=mix(vec3(.17,.21,.18),vec3(.52,.53,.49),pb_ss(.52,.74,g)); c*=.86+.22*g2; c*=.92+.12*pb_noise(vec2(p.x*.7,p.y*15.)); return vec4(c,g*.3); }
vec4 rPerid(vec2 p){ float g=pb_noise(p*30.), g2=pb_noise(p*8.+7.); vec3 c=mix(vec3(.22,.24,.19),vec3(.38,.40,.30),g*.5+g2*.5); c=mix(c,vec3(.10,.11,.10),pb_ss(.78,.88,pb_noise(p*72.))*.7); return vec4(c,g*.35); }
vec4 rGranite(vec2 p){ float a=pb_noise(p*70.), b=pb_noise(p*90.+11.), q=pb_noise(p*80.+2.), d=pb_noise(p*9.+5.); vec3 c=vec3(.68,.62,.59); c=mix(c,vec3(.78,.58,.50),pb_ss(.5,.75,a)*.7); c=mix(c,vec3(.84,.84,.82),pb_ss(.65,.85,q)*.45); c=mix(c,vec3(.15),pb_ss(.78,.9,b)*.6); c*=.9+.14*d; return vec4(c,a*.15+b*.1); }
vec4 rGneiss(vec2 p){ float w=p.y*8.+1.8*pb_fbm(p*1.2); float b=.5+.5*sin(w*3.1); float n=pb_noise(p*40.); vec3 c=mix(vec3(.27,.26,.27),vec3(.57,.54,.51),b*.6+n*.3); return vec4(c,b*.35+n*.1); }
vec4 rStrata(vec2 p,float fold,float pal){ float w=(p.y+fold)*4.2; float id=floor(w), k=fract(w); float r=pb_hash(vec2(id,pal));
  vec3 c=r<.25?vec3(.76,.62,.42):r<.5?vec3(.45,.42,.38):r<.75?vec3(.80,.77,.68):vec3(.62,.38,.27);
  c*=.88+.16*pb_noise(vec2(p.x*7.,p.y*70.)); c*=.86+.14*pb_ss(0.,.1,k); return vec4(c,pb_ss(0.,.1,k)*.3+pb_noise(p*28.)*.2); }
vec4 rMelange(vec2 p){ vec2 q=p*vec2(2.6,4.2); vec2 v=pb_vor(q); float sh=pb_noise(vec2(p.x*3.+p.y*7.,p.y*34.)); vec3 c=mix(vec3(.33,.37,.33),vec3(.51,.51,.46),sh);
  float blk=1.-pb_ss(.22,.3,v.x); float h=pb_hash(floor(q)); c=mix(c,mix(vec3(.56,.47,.38),vec3(.25,.34,.30),h)*(.85+.3*pb_noise(p*30.)),blk*.75); return vec4(c,sh*.3+blk*.3); }
vec4 rSoil(vec2 p){ float n=pb_noise(p*30.); return vec4(mix(vec3(.24,.17,.11),vec3(.37,.28,.18),n),n*.3); }
vec4 rGouge(vec2 p){ float s=pb_noise(vec2(p.x*90.,p.y*3.)), n=pb_noise(p*60.); vec3 c=mix(vec3(.45,.42,.38),vec3(.72,.68,.60),s*.6+n*.4); return vec4(c,s*.5); }
vec4 rEclog(vec2 p){ float g=pb_noise(p*40.), r=pb_noise(p*55.+9.); vec3 c=mix(vec3(.20,.31,.22),vec3(.37,.41,.33),g); c=mix(c,vec3(.58,.13,.12),pb_ss(.72,.82,r)); return vec4(c,g*.3); }
vec3 magmaCol(vec2 p){ float n=pb_noise(p*7.+vec2(0.,-uTime*.5))*.6+pb_noise(p*19.+vec2(uTime*.2,-uTime*.9))*.4; return mix(vec3(.95,.16,.02),vec3(1.,.72,.28),n)*2.6; }
vec3 asthCol(float s, float T){ s=mix(.5,s,uFlow*.85+.15); s=pb_ss(.2,.8,s); float k=clamp(T*(.55+.9*s)-.12,0.,1.);
  vec3 c=mix(vec3(.30,.08,.04),vec3(.72,.25,.08),pb_ss(0.,.65,k)); return mix(c,vec3(.95,.52,.18),pb_ss(.7,1.05,k)*.8); }
float lineAt(float d){ float w=fwidth(d)+1e-4; return 1.-pb_ss(w*.4,w*1.2,abs(d)); }
vec3 perturb(vec3 N, vec3 pos, float h, float k){
  vec3 dpdx=dFdx(pos), dpdy=dFdy(pos); float dhdx=dFdx(h), dhdy=dFdy(h);
  vec3 r1=cross(dpdy,N), r2=cross(N,dpdx); float det=dot(dpdx,r1);
  vec3 g=sign(det)*(dhdx*r1+dhdy*r2); return normalize(abs(det)*N-k*g); }

/* ---------------- 발산형 ---------------- */
void layDiv(float x,float y,float hs,inout vec3 col,inout float bh,inout vec3 em,inout float sl,inout float ol){
  float a=abs(x); float off=x<0.?37.2:0.;
  float u=a-uT; vec2 p=vec2(u+off,y);
  float h0=divBase(x); float dd=hs-y; float j=.025*(pb_noise(vec2(u*3.+off,y*3.))-.5);
  float sed=.15*pb_ss(.6,9.,a);
  float moho=h0-.64+j; float lb=h0-(.55+2.6*sqrt(a/10.));
  vec4 r;
  if(dd<sed+j*.5) r=rSed(p);
  else if(dd<sed+.2+j) r=rPillow(p);
  else if(dd<sed+.38+j) r=rDike(p);
  else if(y>moho) r=rGabbro(p);
  else if(y>lb+j*3.){ r=rPerid(p); r.rgb=mix(r.rgb,vec3(.52,.31,.16),pb_ss(lb+.7,lb,y)*.55); }
  else {
    vec2 q=vec2((a-5.)/5.,(y+4.7)/1.45); float rr=length(q); float an=atan(q.y,q.x)+uT*.25*uFlow;
    vec2 f=vec2(cos(an),sin(an))*2.2;
    float s=pb_noise3(vec3(rr*7.,f))*.65+pb_noise3(vec3(rr*16.,f*2.3))*.35;
    float T=.5+.38*(1.-pb_ss(0.,8.5,a))+.12*pb_ss(-3.5,-6.,y);
    r=vec4(asthCol(s,T),s*.25); sl=.55;
  }
  col=r.rgb; bh=r.a;
  float axisTop=divBase(0.);
  float w=.25+max(0.,axisTop-.7-y)*.55;
  float melt=(1.-pb_ss(w*.35,w,a))*pb_ss(-5.9,-2.3,y)*step(y,lb+.3);
  float mn=pb_noise(vec2(x*7.,y*5.-uTime*.7));
  em+=pb_lin(vec3(1.,.32,.06))*melt*(.15+.85*pb_ss(.45,.8,mn))*uMagma*1.4;
  col=mix(col,col*vec3(1.2,.8,.6),melt*.5*uMagma);
  float cy=axisTop-.34;
  float e=length(vec2(x,y-cy)/vec2(.55,.075)); float ch=1.-pb_ss(.75,1.,e);
  float e2=length(vec2(x,y-cy+.25)/vec2(.95,.33)); float mush=(1.-pb_ss(.3,1.,e2))*(1.-ch);
  float dk=(1.-pb_ss(.012,.035,abs(x-.025*sin(y*23.+uTime*.7))))*step(y,hs)*step(cy,y);
  dk*=.5+.5*sin(uTime*1.1);
  em+=magmaCol(vec2(x,y))*(ch+mush*.22+dk*.8)*uMagma;
  col=mix(col,vec3(.18,.05,.02),ch*uMagma);
  ol=max(ol,lineAt(y-lb));
  ol=max(ol,(1.-pb_ss(.0,.03,a))*step(lb,y)*step(fract(y*5.),.55)*step(y,hs));
}

/* ---------------- 수렴형 ---------------- */
void layConv(float x,float y,float hs,inout vec3 col,inout float bh,inout vec3 em,inout float sl,inout float ol){
  float dd=hs-y; vec4 r;
  float j=.025*(pb_noise(vec2(x*3.,y*3.))-.5);
  if(x<XT){
    float u=x-uT; vec2 p=vec2(u,y);
    float h0=convOcean(x); float lb=h0-2.0;
    if(dd<.12+j*.5) r=rSed(p);
    else if(dd<.32+j) r=rPillow(p);
    else if(dd<.47+j) r=rDike(p);
    else if(dd<.72+j) r=rGabbro(p);
    else if(y>lb+j*3.) r=rPerid(p);
    else { float s=pb_noise(vec2((u*.6)*1.1,(h0-y)*8.))*.6+pb_noise(vec2(u*1.6,(h0-y)*22.))*.4; float T=.62+.12*pb_ss(-3.5,-6.,y); r=vec4(asthCol(s,T),s*.25); sl=.55; }
    col=r.rgb; bh=r.a;
    ol=max(ol,lineAt(y-lb));
    return;
  }
  float w=x-XT; float ys=-2.6-KS*w*w; float g=2.*KS*w; float cs=1./sqrt(1.+g*g);
  float dn=(ys-y)*cs;
  float arc=(g*sqrt(1.+g*g)+log(g+sqrt(1.+g*g)))/(4.*KS);
  float along=XT+arc-uT;
  vec2 ps=vec2(along,-2.6-dn);
  if(dn>=0. && dn<2.0){
    if(dn<.10+j*.5) r=rSed(ps);
    else if(dn<.30+j) r=rPillow(ps);
    else if(dn<.45+j) r=rDike(ps);
    else if(dn<.68+j) r=rGabbro(ps);
    else { r=rPerid(ps); r.rgb=mix(r.rgb,vec3(.20,.25,.31),.45); }
    if(dn<.68+j){ vec4 ec=rEclog(ps); r=mix(r,ec,pb_ss(-3.5,-4.4,y)); }
    // 섭입판을 따라 빠져나오는 물 (탈수)
    float fl=pb_ss(-3.4,-4.2,y)*(1.-pb_ss(0.,.12,dn))*pb_ss(.7,.9,pb_noise(vec2(along*3.,uTime*.3)));
    r.rgb=mix(r.rgb,vec3(.75,.85,.95),fl*.5);
  } else if(dn>=2.0){
    float s=pb_noise(vec2(along*.66,dn*8.))*.6+pb_noise(vec2(along*1.7,dn*22.))*.4;
    float T=.6+.12*pb_ss(-3.5,-6.,y)-.25*(1.-pb_ss(2.,2.7,dn));
    r=vec4(asthCol(s,T),s*.25); sl=.55;
  } else {
    float moho=-1.7-1.2*pb_ss(1.5,4.5,x)*(1.-.3*pb_ss(7.,10.,x))+j;
    float lbc=-3.3+j*2.;
    float uc=-.95-.45*pb_ss(1.5,4.5,x)+j;
    bool prism = x < .4+.5*(y+.2);
    vec2 p=vec2(x,y);
    if(prism) r=rMelange(vec2(x*1.3+.4*y,y));
    else if(y>moho){
      if(dd<.05 && hs>0.) r=rSoil(p);
      else if(x>5.3 && dd<.5) r=rStrata(p,.18*sin(x*2.2)+.1*sin(x*5.1+1.)+.05*(x-5.3),2.);
      else if(y>uc) r=rGranite(p);
      else r=rGneiss(p);
      float pe=length((p-vec2(3.85,-1.75))/vec2(1.3,.8));
      if(pe<1.){ vec4 gp=rGranite(p*1.3+7.); gp.rgb=mix(gp.rgb,vec3(.86,.78,.72),.35); r=mix(r,gp,1.-pb_ss(.9,1.,pe)); }
    }
    else if(y>lbc) r=rPerid(p);
    else {
      float s=pb_noise(vec2(along*.66,dn*8.))*.6+pb_noise(vec2(along*1.7,dn*22.))*.4;
      float T=.85-.3*(1.-pb_ss(-.7,0.,dn));
      r=vec4(asthCol(s,T),s*.25); sl=.55;
    }
    col=r.rgb; bh=r.a;
    // 맨틀 쐐기의 부분 용융
    float mz=exp(-pb_sq((x-3.3+(y+4.3)*.12)/.5))*pb_ss(ys,ys+.25,y)*(1.-pb_ss(-3.,-2.6,y));
    float mn=pb_noise(vec2(x*8.,y*6.-uTime*.8));
    em+=pb_lin(vec3(1.,.32,.06))*mz*(.2+.8*pb_ss(.45,.8,mn))*uMagma*1.3;
    // 상승하는 마그마 덩어리
    float glow=0.;
    for(int i=0;i<6;i++){
      float fi=float(i);
      float ph=fract(uTime*.07+fi/6.);
      vec2 st=vec2(3.15+.18*sin(fi*2.1),-4.3+.1*cos(fi*1.3));
      vec2 pos=mix(st,vec2(3.78,-1.45),ph)+vec2(.12*sin(ph*9.+fi),0.);
      float rad=.13*(1.-.4*ph)*pb_ss(0.,.08,ph)*(1.-pb_ss(.85,1.,ph));
      glow+=1.-pb_ss(rad*.25,rad,length(p-pos));
    }
    // 마그마 방 + 화도
    float che=length((p-vec2(3.75,-1.4))/vec2(.62,.3)); float ch=1.-pb_ss(.8,1.,che);
    float cx=3.72+.03*sin(y*6.+uTime*.3);
    float cond=(1.-pb_ss(.03,.055,abs(x-cx)))*step(-1.45,y)*step(y,hs);
    float sill=(1.-pb_ss(.03,.06,abs(y+.6-.2*(x-3.72))))*(1.-pb_ss(.0,.45,abs(x-3.95)))*step(3.72,x);
    float mm=clamp(glow+ch+cond+sill*.8,0.,1.);
    col=mix(col,vec3(.2,.05,.02),mm*uMagma);
    em+=magmaCol(p)*mm*uMagma;
    ol=max(ol,lineAt(y-lbc)*step(y,moho+.5)*(1.-pb_ss(-.05,.05,dn+.0)));
  }
  if(dn>=0.) { col=r.rgb; bh=r.a; }
  ol=max(ol,lineAt(dn)); ol=max(ol,lineAt(dn-2.0));
}

/* ---------------- 보존형 ---------------- */
void layTr(float x,float y,float z,float hs,inout vec3 col,inout float bh,inout vec3 em,inout float sl,inout float ol){
  float uz=pb_trDisp(x,uSlip,uDef);
  float zz=z-uz;
  float dd=hs-y; vec4 r;
  float j=.025*(pb_noise(vec2(x*3.,y*3.+zz))-.5);
  float moho=-2.1+j, lb=-3.6+j*2.;
  vec2 p=vec2(x+zz*.73,y+zz*.11);
  if(dd<.06) r=rSoil(p);
  else if(x<0.){
    float sc=.38+.14*pb_noise(vec2(zz*.35,1.));
    if(dd<sc) r=rStrata(vec2(x+zz*.5,y),.06*zz+.04*sin(x*1.3),1.);
    else if(y>-1.1+j) r=rGranite(p);
    else if(y>moho) r=rGneiss(p);
    else if(y>lb) r=rPerid(p);
    else { float s=pb_noise3(vec3(x*.9,y*7.,zz*.5))*.6+pb_noise3(vec3(x*2.,y*18.,zz))*.4; r=vec4(asthCol(s,.68),s*.25); sl=.55; }
  } else {
    float sc=.55+.12*pb_noise(vec2(zz*.3,5.));
    if(dd<sc) r=rStrata(vec2(x+zz*.4,y),-.05*zz+.05*sin(x*1.7),7.);
    else if(y>-1.1+j) r=rMelange(p+3.);
    else if(y>moho) r=rGneiss(p+5.);
    else if(y>lb) r=rPerid(p+2.);
    else { float s=pb_noise3(vec3(x*.9,y*7.,zz*.5))*.6+pb_noise3(vec3(x*2.,y*18.,zz))*.4; r=vec4(asthCol(s,.68),s*.25); sl=.55; }
  }
  float fw=.07+.03*pb_noise(vec2(y*3.,zz*2.));
  if(abs(x)<fw && y>-1.6) r=rGouge(vec2(x,y+zz*.3));
  float dw=.12+max(0.,-1.6-y)*.12;
  if(y<=-1.6 && y>lb && abs(x)<dw){ float b=.5+.5*sin(x*130.+pb_noise(vec2(y*2.,zz))*5.); r.rgb=mix(r.rgb,vec3(.5,.5,.48)*(.75+.35*b),.7*(1.-pb_ss(dw*.6,dw,abs(x)))); }
  col=r.rgb; bh=r.a;
  ol=max(ol,lineAt(y-lb));
  ol=max(ol,(1.-pb_ss(.0,.025,abs(x)))*step(lb,y)*step(fract(y*5.),.55)*step(y,hs));
}

void main(){
  float x=vW.x, y=vW.y, z=vW.z, hs=vSurf;
  vec3 col=vec3(.5); float bh=0., sl=0., ol=0.; vec3 em=vec3(0.);
  if(y>hs+.001){
    float wd=clamp(-y/2.8,0.,1.);
    col=mix(vec3(.16,.50,.60),vec3(.03,.17,.27),pow(wd,.8));
    col+=.05*pb_noise(vec2(x*2.5+uTime*.25,y*4.))*(1.-wd);
    if(uMode<.5){
      float pw=.05+max(0.,y-hs)*.25;
      float m=exp(-pb_sq(x/pw))*pb_noise(vec2(x*8.,y*5.-uTime*1.2))*pb_ss(0.,-.5,y);
      col=mix(col,vec3(.06,.06,.07),m*.65*uMagma);
    }
    sl=.85;
  }
  else if(uMode<.5) layDiv(x,y,hs,col,bh,em,sl,ol);
  else if(uMode<1.5) layConv(x,y,hs,col,bh,em,sl,ol);
  else layTr(x,y,z,hs,col,bh,em,sl,ol);

  for(int i=0;i<8;i++){
    vec4 q=uQuakes[i]; float age=uTime-q.w;
    if(age<0.||age>3.2) continue;
    float m=uQMag[i]; float d=length(vW-q.xyz);
    float ring=exp(-pb_sq((d-age*2.6)/(.03+.02*m)))*(1.-age/3.2)*m;
    float ring2=exp(-pb_sq((d-age*1.5)/(.03+.015*m)))*(1.-age/3.2)*m*.5;
    float fade=1.-pb_ss(1.2,4.5,d);
    em+=vec3(1.,.8,.5)*(ring+ring2)*.55*fade*uQuakeOn;
    em+=vec3(1.,.18,.06)*exp(-d*d/(.004+.006*m))*max(0.,1.-age*.8)*7.*uQuakeOn;
  }

  vec3 N=perturb(normalize(vN),vW,bh,.035);
  float lit=.42+.58*max(dot(N,uLight),0.);
  vec3 c=col*mix(lit,1.,sl);
  c=pb_lin(c)*1.05;
  c+=em;
  float dash=step(.35,fract((x+z)*2.2));
  c=mix(c,vec3(.75,.95,1.)*1.1,clamp(ol,0.,1.)*uOutline*.7*dash);
  gl_FragColor=vec4(c,1.);
}
`;

const SECTION_VERT = /* glsl */ `
attribute float aSurf;
varying vec3 vW;
varying float vSurf;
varying vec3 vN;
void main(){
  vec4 wp = modelMatrix * vec4(position, 1.0);
  vW = wp.xyz;
  vSurf = aSurf;
  vN = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * wp;
}
`;

const sectionMat = new THREE.ShaderMaterial({
  uniforms: U,
  vertexShader: SECTION_VERT,
  fragmentShader: SECTION_FRAG,
  side: THREE.DoubleSide
});

/* =========================================================
   TERRAIN GEOMETRY (단층 위치 x=0에 이중 열 → 단층애 표현)
========================================================= */
const xs = [];
for (let i = 0; i <= 100; i++) xs.push(i === 100 ? -0.004 : -10 + i * 0.1);
for (let i = 0; i <= 100; i++) xs.push(i === 0 ? 0.004 : i * 0.1);
const zs = [];
for (let j = 0; j <= 100; j++) zs.push(-5 + j * 0.1);
const NX = xs.length, NZ = zs.length, NV = NX * NZ;

const heights = new Float32Array(NV);
const slopes = new Float32Array(NV);
const dynMask = new Uint8Array(NV);

const tGeo = new THREE.BufferGeometry();
const tPos = new Float32Array(NV * 3);
const tNor = new Float32Array(NV * 3);
const tCol = new Float32Array(NV * 3);
const tUv = new Float32Array(NV * 2);
for (let j = 0; j < NZ; j++) {
  for (let i = 0; i < NX; i++) {
    const k = j * NX + i;
    tPos[k * 3] = xs[i];
    tPos[k * 3 + 2] = zs[j];
    tUv[k * 2] = xs[i] * 0.55;
    tUv[k * 2 + 1] = zs[j] * 0.55;
  }
}
const tIdx = [];
for (let j = 0; j < NZ - 1; j++) {
  for (let i = 0; i < NX - 1; i++) {
    const a = j * NX + i, b = a + 1, c = a + NX, d = c + 1;
    tIdx.push(a, c, b, b, c, d);
  }
}
tGeo.setIndex(tIdx);
tGeo.setAttribute("position", new THREE.BufferAttribute(tPos, 3).setUsage(THREE.DynamicDrawUsage));
tGeo.setAttribute("normal", new THREE.BufferAttribute(tNor, 3).setUsage(THREE.DynamicDrawUsage));
tGeo.setAttribute("color", new THREE.BufferAttribute(tCol, 3).setUsage(THREE.DynamicDrawUsage));
tGeo.setAttribute("uv", new THREE.BufferAttribute(tUv, 2));
tGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -2, 0), 16);
tGeo.boundingBox = new THREE.Box3(new THREE.Vector3(X0, YB, Z0), new THREE.Vector3(X1, 4, Z1));

const terrain = new THREE.Mesh(tGeo, terrainMat);
terrain.castShadow = true;
terrain.receiveShadow = true;
scene.add(terrain);

// 측면 4개
function buildFace(idxList, normal) {
  const n = idxList.length;
  const pos = new Float32Array(n * 2 * 3);
  const nor = new Float32Array(n * 2 * 3);
  const surf = new Float32Array(n * 2);
  for (let k = 0; k < n; k++) {
    const vi = idxList[k];
    const x = tPos[vi * 3], z = tPos[vi * 3 + 2];
    pos.set([x, YB, z, x, 0, z], k * 6);
    nor.set([normal.x, normal.y, normal.z, normal.x, normal.y, normal.z], k * 6);
  }
  const idx = [];
  for (let k = 0; k < n - 1; k++) {
    const a = 2 * k;
    idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const g = new THREE.BufferGeometry();
  g.setIndex(idx);
  g.setAttribute("position", new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
  g.setAttribute("normal", new THREE.BufferAttribute(nor, 3));
  g.setAttribute("aSurf", new THREE.BufferAttribute(surf, 1).setUsage(THREE.DynamicDrawUsage));
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -2, 0), 16);
  const mesh = new THREE.Mesh(g, sectionMat);
  scene.add(mesh);
  return { mesh, idxList, pos, surf, geo: g };
}
const faces = [
  buildFace(Array.from({ length: NX }, (_, i) => (NZ - 1) * NX + i), new THREE.Vector3(0, 0, 1)),
  buildFace(Array.from({ length: NX }, (_, i) => i), new THREE.Vector3(0, 0, -1)),
  buildFace(Array.from({ length: NZ }, (_, j) => j * NX), new THREE.Vector3(-1, 0, 0)),
  buildFace(Array.from({ length: NZ }, (_, j) => j * NX + NX - 1), new THREE.Vector3(1, 0, 0))
];

// 바다
const waterMat = new THREE.MeshPhysicalMaterial({
  color: 0x0b4a63,
  roughness: 0.12,
  metalness: 0,
  transparent: true,
  opacity: 0.14,
  normalMap: TEX.water,
  normalScale: new THREE.Vector2(0.1, 0.1),
  envMapIntensity: 0.4,
  depthWrite: false
});
TEX.water.repeat.set(2.2, 1.1);
const water = new THREE.Mesh(new THREE.PlaneGeometry(X1 - X0, Z1 - Z0, 1, 1), waterMat);
water.rotation.x = -Math.PI / 2;
water.position.y = 0;
water.renderOrder = 2;
water.receiveShadow = true;
scene.add(water);

const hasWater = () => modeId !== 2;

/* =========================================================
   TERRAIN UPDATE
========================================================= */
function toLin(c) { return Math.pow(c, 2.2); }

function updateTerrain(full) {
  // 높이
  for (let j = 0; j < NZ; j++) {
    const z = zs[j];
    for (let i = 0; i < NX; i++) {
      const k = j * NX + i;
      if (full || dynMask[k]) heights[k] = H(xs[i], z);
    }
  }
  // 법선 + 경사
  for (let j = 0; j < NZ; j++) {
    const jm = j > 0 ? j - 1 : j, jp = j < NZ - 1 ? j + 1 : j;
    for (let i = 0; i < NX; i++) {
      const im = i > 0 ? i - 1 : i, ip = i < NX - 1 ? i + 1 : i;
      const k = j * NX + i;
      const dhdx = (heights[j * NX + ip] - heights[j * NX + im]) / (xs[ip] - xs[im]);
      const dhdz = (heights[jp * NX + i] - heights[jm * NX + i]) / (zs[jp] - zs[jm]);
      const len = Math.hypot(dhdx, 1, dhdz);
      tNor[k * 3] = -dhdx / len;
      tNor[k * 3 + 1] = 1 / len;
      tNor[k * 3 + 2] = -dhdz / len;
      slopes[k] = Math.hypot(dhdx, dhdz);
      tPos[k * 3 + 1] = heights[k];
    }
  }
  // 색 (천천히 변하므로 3번에 1번만 갱신)
  colorTick = (colorTick + 1) % 3;
  if (full || colorTick === 0) for (let j = 0; j < NZ; j++) {
    const z = zs[j];
    for (let i = 0; i < NX; i++) {
      const k = j * NX + i;
      if (!full && !dynMask[k]) continue;
      const c = colorAt(xs[i], z, heights[k], slopes[k]);
      // 골짜기는 어둡게, 능선은 살짝 밝게 (공동 차폐)
      const im = i > 1 ? i - 2 : 0, ip = i < NX - 2 ? i + 2 : NX - 1;
      const jm = j > 1 ? j - 2 : 0, jp = j < NZ - 2 ? j + 2 : NZ - 1;
      const lap = (heights[j * NX + im] + heights[j * NX + ip] + heights[jm * NX + i] + heights[jp * NX + i]) * 0.25 - heights[k];
      const ao = clamp(1 - lap * 3.2, 0.6, 1.12);
      tCol[k * 3] = toLin(c[0]) * ao;
      tCol[k * 3 + 1] = toLin(c[1]) * ao;
      tCol[k * 3 + 2] = toLin(c[2]) * ao;
    }
  }
  tGeo.attributes.position.needsUpdate = true;
  tGeo.attributes.normal.needsUpdate = true;
  if (full || colorTick === 0) tGeo.attributes.color.needsUpdate = true;
  if (modeId === 2 && trees.length) updateTrees();

  const w = hasWater();
  for (const f of faces) {
    const n = f.idxList.length;
    for (let k = 0; k < n; k++) {
      const h = heights[f.idxList[k]];
      f.pos[(2 * k + 1) * 3 + 1] = w ? Math.max(h, 0) : h;
      f.surf[2 * k] = h;
      f.surf[2 * k + 1] = h;
    }
    f.geo.attributes.position.needsUpdate = true;
    f.geo.attributes.aSurf.needsUpdate = true;
  }
}

function heightNow(x, z) { return H(x, z); }

/* =========================================================
   PARTICLES
========================================================= */
const fxGroup = new THREE.Group();
scene.add(fxGroup);

class Emitter {
  constructor(o) {
    this.o = Object.assign({
      rate: 6, life: 4, size: [0.2, 1], vel: [0, 0.5, 0], spread: 0.08, jitter: 0.1,
      color: 0x777777, opacity: 0.6, additive: false, renderOrder: 1, max: 80, posFn: null
    }, o);
    this.parts = [];
    this.acc = 0;
    this.enabled = true;
    this.intensity = 1;
  }
  spawn(pos) {
    const o = this.o;
    let p = this.parts.find((q) => !q.alive);
    if (!p) {
      if (this.parts.length >= o.max) return;
      const mat = new THREE.SpriteMaterial({
        map: o.additive ? TEX.glow : TEX.smoke,
        color: o.color,
        transparent: true,
        depthWrite: false,
        opacity: 0,
        blending: o.additive ? THREE.AdditiveBlending : THREE.NormalBlending
      });
      const sp = new THREE.Sprite(mat);
      sp.renderOrder = o.renderOrder;
      fxGroup.add(sp);
      p = { sp, alive: false };
      this.parts.push(p);
    }
    const base = pos || (o.posFn ? o.posFn() : o.pos);
    p.alive = true;
    p.age = 0;
    p.life = o.life * (0.75 + Math.random() * 0.5);
    p.sp.position.set(base.x + (Math.random() - 0.5) * o.jitter, base.y, base.z + (Math.random() - 0.5) * o.jitter);
    p.v = new THREE.Vector3(
      o.vel[0] + (Math.random() - 0.5) * o.spread * 2,
      o.vel[1] * (0.8 + Math.random() * 0.4),
      o.vel[2] + (Math.random() - 0.5) * o.spread * 2
    );
    p.sp.material.rotation = Math.random() * Math.PI * 2;
    p.rot = (Math.random() - 0.5) * 0.4;
    p.sp.visible = true;
  }
  burst(n, posFn) { for (let i = 0; i < n; i++) this.spawn(posFn()); }
  update(dt) {
    const o = this.o;
    if (this.enabled && o.rate > 0) {
      this.acc += dt * o.rate * this.intensity;
      while (this.acc > 1) { this.acc -= 1; this.spawn(); }
    }
    for (const p of this.parts) {
      if (!p.alive) continue;
      p.age += dt;
      const t = p.age / p.life;
      if (t >= 1 || (o.ceil !== undefined && p.sp.position.y > o.ceil)) { p.alive = false; p.sp.visible = false; continue; }
      p.v.y *= 1 - dt * 0.25;
      p.sp.position.addScaledVector(p.v, dt);
      const s = lerp(o.size[0], o.size[1], Math.sqrt(t));
      p.sp.scale.set(s, s, s);
      p.sp.material.rotation += p.rot * dt;
      let a = smooth(0, 0.12, t) * (1 - smooth(0.55, 1, t));
      if (o.ceil !== undefined) a *= 1 - smooth(o.ceil - 0.4, o.ceil, p.sp.position.y);
      p.sp.material.opacity = a * o.opacity;
    }
  }
  dispose() {
    for (const p of this.parts) { fxGroup.remove(p.sp); p.sp.material.dispose(); }
    this.parts = [];
  }
}

let emitters = [];
let dustEmitter = null;
let modeObjects = []; // 모드별 추가 객체
let lavaLight = null;
let lavaGlow = null;

/* =========================================================
   ARROWS
========================================================= */
const arrowGroup = new THREE.Group();
scene.add(arrowGroup);
const arrowMat = new THREE.MeshStandardMaterial({
  color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.08,
  roughness: 0.45, transparent: true, opacity: 0.9
});
const flowMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false });
const flowDotMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95 });
let plateArrows = [];
let flowPaths = [];
let symbolSprites = [];

function makeArrowGeo(len) {
  const s = new THREE.Shape();
  const w = 0.12, hw = 0.34, hl = 0.55;
  s.moveTo(0, -w); s.lineTo(len - hl, -w); s.lineTo(len - hl, -hw); s.lineTo(len, 0);
  s.lineTo(len - hl, hw); s.lineTo(len - hl, w); s.lineTo(0, w); s.lineTo(0, -w);
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2 });
  g.rotateX(-Math.PI / 2);
  return g;
}

function addPlateArrow(x, z, dx, dz, len, yFn) {
  const mesh = new THREE.Mesh(makeArrowGeo(len), arrowMat.clone());
  mesh.castShadow = true;
  mesh.rotation.y = Math.atan2(-dz, dx);
  arrowGroup.add(mesh);
  plateArrows.push({ mesh, x, z, dx, dz, len, yFn, phase: Math.random() });
}

function addFlowPath(points, dots = 4) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(p[0], p[1], Z1 + 0.03)));
  const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 80, 0.035, 8, false), flowMat);
  const head = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.32, 16), flowMat);
  const end = curve.getPointAt(1), tan = curve.getTangentAt(1);
  head.position.copy(end);
  head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tan);
  arrowGroup.add(tube, head);
  const ds = [];
  for (let i = 0; i < dots; i++) {
    const d = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 12), flowDotMat);
    arrowGroup.add(d);
    ds.push(d);
  }
  flowPaths.push({ curve, tube, head, dots: ds });
}

function clearArrows() {
  arrowGroup.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material !== flowMat && o.material !== flowDotMat && o.material !== arrowMat) o.material.dispose(); });
  arrowGroup.clear();
  plateArrows = [];
  flowPaths = [];
  symbolSprites = [];
}

/* =========================================================
   LABELS
========================================================= */
let labels = [];
function setLabels(list) {
  labelLayer.innerHTML = "";
  labels = list.map(([text, fn]) => {
    const el = document.createElement("div");
    el.className = "lbl";
    el.innerHTML = `<span>${text}</span><i></i><b></b>`;
    labelLayer.appendChild(el);
    return { el, fn };
  });
}
const _v = new THREE.Vector3();
function updateLabels() {
  const on = showLabels.checked;
  labelLayer.style.display = on ? "" : "none";
  if (!on) return;
  const w = canvas.clientWidth, h = canvas.clientHeight;
  for (const l of labels) {
    const p = l.fn();
    _v.set(p[0], p[1], p[2]).project(camera);
    const x = (_v.x * 0.5 + 0.5) * w;
    const y = (-_v.y * 0.5 + 0.5) * h;
    l.el.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
    l.el.style.opacity = _v.z < 1 ? 1 : 0;
  }
}

/* =========================================================
   LEGEND
========================================================= */
const LEGENDS = {
  divergent: [["#6e6556", "퇴적층"], ["#2a2a2c", "해양 지각(현무암·반려암)"], ["#55603d", "암석권 맨틀"], ["#d9772a", "연약권"], ["#ffb347", "마그마"], ["#2a6f93", "바닷물"]],
  convergent: [["#2a2a2c", "해양 지각"], ["#b59c92", "대륙 지각(화강암)"], ["#5a6b6c", "섭입하는 판(차가움)"], ["#55603d", "암석권 맨틀"], ["#d9772a", "연약권"], ["#ffb347", "마그마"]],
  transform: [["#c49a64", "퇴적층"], ["#b59c92", "대륙 지각"], ["#b8afa0", "단층 파쇄대"], ["#55603d", "암석권 맨틀"], ["#d9772a", "연약권"]]
};
function setLegend(type) {
  legendBox.innerHTML = LEGENDS[type].map(([c, t]) => `<span class="lg"><span class="sw" style="background:${c}"></span>${t}</span>`).join("");
}

/* =========================================================
   QUAKES
========================================================= */
let qIdx = 0;
function addQuake(x, y, z, mag = 1) {
  const q = U.uQuakes.value[qIdx];
  q.set(x, y, z, simTime);
  U.uQMag.value[qIdx] = mag;
  qIdx = (qIdx + 1) % 8;
  if (mag > 1.3) shake = Math.max(shake, 0.06 * mag);
}

function randomQuake() {
  const zf = Z1 - 0.02; // 단면 위에 진원 표시
  if (modeId === 0) {
    addQuake((Math.random() - 0.5) * 1.2, divBase(0) - 0.15 - Math.random() * 0.5, zf, 0.6 + Math.random() * 0.6);
  } else if (modeId === 1) {
    const r = Math.random();
    if (r < 0.8) {
      const w = Math.pow(Math.random(), 1.3) * 6.4;
      const x = XT + w;
      const ys = -2.6 - KS * w * w;
      addQuake(x, ys - 0.12 - Math.random() * 0.3, zf, 0.6 + Math.random() * 0.9 * (1 - w / 9));
    } else {
      const x = 1.5 + Math.random() * 6;
      addQuake(x, -0.4 - Math.random() * 1.0, zf, 0.5 + Math.random() * 0.4);
    }
  } else {
    addQuake((Math.random() - 0.5) * 0.12, -0.2 - Math.random() * 1.3, zf, 0.4 + Math.random() * 0.35);
  }
}

/* =========================================================
   VEGETATION (InstancedMesh)
========================================================= */
const broadGeo = (() => {
  const g = new THREE.IcosahedronGeometry(1, 1);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    const n = 1 + 0.18 * Math.sin(x * 7 + y * 5) * Math.cos(z * 6);
    p.setXYZ(i, x * n, (y * 0.8 + 0.75) * n, z * n);
  }
  g.computeVertexNormals();
  return g;
})();
const conGeo = (() => {
  const g = new THREE.ConeGeometry(0.55, 2.4, 7, 1);
  g.translate(0, 1.2, 0);
  return g;
})();
const treeMat = new THREE.MeshStandardMaterial({ roughness: 0.95, metalness: 0, envMapIntensity: 0.4 });
let trees = [];          // {x, z0, s, kind}
let broadMesh = null, conMesh = null;
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _col = new THREE.Color();

function clearTrees() {
  for (const m of [broadMesh, conMesh]) if (m) { scene.remove(m); m.dispose(); }
  broadMesh = conMesh = null;
  trees = [];
}

function makeTreeMeshes(nb, nc) {
  if (nb) {
    broadMesh = new THREE.InstancedMesh(broadGeo, treeMat, nb);
    broadMesh.castShadow = true; broadMesh.receiveShadow = true;
    broadMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(broadMesh);
  }
  if (nc) {
    conMesh = new THREE.InstancedMesh(conGeo, treeMat, nc);
    conMesh.castShadow = true; conMesh.receiveShadow = true;
    scene.add(conMesh);
  }
}

function treeColor(kind, r) {
  if (kind === 1) _col.setRGB(lerp(0.07, 0.12, r), lerp(0.15, 0.21, r), lerp(0.08, 0.11, r), THREE.SRGBColorSpace);
  else _col.setRGB(lerp(0.16, 0.27, r), lerp(0.22, 0.31, r), lerp(0.09, 0.13, r), THREE.SRGBColorSpace);
  return _col;
}

function plantConvergent() {
  let s = 99;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const list = [];
  for (let tries = 0; tries < 60000 && list.length < 4200; tries++) {
    const x = 1.25 + rnd() * 8.65, z = Z0 + 0.06 + rnd() * (Z1 - Z0 - 0.12);
    const h = convH(x, z);
    if (h < 0.1 || h > 1.45) continue;
    const e = 0.06;
    const sl = Math.hypot(convH(x + e, z) - convH(x - e, z), convH(x, z + e) - convH(x, z - e)) / (2 * e);
    if (sl > 0.95) continue;
    const [, vinf] = volcAt(x, z);
    if (vinf > 0.12) continue;
    const n = snoise(x * 1.1, z * 1.1) * 0.5 + 0.5;
    const dens = n * 1.3 - 0.35 - (h > 1.0 ? (h - 1.0) * 1.5 : 0);
    if (rnd() > dens) continue;
    list.push({ x, z0: z, y: h, kind: h > 0.75 ? 1 : 0, s: 0.05 + rnd() * 0.035, r: rnd(), rot: rnd() * 6.28 });
  }
  trees = list;
  const nb = list.filter((t) => t.kind === 0).length, nc = list.length - nb;
  makeTreeMeshes(nb, nc);
  let ib = 0, ic = 0;
  for (const t of list) {
    _q.setFromAxisAngle(_p.set(0, 1, 0), t.rot);
    if (t.kind === 0) {
      _s.set(t.s, t.s * 0.9, t.s);
      _m.compose(_p.set(t.x, t.y - 0.01, t.z0), _q, _s);
      broadMesh.setMatrixAt(ib, _m); broadMesh.setColorAt(ib, treeColor(0, t.r)); ib++;
    } else {
      _s.set(t.s, t.s, t.s);
      _m.compose(_p.set(t.x, t.y - 0.01, t.z0), _q, _s);
      conMesh.setMatrixAt(ic, _m); conMesh.setColorAt(ic, treeColor(1, t.r)); ic++;
    }
  }
  for (const m of [broadMesh, conMesh]) if (m) { m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true; }
}

function plantTransform() {
  let s = 4242;
  const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const list = [];
  for (let i = 0; i < 2600; i++) {
    const x = X0 + 0.08 + rnd() * (X1 - X0 - 0.16);
    if (Math.abs(x) < 0.1) continue;
    list.push({ x, z0: Z0 + rnd() * (Z1 - Z0), s: 0.045 + rnd() * 0.035, r: rnd(), rot: rnd() * 6.28, kind: 0 });
  }
  trees = list;
  makeTreeMeshes(list.length, 0);
  list.forEach((t, i) => broadMesh.setColorAt(i, treeColor(0, t.r)));
  broadMesh.instanceColor.needsUpdate = true;
  updateTrees();
}

// 보존형: 나무가 판과 함께 이동 (평면 좌표에서 숲 밀도를 평가)
function updateTrees() {
  const span = Z1 - Z0;
  for (let i = 0; i < trees.length; i++) {
    const t = trees[i];
    const d = trDisp(t.x);
    let z = t.z0 + d;
    z = Z0 + ((((z - Z0) % span) + span) % span);
    const zz = z - d;
    const off = t.x < 0 ? 11.7 : 0;
    const n = snoise(t.x * 0.55 + off, zz * 0.55) * 0.5 + 0.5;
    const n2 = snoise(t.x * 2.6 + off, zz * 2.6) * 0.5 + 0.5;
    const trough = 1 - smooth(0.15, 0.7, Math.abs(t.x));
    const per = 6.5;
    const rz = (((zz + 1.3) % per) + per) % per - per * 0.5;
    const dens = smooth(0.62, 0.78, n2) * smooth(0.3, 0.7, n) + trough * 0.55 + smooth(0.6, 0.85, n) * 0.25;
    const ok = Math.abs(rz) > 0.32 && z > Z0 + 0.06 && z < Z1 - 0.06 && t.r < dens;
    const sc = ok ? t.s : 0;
    _q.setFromAxisAngle(_p.set(0, 1, 0), t.rot);
    _s.set(sc, sc * 0.85, sc);
    _m.compose(_p.set(t.x, ok ? trH(t.x, z) - 0.01 : -50, z), _q, _s);
    broadMesh.setMatrixAt(i, _m);
  }
  broadMesh.instanceMatrix.needsUpdate = true;
}

/* =========================================================
   MODE BUILDERS
========================================================= */
function clearMode() {
  clearTrees();
  for (const e of emitters) e.dispose();
  emitters = [];
  dustEmitter = null;
  for (const o of modeObjects) {
    scene.remove(o);
    o.traverse?.((c) => { c.geometry?.dispose?.(); });
  }
  modeObjects = [];
  lavaLight = null;
  lavaGlow = null;
  clearArrows();
  for (const q of U.uQuakes.value) q.w = -99;
}

function buildDivergent() {
  modeId = 0;
  for (let k = 0; k < NV; k++) dynMask[k] = 1;
  updateTerrain(true);

  // 해저 열수 분출공 (블랙 스모커)
  for (const z of [-3.1, -0.6, 2.2, 4.1]) {
    const y = divH(0.02, z);
    emitters.push(new Emitter({
      pos: new THREE.Vector3(0.02, y + 0.05, z), rate: 3, life: 4.5, size: [0.12, 0.7],
      vel: [0.0, 0.28, 0], spread: 0.03, jitter: 0.05, color: 0x2b2b2e, opacity: 0.55, ceil: -0.12, renderOrder: 1
    }));
  }

  addPlateArrow(-1.3, 1.2, -1, 0, 3.0, () => 0.35);
  addPlateArrow(1.3, 1.2, 1, 0, 3.0, () => 0.35);
  addFlowPath([[0.3, -5.6], [0.35, -3.6], [0.9, -2.75], [2.5, -3.45], [4.6, -4.2]]);
  addFlowPath([[-0.3, -5.6], [-0.35, -3.6], [-0.9, -2.75], [-2.5, -3.45], [-4.6, -4.2]]);
  addFlowPath([[7.3, -4.9], [9.2, -5.25], [9.6, -5.85]], 2);
  addFlowPath([[-7.3, -4.9], [-9.2, -5.25], [-9.6, -5.85]], 2);

  setLabels([
    ["해령 · 열곡", () => [0, divH(0, -3.4) + 0.1, -3.4]],
    ["새로운 해양 지각", () => [3.8, divBase(3.8) - 0.32, Z1]],
    ["마그마 방", () => [0, divBase(0) - 0.34, Z1]],
    ["부분 용융 (감압 용융)", () => [0, -4.3, Z1]],
    ["암석권 (판)", () => [-7, -3.2, Z1]],
    ["연약권", () => [5.5, -5.3, Z1]],
    ["해양판", () => [-6, 0.02, -2.5]],
    ["해양판", () => [6, 0.02, -2.5]]
  ]);
}

function buildConvergent() {
  modeId = 1;
  for (let j = 0; j < NZ; j++) for (let i = 0; i < NX; i++) dynMask[j * NX + i] = xs[i] < XT + 0.05 ? 1 : 0;
  updateTerrain(true);
  plantConvergent();

  const v0 = VOLCANOES[0];
  const top = convH(v0.x, v0.z);
  // 화산재 기둥
  emitters.push(new Emitter({
    pos: new THREE.Vector3(v0.x, top + 0.02, v0.z), rate: 7, life: 6, size: [0.25, 1.9],
    vel: [0.12, 0.62, -0.08], spread: 0.08, jitter: 0.12, color: 0x5d5853, opacity: 0.75, max: 70
  }));
  // 분화구 불빛
  emitters.push(new Emitter({
    pos: new THREE.Vector3(v0.x, top + 0.04, v0.z), rate: 10, life: 0.8, size: [0.35, 0.7],
    vel: [0, 0.25, 0], spread: 0.05, jitter: 0.08, color: new THREE.Color(2.2, 0.7, 0.15), opacity: 0.7, additive: true, max: 20
  }));
  // 다른 화산 수증기
  for (const v of VOLCANOES.slice(1)) {
    const t = convH(v.x, v.z);
    emitters.push(new Emitter({
      pos: new THREE.Vector3(v.x, t + 0.02, v.z), rate: 1.6, life: 4, size: [0.15, 0.9],
      vel: [0.1, 0.35, -0.05], spread: 0.05, jitter: 0.08, color: 0xe2e4e6, opacity: 0.45, max: 20
    }));
  }
  lavaLight = new THREE.PointLight(0xff6a1a, 6, 4, 2);
  lavaLight.position.set(v0.x, top + 0.35, v0.z);
  scene.add(lavaLight);
  modeObjects.push(lavaLight);

  addPlateArrow(-7.2, 1.0, 1, 0, 3.2, () => 0.35);
  addPlateArrow(9.4, -1.4, -1, 0, 2.0, (x, z) => heightNow(x, z) + 0.55);
  // 섭입판 따라 내려가는 흐름
  const slabPts = [];
  for (let w = 0.2; w <= 6.3; w += 0.5) {
    const g = 2 * KS * w, n = Math.hypot(g, 1);
    const ys = -2.6 - KS * w * w;
    slabPts.push([XT + w - g / n, ys - 1.0 / n]);
  }
  addFlowPath(slabPts, 5);
  addFlowPath([[-8.5, -4.5], [-6, -4.45], [-3.2, -4.4], [-2.0, -4.5]], 3);
  addFlowPath([[9.3, -3.75], [7.3, -3.8], [5.8, -4.5], [5.25, -5.5]], 3);

  setLabels([
    ["해구", () => [XT, convH(XT, -3.6) + 0.05, -3.6]],
    ["해양판", () => [-6.5, 0.02, -2.6]],
    ["대륙판", () => [8.2, convH(8.2, -2.4) + 0.08, -2.4]],
    ["화산호 (안데스형 산맥)", () => [VOLCANOES[1].x, convH(VOLCANOES[1].x, VOLCANOES[1].z) + 0.05, VOLCANOES[1].z]],
    ["섭입하는 해양판", () => [0.1, -3.85, Z1]],
    ["마그마 생성 (부분 용융)", () => [3.25, -3.75, Z1]],
    ["마그마 방", () => [3.75, -1.2, Z1]],
    ["대륙 지각", () => [7.6, -1.0, Z1]],
    ["연약권", () => [7.6, -5.0, Z1]],
    ["해양 지각", () => [-5.5, convOcean(-5.5) - 0.4, Z1]]
  ]);
}

function buildTransform() {
  modeId = 2;
  for (let k = 0; k < NV; k++) dynMask[k] = 1;
  updateTerrain(true);
  plantTransform();

  dustEmitter = new Emitter({
    rate: 0, life: 2.5, size: [0.2, 1.1], vel: [0, 0.25, 0], spread: 0.12, jitter: 0.1,
    color: 0xb59f80, opacity: 0.55, max: 60
  });
  emitters.push(dustEmitter);

  addPlateArrow(-3.2, 2.0, 0, -1, 3.6, (x, z) => heightNow(x, z) + 0.7);
  addPlateArrow(3.2, -2.0, 0, 1, 3.6, (x, z) => heightNow(x, z) + 0.7);

  // 단면 위 운동 방향 기호 (⊗ 안으로, ⊙ 밖으로)
  for (const [x, type] of [[-4, "in"], [4, "out"]]) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: motionSymbolTexture(type), transparent: true, depthWrite: false }));
    sp.scale.set(0.75, 0.75, 0.75);
    sp.position.set(x, -2.8, Z1 + 0.25);
    arrowGroup.add(sp);
    symbolSprites.push(sp);
  }

  setLabels([
    ["변환 단층", () => [0, trH(0.01, -3.3) + 0.05, -3.3]],
    ["태평양판", () => [-6.5, trH(-6.5, -2.6) + 0.05, -2.6]],
    ["북아메리카판", () => [6.5, trH(6.5, -2.6) + 0.05, -2.6]],
    ["단층 파쇄대", () => [0, -0.9, Z1]],
    ["판이 들어감 ⊗", () => [-4, -2.35, Z1]],
    ["판이 나옴 ⊙", () => [4, -2.35, Z1]],
    ["연약권", () => [6, -4.9, Z1]]
  ]);
}

/* =========================================================
   INFO / EXAMPLES
========================================================= */
const INFO = {
  divergent: {
    title: "발산형 경계 — 해령",
    text: "두 판이 서로 멀어지는 경계입니다. 판이 벌어진 틈으로 뜨거운 맨틀이 올라오면 압력이 낮아져 부분 용융(감압 용융)이 일어나고, 만들어진 마그마가 해령 아래 마그마 방에 모였다가 분출하여 새로운 해양 지각이 됩니다. 해령에서 멀어질수록 지각의 나이가 많아지고 퇴적물이 두꺼워지며, 판이 식어 무거워지므로 수심도 깊어집니다. 해령 중앙에는 열곡이 발달하고, 얕은 곳에서 지진과 화산 활동이 일어납니다. ‘경계선 · 고지자기 줄무늬’를 켜면 해령을 중심으로 대칭인 고지자기 줄무늬를 볼 수 있습니다."
  },
  convergent: {
    title: "수렴형 경계 — 섭입대",
    text: "밀도가 큰 해양판이 대륙판 아래로 비스듬히 들어가는(섭입) 경계입니다. 해양판이 휘어져 내려가는 곳에 깊은 해구가 생깁니다. 섭입하는 판에서 빠져나온 물이 위쪽 맨틀 쐐기의 녹는점을 낮추어 마그마가 만들어지고, 이 마그마가 상승하여 대륙 쪽에 화산호(안데스형 산맥)를 만듭니다. 지진은 섭입하는 판을 따라 일어나며, 해구에서 대륙 쪽으로 갈수록 진원이 깊어집니다(베니오프대)."
  },
  transform: {
    title: "보존형 경계 — 변환 단층",
    text: "두 판이 경계와 나란한 방향으로 서로 어긋나게 미끄러지는 경계로, 판이 생성되거나 소멸하지 않습니다. 단층면이 마찰로 붙잡혀 있는 동안 주변 암석이 휘어지며 변형 에너지가 쌓이고, 한계를 넘으면 순간적으로 미끄러지면서 지진이 발생합니다(탄성 반발설). 단층을 가로지르는 도로가 서서히 휘다가 지진과 함께 끊어져 어긋나는 모습을 관찰해 보세요. 화산 활동은 거의 일어나지 않습니다."
  }
};

function updateExamples(type) {
  const data = {
    divergent: {
      examples: [
        { name: "대서양 중앙 해령", desc: "해양판-해양판 발산형 경계. 새로운 해양 지각이 생성된다." },
        { name: "동태평양 해령", desc: "해양판-해양판 발산형 경계. 확장 속도가 빨라 열곡이 뚜렷하지 않다." },
        { name: "동아프리카 열곡대", desc: "대륙판-대륙판 발산형 경계. 대륙이 갈라지는 지역이다." }
      ],
      markers: [{ x: 47, y: 48 }, { x: 25, y: 62 }, { x: 57, y: 58 }]
    },
    convergent: {
      examples: [
        { name: "페루-칠레 해구", desc: "해양판-대륙판 수렴형 경계. 해구와 안데스 산맥이 형성된다." },
        { name: "안데스 산맥", desc: "나스카판이 남아메리카판 아래로 섭입하여 형성되었다." },
        { name: "알류샨 열도", desc: "해양판-해양판 수렴형 경계. 호상 열도가 발달한다." },
        { name: "마리아나 해구", desc: "해양판-해양판 수렴형 경계. 지구에서 가장 깊은 해구가 있다." },
        { name: "히말라야 산맥", desc: "대륙판-대륙판 충돌형 경계. 높은 습곡 산맥이 형성된다." },
        { name: "알프스 산맥", desc: "대륙판-대륙판 충돌로 형성된 대표적인 습곡 산맥이다." }
      ],
      markers: [{ x: 29, y: 72 }, { x: 31, y: 73 }, { x: 75, y: 32 }, { x: 83, y: 54 }, { x: 66, y: 47 }, { x: 53, y: 43 }]
    },
    transform: {
      examples: [
        { name: "산안드레아스 단층", desc: "태평양판과 북아메리카판이 서로 어긋나게 이동하는 보존형 경계이다." }
      ],
      markers: [{ x: 22, y: 43 }]
    }
  };
  const selected = data[type];
  if (!selected) return;
  exampleList.innerHTML = selected.examples.map((e) => `
    <div class="example-item">
      <div class="example-name">${e.name}</div>
      <div class="example-desc">${e.desc}</div>
    </div>`).join("");
  mapMarkers.innerHTML = selected.markers.map((m) => `<div class="map-marker" style="left:${m.x}%; top:${m.y}%;"></div>`).join("");
}

function rebuild() {
  clearMode();
  T = 0; S = 0; slipTarget = 0;
  const type = boundaryType.value;
  if (type === "divergent") buildDivergent();
  else if (type === "convergent") buildConvergent();
  else buildTransform();
  water.visible = hasWater();
  U.uMode.value = modeId;
  infoTitle.textContent = INFO[type].title;
  infoText.textContent = INFO[type].text;
  setLegend(type);
  updateExamples(type);
}

/* =========================================================
   POST PROCESSING
========================================================= */
const rt = new THREE.WebGLRenderTarget(1100, 620, { type: THREE.HalfFloatType, samples: 4 });
const composer = new EffectComposer(renderer, rt);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(1100, 620), 0.55, 0.55, 0.92);
composer.addPass(bloom);
composer.addPass(new OutputPass());

function isFullscreen() {
  return (document.fullscreenElement || document.webkitFullscreenElement) === wrap;
}
function resize() {
  const fs = isFullscreen();
  const w = fs ? window.innerWidth : Math.max(320, wrap.clientWidth);
  const h = fs ? window.innerHeight : Math.round(w * 620 / 1100);
  const pr = Math.min(window.devicePixelRatio || 1, 1.5);
  renderer.setPixelRatio(pr);
  renderer.setSize(w, h, false);
  composer.setPixelRatio(pr);
  composer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(wrap);
resize();

/* =========================================================
   LOOP
========================================================= */
const clock = new THREE.Clock();
let quakeAcc = 0;
let terrainAcc = 0, lastTerrainT = 0, lastTerrainS = 0;

function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  simTime += dt;

  const speed = Number(speedSlider.value) / 100;
  const magma = showMagma.checked ? Number(magmaSlider.value) / 100 : 0;
  const qf = Number(quakeSlider.value) / 100;
  const v = speed * 0.45;

  const prevT = T, prevS = S;
  T += v * dt;

  // 보존형: 탄성 반발 주기
  if (modeId === 2) {
    const thr = lerp(1.3, 0.25, qf);
    if (T - slipTarget > thr) {
      slipTarget = T;
      const mag = 1 + thr * 1.2;
      addQuake(0, -0.85, Z1 - 0.02, mag);
      shake = Math.max(shake, 0.05 + thr * 0.08);
      if (dustEmitter) dustEmitter.burst(30, () => {
        const z = Z0 + 0.3 + Math.random() * (Z1 - Z0 - 0.6);
        return new THREE.Vector3((Math.random() - 0.5) * 0.3, trH(0.01, z), z);
      });
    }
    S += (slipTarget - S) * Math.min(1, dt * 14);
    U.uSlip.value = S;
    U.uDef.value = T - S;
  }

  U.uTime.value = simTime;
  U.uT.value = T;
  U.uMagma.value = magma;
  U.uFlow.value = showMantle.checked ? 1 : 0;
  U.uOutline.value = showPlates.checked ? 1 : 0;
  U.uOverlay.value = showBoundary.checked ? 1 : 0;
  U.uQuakeOn.value = showQuakes.checked ? 1 : 0;

  terrainAcc += dt;
  if ((T !== lastTerrainT || S !== lastTerrainS) && terrainAcc > 1 / 30) {
    terrainAcc = 0;
    lastTerrainT = T; lastTerrainS = S;
    updateTerrain(false);
  }

  // 무작위 지진
  if (showQuakes.checked) {
    quakeAcc += dt * qf * (modeId === 2 ? 0.6 : 1.4);
    while (quakeAcc > 1) { quakeAcc -= Math.random() * 1.6; randomQuake(); }
  }

  // 파티클
  for (const e of emitters) {
    e.enabled = magma > 0.01 || e === dustEmitter;
    e.intensity = e === dustEmitter ? 1 : 0.35 + magma;
    e.update(dt);
  }
  if (lavaLight) {
    lavaLight.intensity = magma * (5 + Math.sin(simTime * 9) * 1.2 + Math.random() * 0.8);
  }

  // 판 화살표
  const showA = showArrows.checked;
  arrowGroup.visible = showA;
  for (const a of plateArrows) {
    a.phase = (a.phase + dt * (0.15 + speed * 0.5)) % 1;
    const off = a.phase * 0.9;
    const x = a.x + a.dx * off, z = a.z + a.dz * off;
    const mx = x + a.dx * a.len * 0.5, mz = z + a.dz * a.len * 0.5;
    const y = Math.max(a.yFn(x, z), a.yFn(mx, mz), a.yFn(x + a.dx * a.len, z + a.dz * a.len));
    a.mesh.position.set(x, y, z);
    a.mesh.material.opacity = Math.sin(a.phase * Math.PI) * 0.9 + 0.05;
  }
  for (const f of flowPaths) {
    const n = f.dots.length;
    f.dots.forEach((d, i) => {
      const t = (simTime * (0.05 + speed * 0.18) + i / n) % 1;
      d.position.copy(f.curve.getPointAt(t));
      d.visible = showMantle.checked;
    });
    f.tube.visible = f.head.visible = showMantle.checked;
  }

  water.material.normalMap.offset.set(simTime * 0.012, simTime * 0.007);

  controls.update();
  // 지진 흔들림
  let sx = 0, sy = 0;
  if (shake > 0.001) {
    sx = (Math.random() - 0.5) * shake;
    sy = (Math.random() - 0.5) * shake;
    camera.position.x += sx; camera.position.y += sy;
    shake *= Math.pow(0.02, dt);
  }
  composer.render();
  if (sx || sy) { camera.position.x -= sx; camera.position.y -= sy; }

  updateLabels();
}

/* =========================================================
   EVENTS
========================================================= */
boundaryType.addEventListener("change", rebuild);

// 전체화면 (Esc로 나가기 — 브라우저 기본 동작)
const fsBtn = $("fsBtn");
const hintEl = wrap.querySelector(".sim-hint");
const HINT_NORMAL = hintEl.textContent;
function toggleFullscreen() {
  if (isFullscreen()) {
    (document.exitFullscreen || document.webkitExitFullscreen).call(document);
  } else {
    const req = wrap.requestFullscreen || wrap.webkitRequestFullscreen;
    if (req) req.call(wrap);
  }
}
function onFsChange() {
  const fs = isFullscreen();
  fsBtn.querySelector("span").textContent = fs ? "나가기 (Esc)" : "전체화면";
  fsBtn.setAttribute("aria-label", fs ? "전체화면 나가기" : "전체화면");
  hintEl.textContent = fs ? "드래그 회전 · 우클릭 드래그 이동 · 스크롤 확대 · 더블클릭 초기화 · Esc 나가기" : HINT_NORMAL;
  resize();
}
fsBtn.addEventListener("click", toggleFullscreen);
document.addEventListener("fullscreenchange", onFsChange);
document.addEventListener("webkitfullscreenchange", onFsChange);
window.addEventListener("resize", () => { if (isFullscreen()) resize(); });
window.addEventListener("keydown", (e) => {
  if ((e.key === "f" || e.key === "F") && !e.ctrlKey && !e.metaKey && !e.altKey &&
      !/INPUT|SELECT|TEXTAREA/.test(document.activeElement?.tagName || "")) toggleFullscreen();
});

$("captureBtn").addEventListener("click", () => {
  composer.render();
  const link = document.createElement("a");
  link.download = "판의_경계_3D_시뮬레이터.png";
  link.href = renderer.domElement.toDataURL("image/png");
  link.click();
});

rebuild();
animate();
loadingBox.style.opacity = 0;
