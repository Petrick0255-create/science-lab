import * as THREE from "https://esm.sh/three@0.160.0";
import { OrbitControls } from "https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js";

const canvas = document.getElementById("simCanvas");

const boundaryType = document.getElementById("boundaryType");
const speedSlider = document.getElementById("speed");
const magmaSlider = document.getElementById("magma");
const quakeSlider = document.getElementById("quake");

const showLabels = document.getElementById("showLabels");
const showArrows = document.getElementById("showArrows");
const showQuakes = document.getElementById("showQuakes");
const showMagma = document.getElementById("showMagma");

const infoTitle = document.getElementById("infoTitle");
const infoText = document.getElementById("infoText");

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdff6ff);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  preserveDrawingBuffer: true
});

renderer.setSize(canvas.width, canvas.height, false);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.shadowMap.enabled = true;

const camera = new THREE.PerspectiveCamera(
  45,
  canvas.width / canvas.height,
  0.1,
  1000
);

camera.position.set(8, 7, 14);
camera.lookAt(0, 0, 0);
controls.target.set(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);

const light = new THREE.DirectionalLight(0xffffff, 2.2);
light.position.set(6, 12, 8);
light.castShadow = true;
scene.add(light);

scene.add(new THREE.AmbientLight(0xffffff, 1.25));

const mainGroup = new THREE.Group();
scene.add(mainGroup);

const materials = {
  ocean: new THREE.MeshStandardMaterial({
    color: 0x1e9be0,
    transparent: true,
    opacity: 0.62
  }),
  mantle: new THREE.MeshStandardMaterial({
    color: 0xf97316,
    roughness: 0.7
  }),
  oceanPlate: new THREE.MeshStandardMaterial({
    color: 0x5f7f95,
    roughness: 0.75
  }),
  youngCrust: new THREE.MeshStandardMaterial({
    color: 0x86d1ff,
    roughness: 0.5
  }),
  oldCrust: new THREE.MeshStandardMaterial({
    color: 0x36576a,
    roughness: 0.85
  }),
  slab: new THREE.MeshStandardMaterial({
    color: 0x354f60,
    roughness: 0.85
  }),
  continent: new THREE.MeshStandardMaterial({
    color: 0xb88a55,
    roughness: 0.85
  }),
  magma: new THREE.MeshStandardMaterial({
    color: 0xff2d18,
    emissive: 0xff2200,
    emissiveIntensity: 1.7
  }),
  dark: new THREE.MeshStandardMaterial({
    color: 0x202020
  }),
  quake: new THREE.MeshBasicMaterial({
    color: 0xff0000,
    transparent: true,
    opacity: 1
  })
};

let time = 0;
let labels = [];
let arrows = [];
let plateObjects = [];
let magmaObjects = [];
let quakes = [];
let crustBands = [];
let benioffDots = [];

function clearScene() {
  labels.forEach(l => {
    l.div.remove();
    l.line.remove();
  });
  labels = [];

  while (mainGroup.children.length) {
    const obj = mainGroup.children.pop();
    obj.traverse?.(child => {
      if (child.geometry) child.geometry.dispose();
    });
  }

  arrows = [];
  plateObjects = [];
  magmaObjects = [];
  quakes = [];
  crustBands = [];
  benioffDots = [];
}

function addBox(x, y, z, sx, sy, sz, mat) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mainGroup.add(mesh);
  return mesh;
}

function addCone(x, y, z, r, h, mat) {
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(r, h, 48), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mainGroup.add(mesh);
  return mesh;
}

function addCylinder(x, y, z, r, h, mat) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 48), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mainGroup.add(mesh);
  return mesh;
}

function addText(text, x, y, z, ox = 35, oy = -30) {
  const div = document.createElement("div");
  div.className = "label3d";
  div.textContent = text;

  const line = document.createElement("div");
  line.className = "labelLine";

  document.querySelector(".sim-area").appendChild(div);
  document.querySelector(".sim-area").appendChild(line);

  labels.push({
    div,
    line,
    position: new THREE.Vector3(x, y, z),
    ox,
    oy
  });
}

