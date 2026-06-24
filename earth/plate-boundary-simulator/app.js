import * as THREE from "https://esm.sh/three@0.160.0";
import { OrbitControls } from "https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js";

const canvas = document.getElementById("simCanvas");

const boundaryType = document.getElementById("boundaryType");
const speedSlider = document.getElementById("speed");
const magmaSlider = document.getElementById("magma");
const quakeSlider = document.getElementById("quake");

const showArrows = document.getElementById("showArrows");
const showQuakes = document.getElementById("showQuakes");
const showMagma = document.getElementById("showMagma");

const infoTitle = document.getElementById("infoTitle");
const infoText = document.getElementById("infoText");
const exampleList = document.getElementById("exampleList");
const mapMarkers = document.getElementById("mapMarkers");

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

camera.position.set(9, 7, 14);
camera.lookAt(0, 0, 0);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0, 0);

controls.enableZoom = false;
controls.enablePan = false;

const light = new THREE.DirectionalLight(0xffffff, 2.4);
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
    opacity: 0.58
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
  volcano: new THREE.MeshStandardMaterial({
    color: 0x5a351f,
    roughness: 0.95
  }),
  magma: new THREE.MeshStandardMaterial({
    color: 0xff2d18,
    emissive: 0xff2200,
    emissiveIntensity: 2.2
  }),
  magmaBright: new THREE.MeshStandardMaterial({
    color: 0xfff176,
    emissive: 0xff7a00,
    emissiveIntensity: 2.8
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
let arrows = [];
let plateObjects = [];
let magmaObjects = [];
let quakes = [];
let crustBands = [];
let benioffDots = [];

function clearScene() {
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
  const mesh = new THREE.Mesh(new THREE.ConeGeometry(r, h, 64), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mainGroup.add(mesh);
  return mesh;
}

function addCylinder(x, y, z, r, h, mat) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 64), mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mainGroup.add(mesh);
  return mesh;
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

  for (let i = 0; i < 24; i++) {
    const blob = addCylinder(
      -9 + i * 0.8,
      -0.8,
      -3.9 + Math.random() * 7.8,
      0.16,
      0.06,
      materials.magma
    );

    blob.scale.x = 2.3;
    blob.scale.z = 0.7;
    magmaObjects.push(blob);
  }
}

function makeMagmaColumn(x, z, height = 2.5) {
  const column = addCylinder(x, 0.15, z, 0.22, height, materials.magma);
  column.position.y = -0.6 + height / 2;
  magmaObjects.push(column);

  const glow = addCylinder(x, 0.15, z, 0.34, height * 0.9, materials.magmaBright);
  glow.position.y = -0.65 + height / 2;
  glow.material.transparent = true;
  glow.material.opacity = 0.45;
  magmaObjects.push(glow);

  return { column, glow };
}

function makeVolcano(x, z) {
  const base = addCone(x, 1.0, z, 0.95, 1.75, materials.volcano);
  const side = addCone(x - 0.12, 1.03, z + 0.08, 0.72, 1.45, materials.continent);

  const crater = addCylinder(x, 1.9, z, 0.25, 0.08, materials.dark);
  const lava = addCone(x, 2.12, z, 0.2, 0.58, materials.magmaBright);

  const lavaFlow1 = addBox(x, 1.35, z + 0.36, 0.12, 0.08, 0.75, materials.magma);
  lavaFlow1.rotation.x = 0.6;

  const lavaFlow2 = addBox(x + 0.25, 1.2, z - 0.22, 0.1, 0.07, 0.65, materials.magma);
  lavaFlow2.rotation.x = -0.45;
  lavaFlow2.rotation.z = 0.25;

  magmaObjects.push(lava, lavaFlow1, lavaFlow2);
  return { base, side, crater, lava };
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

  const plume = addCone(0, -0.35, 0, 0.75, 2.7, materials.magmaBright);
  plume.rotation.z = Math.PI;
  magmaObjects.push(plume);

  makeMagmaColumn(0, 0, 2.3);

  for (let i = 0; i < 11; i++) {
    const offset = i * 0.55;

    const leftBand = addBox(
      -0.35 - offset,
      0.34,
      0,
      0.18,
      0.08,
      6.75,
      i % 2 ? materials.oldCrust : materials.youngCrust
    );

    const rightBand = addBox(
      0.35 + offset,
      0.34,
      0,
      0.18,
      0.08,
      6.75,
      i % 2 ? materials.oldCrust : materials.youngCrust
    );

    crustBands.push({ mesh: leftBand, side: -1, offset });
    crustBands.push({ mesh: rightBand, side: 1, offset });
  }

  addArrow(new THREE.Vector3(-0.8, 1.45, 0), new THREE.Vector3(-3.4, 1.45, 0));
  addArrow(new THREE.Vector3(0.8, 1.45, 0), new THREE.Vector3(3.4, 1.45, 0));

  infoTitle.textContent = "발산형 경계";
  infoText.textContent = "해령에서 마그마가 상승하고 새로운 해양 지각이 생성되어 양쪽으로 이동한다.";
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
  makeMagmaColumn(3.2, -0.9, 2.7);
  makeMagmaColumn(4.5, 1.2, 2.4);

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

  infoTitle.textContent = "수렴형 경계";
  infoText.textContent = "해양판이 대륙판 아래로 섭입하고, 섭입대 위쪽에서 마그마가 상승하여 화산 활동이 나타난다.";
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

  infoTitle.textContent = "보존형 경계";
  infoText.textContent = "두 판이 서로 어긋나게 이동하며 단층을 따라 지진이 발생한다.";
}

function rebuild() {
  if (boundaryType.value === "divergent") buildDivergent();
  if (boundaryType.value === "convergent") buildConvergent();
  if (boundaryType.value === "transform") buildTransform();

  updateExamples(boundaryType.value);
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
      const slide = ((time * 0.75) % 2) - 1;
      p.mesh.position.z = p.baseZ + slide * 1.2 * p.dirZ;
    }
  });

  crustBands.forEach(b => {
    const d = (b.offset + smooth * 1.2) % 5.5;
    b.mesh.position.x = b.side * (0.25 + d);
    b.mesh.scale.x = 1 + Math.max(0, 0.5 - d) * 1.5;
  });

  magmaObjects.forEach((m, i) => {
    m.visible = showMagma.checked;
    m.scale.y = 1 + Math.sin(time * 4 + i) * 0.1 * magmaPower;
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

function updateExamples(type) {
  const data = {
    divergent: {
      examples: [
        {
          name: "대서양 중앙 해령",
          desc: "해양판-해양판 발산형 경계. 해령이 발달하고 새로운 해양 지각이 생성된다."
        },
        {
          name: "동태평양 해령",
          desc: "해양판-해양판 발산형 경계. 해령과 열곡, 지진, 화산 활동이 나타난다."
        },
        {
          name: "동아프리카 열곡대",
          desc: "대륙판-대륙판 발산형 경계. 대륙이 갈라지며 열곡대가 형성된다."
        }
      ],
      markers: [
        { x: 47, y: 48 },
        { x: 25, y: 62 },
        { x: 57, y: 58 }
      ]
    },

    convergent: {
      examples: [
        {
          name: "페루-칠레 해구",
          desc: "해양판-대륙판 섭입형 경계. 해구, 습곡 산맥, 지진, 화산 활동이 나타난다."
        },
        {
          name: "안데스 산맥",
          desc: "나스카판이 남아메리카판 아래로 섭입하며 형성된 습곡 산맥이다."
        },
        {
          name: "알류산 열도",
          desc: "해양판-해양판 섭입형 경계. 해구와 호상 열도가 발달한다."
        },
        {
          name: "마리아나 해구",
          desc: "해양판-해양판 섭입형 경계. 깊은 해구와 호상 열도가 나타난다."
        },
        {
          name: "히말라야 산맥",
          desc: "대륙판-대륙판 충돌형 경계. 습곡 산맥이 발달하고 지진이 발생한다."
        },
        {
          name: "알프스 산맥",
          desc: "대륙판-대륙판 충돌형 경계. 판의 충돌로 습곡 산맥이 형성되었다."
        }
      ],
      markers: [
        { x: 29, y: 72 },
        { x: 31, y: 73 },
        { x: 75, y: 32 },
        { x: 83, y: 54 },
        { x: 66, y: 47 },
        { x: 53, y: 43 }
      ]
    },

    transform: {
      examples: [
        {
          name: "산안드레아스 단층",
          desc: "보존형 경계. 두 판이 서로 어긋나게 이동하며 변환 단층과 지진이 나타난다."
        }
      ],
      markers: [
        { x: 22, y: 43 }
      ]
    }
  };

  const selected = data[type];

  exampleList.innerHTML = selected.examples.map(e => `
    <div class="example-item">
      <div class="example-name">${e.name}</div>
      <div class="example-desc">${e.desc}</div>
    </div>
  `).join("");

  mapMarkers.innerHTML = selected.markers.map(m => `
    <div class="map-marker" style="left:${m.x}%; top:${m.y}%;"></div>
  `).join("");
}