function addArrow(start, end, color = 0x111111) {
  const dir = new THREE.Vector3().subVectors(end, start).normalize();
  const len = start.distanceTo(end);

  const arrow = new THREE.ArrowHelper(
    dir,
    start,
    len,
    color,
    0.55,
    0.32
  );

  mainGroup.add(arrow);
  arrows.push(arrow);

  return arrow;
}

function addOceanAndMantle() {
  addBox(0, 0.55, 0, 18, 0.12, 9, materials.ocean);
  addBox(0, -1.55, 0, 20, 1.8, 10, materials.mantle);

  for (let i = 0; i < 20; i++) {
    const blob = addCylinder(
      -9 + i,
      -0.8,
      -3.8 + Math.random() * 7.6,
      0.16,
      0.06,
      materials.magma
    );

    blob.scale.x = 2.1;
    blob.scale.z = 0.7;
    magmaObjects.push(blob);
  }
}

function makeVolcano(x, z) {
  const cone = addCone(x, 1.05, z, 0.75, 1.7, materials.continent);
  const crater = addCylinder(x, 1.9, z, 0.22, 0.08, materials.dark);
  const lava = addCone(x, 2.08, z, 0.18, 0.55, materials.magma);

  magmaObjects.push(lava);
  return { cone, crater, lava };
}

function buildDivergent() {
  clearScene();
  addOceanAndMantle();

  const left = addBox(-3.6, 0, 0, 6.2, 0.55, 6.6, materials.oceanPlate);
  const right = addBox(3.6, 0, 0, 6.2, 0.55, 6.6, materials.oceanPlate);

  left.rotation.z = -0.04;
  right.rotation.z = 0.04;

  plateObjects.push({ mesh: left, baseX: -3.6, dirX: -1, kind: "divergent" });
  plateObjects.push({ mesh: right, baseX: 3.6, dirX: 1, kind: "divergent" });

  const ridge = addCone(0, 0.55, 0, 1.15, 1.35, materials.oceanPlate);
  ridge.rotation.z = Math.PI;
  ridge.scale.z = 2.9;

  const plume = addCone(0, -0.35, 0, 0.75, 2.7, materials.magma);
  plume.rotation.z = Math.PI;
  magmaObjects.push(plume);

  for (let i = 0; i < 10; i++) {
    const offset = i * 0.55;

    const leftBand = addBox(-0.35 - offset, 0.34, 0, 0.18, 0.08, 6.75, i % 2 ? materials.oldCrust : materials.youngCrust);
    const rightBand = addBox(0.35 + offset, 0.34, 0, 0.18, 0.08, 6.75, i % 2 ? materials.oldCrust : materials.youngCrust);

    crustBands.push({ mesh: leftBand, side: -1, offset });
    crustBands.push({ mesh: rightBand, side: 1, offset });
  }

  addArrow(new THREE.Vector3(-0.8, 1.45, 0), new THREE.Vector3(-3.4, 1.45, 0));
  addArrow(new THREE.Vector3(0.8, 1.45, 0), new THREE.Vector3(3.4, 1.45, 0));

  addText("해령", -0.45, 2.35, 0);
  addText("새로운 해양 지각 생성", -2.0, -0.25, 3.1);
  addText("해양판", -4.6, 0.95, -2.9);
  addText("해양판", 3.6, 0.95, -2.9);

  infoTitle.textContent = "발산형 경계";
  infoText.textContent = "두 판이 서로 멀어지며 해령에서 새로운 해양 지각이 계속 생성되고 양쪽으로 이동한다.";
}

function buildConvergent() {
  clearScene();
  addOceanAndMantle();

  const oceanPlate = addBox(-3.4, 0, 0, 6.0, 0.45, 6.4, materials.oceanPlate);
  oceanPlate.rotation.z = -0.18;

  const continent = addBox(3.6, 0.15, 0, 7.4, 0.75, 6.4, materials.continent);

  const slab = addBox(0.2, -0.95, 0, 4.3, 0.34, 6.2, materials.slab);
  slab.rotation.z = -0.62;

  plateObjects.push({
    mesh: oceanPlate,
    baseX: -3.4,
    baseY: 0,
    dirX: 1,
    dirY: -0.08,
    kind: "subductingPlate"
  });

  plateObjects.push({
    mesh: continent,
    baseX: 3.6,
    dirX: -0.25,
    kind: "continent"
  });

  plateObjects.push({
    mesh: slab,
    baseX: 0.2,
    baseY: -0.95,
    dirX: 0.6,
    dirY: -0.7,
    kind: "slab"
  });

  makeVolcano(3.2, -0.9);
  makeVolcano(4.5, 1.2);

  const plume = addCone(3.5, -0.35, 0.2, 0.6, 2.5, materials.magma);
  plume.rotation.z = Math.PI;
  magmaObjects.push(plume);

  for (let i = 0; i < 14; i++) {
    const dot = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 16, 16),
      materials.quake.clone()
    );

    dot.position.set(
      -0.6 + i * 0.23,
      0.1 - i * 0.12,
      -2.8 + i * 0.08
    );

    mainGroup.add(dot);
    benioffDots.push(dot);
  }

  addArrow(new THREE.Vector3(-6.0, 1.25, 0), new THREE.Vector3(-3.0, 1.25, 0));
  addArrow(new THREE.Vector3(6.1, 1.25, 0), new THREE.Vector3(3.3, 1.25, 0));

  addText("해구", 0.1, 1.2, -3.0);
  addText("해양판", -5.7, 0.85, 2.8);
  addText("대륙판", 3.8, 1.2, 2.8);
  addText("화산", 3.1, 2.6, -0.9);
  addText("섭입대", 0.2, -1.05, 2.8);
  addText("베니오프대 지진", 0.8, 0.25, -2.7);

  infoTitle.textContent = "수렴형 경계";
  infoText.textContent = "해양판이 대륙판 아래로 실제로 파고드는 것처럼 이동한다. 섭입대를 따라 지진이 분포하고, 위쪽에서는 화산 활동이 나타난다.";
}

function buildTransform() {
  clearScene();
  addOceanAndMantle();

  const a = addBox(-2.9, 0, 0, 5.5, 0.55, 6.4, materials.oceanPlate);
  const b = addBox(2.9, 0, 0, 5.5, 0.55, 6.4, materials.slab);

  plateObjects.push({ mesh: a, baseZ: 0, dirZ: 1, kind: "transform" });
  plateObjects.push({ mesh: b, baseZ: 0, dirZ: -1, kind: "transform" });

  addBox(0, 0.42, 0, 0.08, 0.08, 6.7, materials.dark);

  addArrow(new THREE.Vector3(-3.8, 1.2, -2.4), new THREE.Vector3(-3.8, 1.2, 1.3));
  addArrow(new THREE.Vector3(3.8, 1.2, 2.4), new THREE.Vector3(3.8, 1.2, -1.3));

  addText("보존형 경계", -1.2, 1.6, -3.0);
  addText("단층", 0.25, 1.0, 0);
  addText("판 A", -4.4, 1.0, 2.8);
  addText("판 B", 3.4, 1.0, -2.8);

  infoTitle.textContent = "보존형 경계";
  infoText.textContent = "두 판이 서로 어긋나게 이동하며 단층을 따라 지진이 발생한다.";
}

function rebuild() {
  if (boundaryType.value === "divergent") buildDivergent();
  if (boundaryType.value === "convergent") buildConvergent();
  if (boundaryType.value === "transform") buildTransform();
}

function addQuake(x, y, z) {
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 16, 16),
    materials.quake.clone()
  );

  sphere.position.set(x, y, z);
  mainGroup.add(sphere);

  quakes.push({ mesh: sphere, life: 1 });
}

function updateLabels() {
  const rect = canvas.getBoundingClientRect();
  const area = document.querySelector(".sim-area");
  const areaRect = area.getBoundingClientRect();

  labels.forEach(item => {
    if (!showLabels.checked) {
      item.div.style.display = "none";
      item.line.style.display = "none";
      return;
    }

    const p = item.position.clone();
    p.project(camera);

    if (p.z < -1 || p.z > 1) {
      item.div.style.display = "none";
      item.line.style.display = "none";
      return;
    }

    let anchorX = (p.x * 0.5 + 0.5) * rect.width + rect.left - areaRect.left;
    let anchorY = (-p.y * 0.5 + 0.5) * rect.height + rect.top - areaRect.top;

    let labelX = anchorX + item.ox;
    let labelY = anchorY + item.oy;

    const margin = 45;

    labelX = Math.max(margin, Math.min(rect.width - margin, labelX));
    labelY = Math.max(margin, Math.min(rect.height - margin, labelY));

    item.div.style.display = "block";
    item.line.style.display = "block";

    item.div.style.left = `${labelX}px`;
    item.div.style.top = `${labelY}px`;

    const dx = labelX - anchorX;
    const dy = labelY - anchorY;
    const len = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx);

    item.line.style.left = `${anchorX}px`;
    item.line.style.top = `${anchorY}px`;
    item.line.style.width = `${len}px`;
    item.line.style.transform = `rotate(${angle}rad)`;
  });
}

function animate() {
  requestAnimationFrame(animate);

  const speed = Number(speedSlider.value) / 100;
  const magmaPower = Number(magmaSlider.value) / 100;

  time += 0.008 + speed * 0.025;

  const cycle = (time * 0.55) % 1;
  const smooth = cycle;

  plateObjects.forEach(p => {
    if (p.kind === "divergent") {
      p.mesh.position.x = p.baseX + smooth * 0.75 * p.dirX;
    }

    if (p.kind === "subductingPlate") {
      p.mesh.position.x = p.baseX + smooth * 0.95 * p.dirX;
      p.mesh.position.y = p.baseY + smooth * 0.16 * p.dirY;
    }

    if (p.kind === "continent") {
      p.mesh.position.x = p.baseX + smooth * 0.35 * p.dirX;
    }

    if (p.kind === "slab") {
      p.mesh.position.x = p.baseX + smooth * 0.75 * p.dirX;
      p.mesh.position.y = p.baseY + smooth * 0.65 * p.dirY;
    }

    if (p.kind === "transform") {
      const slide = ((time * 0.8) % 2) - 1;
      p.mesh.position.z = p.baseZ + slide * 1.2 * p.dirZ;
    }

  crustBands.forEach(b => {
    const d = (b.offset + smooth * 1.2) % 5.5;
    b.mesh.position.x = b.side * (0.25 + d);
    b.mesh.scale.x = 1 + Math.max(0, 0.5 - d) * 1.5;
  });

  magmaObjects.forEach((m, i) => {
    m.visible = showMagma.checked;
    m.scale.y = 1 + Math.sin(time * 4 + i) * 0.08 * magmaPower;
  });

  benioffDots.forEach((dot, i) => {
    dot.visible = showQuakes.checked;
    const pulse = 0.8 + Math.sin(time * 6 + i * 0.8) * 0.35;
    dot.scale.setScalar(pulse);
  });

  arrows.forEach(a => {
    a.visible = showArrows.checked;
  });

  if (showQuakes.checked && Math.random() < Number(quakeSlider.value) / 6000) {
    if (boundaryType.value === "convergent") {
      const n = Math.random();
      addQuake(-0.4 + n * 2.6, 0.05 - n * 1.3, -2.5 + Math.random() * 5);
    }

    if (boundaryType.value === "transform") {
      addQuake(0, 0.7, -2.8 + Math.random() * 5.6);
    }

    if (boundaryType.value === "divergent") {
      addQuake((Math.random() - 0.5) * 1.2, 0.65, -2.6 + Math.random() * 5.2);
    }
  }

  quakes.forEach(q => {
    q.life -= 0.025;
    q.mesh.scale.setScalar(1 + (1 - q.life) * 1.4);
    q.mesh.material.opacity = q.life;
  });

  quakes = quakes.filter(q => {
    if (q.life <= 0) {
      mainGroup.remove(q.mesh);
      q.mesh.geometry.dispose();
      return false;
    }
    return true;
  });

  controls.update();
  updateLabels();
  renderer.render(scene, camera);
}

boundaryType.addEventListener("change", rebuild);

document.getElementById("captureBtn").addEventListener("click", () => {
  const link = document.createElement("a");
  link.download = "판의_경계_3D_시뮬레이터.png";
  link.href = renderer.domElement.toDataURL("image/png");
  link.click();
});

rebuild();
animate();