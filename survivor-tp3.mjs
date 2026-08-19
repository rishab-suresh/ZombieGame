import * as THREE from "https://unpkg.com/three@0.170.0/build/three.module.js";

console.info(
  "%cZombie Survivor%c tp3 — Play (corner bar) · Esc pause · first/third person.",
  "color:#7dd3c0;font-weight:bold",
  "color:inherit;font-weight:normal"
);

const el = {
  wave: document.getElementById("wave"),
  alive: document.getElementById("alive"),
  kills: document.getElementById("kills"),
  healthFill: document.getElementById("healthFill"),
  buffRow: document.getElementById("buffRow"),
  buffTime: document.getElementById("buffTime"),
  rapidBuffRow: document.getElementById("rapidBuffRow"),
  rapidBuffTime: document.getElementById("rapidBuffTime"),
  weaponRow: document.getElementById("weaponRow"),
  weaponName: document.getElementById("weaponName"),
  dayNightRow: document.getElementById("dayNightRow"),
  dayNightLabel: document.getElementById("dayNightLabel"),
  gameOverOverlay: document.getElementById("gameOverOverlay"),
  gameOverStats: document.getElementById("gameOverStats"),
  restartBtn: document.getElementById("restartBtn"),
  launcherBar: document.getElementById("launcherBar"),
  launcherPlay: document.getElementById("launcherPlay"),
  pauseOverlay: document.getElementById("pauseOverlay"),
  pauseResumeBtn: document.getElementById("pauseResumeBtn"),
  pauseDefaultsBtn: document.getElementById("pauseDefaultsBtn"),
  cameraFirst: document.getElementById("cameraFirst"),
  cameraThird: document.getElementById("cameraThird"),
  playerName: document.getElementById("playerName"),
  playerColor: document.getElementById("playerColor"),
  playerSpeed: document.getElementById("playerSpeed"),
  playerSpeedVal: document.getElementById("playerSpeedVal"),
  crosshair: document.getElementById("crosshair"),
  toast: document.getElementById("toast"),
  ammoText: document.getElementById("ammoText"),
  flashText: document.getElementById("flashText"),
  objectiveText: document.getElementById("objectiveText"),
};

const canvas = document.getElementById("gameCanvas");
if (!canvas) {
  throw new Error('Missing #gameCanvas — add <canvas id="gameCanvas"> in index.html');
}

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.88;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050208);

const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 520);
camera.position.set(0, 38, 32);

const fogColor = new THREE.Color(0x020105);
scene.fog = new THREE.FogExp2(fogColor.getHex(), 0.041);

const ambient = new THREE.AmbientLight(0x1a1830, 0.04);
scene.add(ambient);
const hemi = new THREE.HemisphereLight(0x202040, 0x080604, 0.07);
scene.add(hemi);
const moon = new THREE.DirectionalLight(0xc8c0e8, 0.09);
moon.position.set(-38, 72, 28);
moon.castShadow = true;
moon.shadow.mapSize.setScalar(2048);
moon.shadow.camera.near = 5;
moon.shadow.camera.far = 220;
const b = 108;
moon.shadow.camera.left = -b;
moon.shadow.camera.right = b;
moon.shadow.camera.top = b;
moon.shadow.camera.bottom = -b;
scene.add(moon);
const fill = new THREE.DirectionalLight(0x5068a0, 0.025);
fill.position.set(35, 25, -20);
scene.add(fill);
const sick = new THREE.PointLight(0x448866, 0.22, 100);
sick.position.set(0, 14, 0);
scene.add(sick);

const playerLantern = new THREE.PointLight(0xffeedd, 3.35, 44, 1.75);
playerLantern.castShadow = false;
scene.add(playerLantern);

const torchTarget = new THREE.Object3D();
scene.add(torchTarget);

let torchFlameMesh = null;

function terrainHeightAt(x, z) {
  return (
    Math.sin(x * 0.07) * 0.55 +
    Math.cos(z * 0.058) * 0.48 +
    Math.sin(x * 0.13 + z * 0.11) * 0.18 +
    Math.cos(x * 0.025 - z * 0.031) * 0.22
  );
}

const WORLD_LIMIT = 180;
const GATE_LINE_X = -72;
const GATE_PASS_X = GATE_LINE_X + 1.9;
const JAM_PORTAL_POS = { x: -166, z: 30, enterRadius: 3.05 };
const GROUND_HALF = 204;

const groundGeo = new THREE.PlaneGeometry(GROUND_HALF * 2, GROUND_HALF * 2, 96, 96);
groundGeo.rotateX(-Math.PI / 2);
const gPos = groundGeo.attributes.position;
const gCols = [];
const tmpCol = new THREE.Color();
for (let i = 0; i < gPos.count; i++) {
  const x = gPos.getX(i);
  const z = gPos.getZ(i);
  const h = terrainHeightAt(x, z);
  gPos.setY(i, h);
  const n = THREE.MathUtils.clamp((h + 0.35) / 1.35, 0, 1);
  const patch = 0.12 * Math.sin(x * 0.09) * Math.cos(z * 0.088);
  tmpCol.setHSL(0.28 + patch * 0.04 + n * 0.06, 0.38 + n * 0.2, 0.22 + n * 0.18);
  gCols.push(tmpCol.r, tmpCol.g, tmpCol.b);
}
groundGeo.setAttribute("color", new THREE.Float32BufferAttribute(gCols, 3));
groundGeo.computeVertexNormals();
const ground = new THREE.Mesh(
  groundGeo,
  new THREE.MeshStandardMaterial({
    color: 0xffffff,
    vertexColors: true,
    roughness: 0.92,
    metalness: 0.04,
  })
);
ground.receiveShadow = true;
ground.castShadow = false;
scene.add(ground);

const treesGroup = new THREE.Group();
const trunkMat = new THREE.MeshStandardMaterial({
  color: 0x3d2e22,
  roughness: 0.9,
  metalness: 0.02,
});
const foliageMat = new THREE.MeshStandardMaterial({
  color: 0x2d9a55,
  roughness: 0.78,
  metalness: 0.04,
});
/** @type {{ x: number, z: number, r: number }[]} */
const treeColliders = [];
const TREE_SCALE = 2.35;
const TREE_EXTENT = WORLD_LIMIT + 22;
for (let i = 0; i < 210; i++) {
  const x = -TREE_EXTENT + Math.random() * (2 * TREE_EXTENT);
  const z = -TREE_EXTENT + Math.random() * (2 * TREE_EXTENT);
  if (x * x + z * z < 420) continue;
  if (Math.hypot(x - JAM_PORTAL_POS.x, z - JAM_PORTAL_POS.z) < 28) continue;
  if (x > GATE_LINE_X - 4 && x < GATE_LINE_X + 5 && Math.abs(z) < 44) continue;
  const tree = new THREE.Group();
  tree.scale.setScalar(TREE_SCALE);
  const h = 1.15 + Math.random() * 0.55;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.16 + Math.random() * 0.06, 0.2 + Math.random() * 0.05, h, 6),
    trunkMat
  );
  trunk.position.y = h * 0.5;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  tree.add(trunk);
  const lump = 0.62 + Math.random() * 0.18;
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(lump, 0), foliageMat);
  crown.position.y = h + 0.72;
  crown.scale.set(1.25, 0.85 + Math.random() * 0.15, 1.25);
  crown.castShadow = true;
  crown.receiveShadow = true;
  tree.add(crown);
  const crown2 = new THREE.Mesh(new THREE.IcosahedronGeometry(lump * 0.72, 0), foliageMat);
  crown2.position.set(0.18, h + 1.15, 0.1);
  crown2.castShadow = true;
  tree.add(crown2);
  tree.position.set(x, 0, z);
  tree.rotation.y = Math.random() * Math.PI * 2;
  treesGroup.add(tree);
  treeColliders.push({ x, z, r: 1.35 * TREE_SCALE });
}
scene.add(treesGroup);

const bushesGroup = new THREE.Group();
for (let i = 0; i < 340; i++) {
  const x = -TREE_EXTENT + Math.random() * (2 * TREE_EXTENT);
  const z = -TREE_EXTENT + Math.random() * (2 * TREE_EXTENT);
  if (x * x + z * z < 220) continue;
  if (Math.hypot(x - JAM_PORTAL_POS.x, z - JAM_PORTAL_POS.z) < 20) continue;
  if (x > GATE_LINE_X - 4 && x < GATE_LINE_X + 5 && Math.abs(z) < 48) continue;
  const bush = new THREE.Group();
  const bh = terrainHeightAt(x, z);
  const nLumps = 2 + ((i * 17) % 3);
  for (let k = 0; k < nLumps; k++) {
    const lump = new THREE.Mesh(new THREE.IcosahedronGeometry(0.3 + Math.random() * 0.24, 0), foliageMat);
    lump.position.set((Math.random() - 0.5) * 0.55, 0.16 + k * 0.2, (Math.random() - 0.5) * 0.55);
    lump.scale.set(0.85 + Math.random() * 0.55, 0.65 + Math.random() * 0.45, 0.85 + Math.random() * 0.55);
    lump.castShadow = true;
    lump.receiveShadow = true;
    bush.add(lump);
  }
  const twig = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.05, 0.22, 5),
    new THREE.MeshStandardMaterial({ color: 0x2a2218, roughness: 0.9, metalness: 0.02 })
  );
  twig.position.y = 0.1;
  bush.add(twig);
  bush.position.set(x, bh, z);
  bush.rotation.y = Math.random() * Math.PI * 2;
  bush.scale.setScalar(0.58 + Math.random() * 0.62);
  bushesGroup.add(bush);
  treeColliders.push({ x, z, r: 0.52 + Math.random() * 0.38 });
}
scene.add(bushesGroup);

const gateRustMat = new THREE.MeshStandardMaterial({
  color: 0x2a2824,
  roughness: 0.88,
  metalness: 0.42,
});
const gateGroup = new THREE.Group();
gateGroup.position.set(GATE_LINE_X, 0, 0);
const gateDoorMesh = new THREE.Mesh(
  new THREE.BoxGeometry(2.8, 5.2, WORLD_LIMIT * 2.35),
  gateRustMat
);
gateDoorMesh.position.set(0, 2.6, 0);
gateDoorMesh.castShadow = true;
gateDoorMesh.receiveShadow = true;
gateGroup.add(gateDoorMesh);
const gateSign = new THREE.Mesh(
  new THREE.BoxGeometry(2.2, 1.1, 0.12),
  new THREE.MeshStandardMaterial({
    color: 0x1a1512,
    emissive: 0x330808,
    emissiveIntensity: 0.35,
    roughness: 0.75,
    metalness: 0.2,
  })
);
gateSign.position.set(-1.55, 4.1, 0);
gateSign.rotation.y = Math.PI * 0.06;
gateGroup.add(gateSign);
scene.add(gateGroup);

let gateUnlocked = false;

function resetGateVisual() {
  gateUnlocked = false;
  gateDoorMesh.position.y = 2.6;
}

function updateGateAnimation(dt) {
  if (!gateUnlocked) return;
  gateDoorMesh.position.y = THREE.MathUtils.lerp(gateDoorMesh.position.y, -5.5, 1 - Math.exp(-dt * 1.65));
}

const playerGroup = new THREE.Group();
const playerRig = new THREE.Group();
playerGroup.add(playerRig);

const playerLegMat = new THREE.MeshStandardMaterial({
  color: 0x3d4e78,
  roughness: 0.78,
  metalness: 0.08,
});
function addPlayerLeg(side) {
  const hip = new THREE.Group();
  hip.position.set(side * 0.17, 0.54, 0);
  const legMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.072, 0.055, 0.46, 6),
    playerLegMat
  );
  legMesh.position.y = -0.21;
  legMesh.castShadow = true;
  hip.add(legMesh);
  playerRig.add(hip);
  return hip;
}
const playerLegL = addPlayerLeg(-1);
const playerLegR = addPlayerLeg(1);

const playerTorso = new THREE.Group();
playerRig.add(playerTorso);

const body = new THREE.Mesh(
  new THREE.IcosahedronGeometry(0.52, 0),
  new THREE.MeshStandardMaterial({
    color: 0x5a7ec8,
    roughness: 0.62,
    metalness: 0.16,
  })
);
body.scale.set(0.92, 1.35, 0.88);
body.position.y = 0.95;
body.castShadow = true;
playerTorso.add(body);
const muzzle = new THREE.Mesh(
  new THREE.CylinderGeometry(0.065, 0.09, 0.58, 6),
  new THREE.MeshStandardMaterial({ color: 0x3a3028, roughness: 0.55, metalness: 0.45 })
);
muzzle.rotation.z = Math.PI / 2;
muzzle.position.set(0.32, 1.08, 0.48);
muzzle.castShadow = true;
playerTorso.add(muzzle);

const torchHandle = new THREE.Mesh(
  new THREE.BoxGeometry(0.1, 0.48, 0.12),
  new THREE.MeshStandardMaterial({ color: 0x4a3528, roughness: 0.82, metalness: 0.08 })
);
torchHandle.position.set(0.38, 1.0, 0.1);
torchHandle.rotation.set(0.25, 0, -0.35);
torchHandle.castShadow = true;
playerTorso.add(torchHandle);
torchFlameMesh = new THREE.Mesh(
  new THREE.OctahedronGeometry(0.16, 0),
  new THREE.MeshStandardMaterial({
    color: 0xffaa55,
    emissive: 0xff6600,
    emissiveIntensity: 0.85,
    roughness: 0.4,
    metalness: 0.1,
  })
);
torchFlameMesh.position.set(0.48, 1.22, 0.14);
playerTorso.add(torchFlameMesh);

const playerTorchPoint = new THREE.PointLight(0xffccaa, 16, 94, 1.05);
playerTorchPoint.castShadow = false;
playerTorchPoint.position.copy(torchFlameMesh.position);
playerTorso.add(playerTorchPoint);

const playerTorchSpot = new THREE.SpotLight(0xffddbb, 14, 98, 0.58, 0.36, 1);
playerTorchSpot.castShadow = true;
playerTorchSpot.shadow.mapSize.setScalar(1024);
playerTorchSpot.shadow.bias = -0.0002;
playerTorchSpot.position.set(0.5, 1.2, 0.14);
playerTorchSpot.target = torchTarget;
playerTorso.add(playerTorchSpot);

let playerWalkPhase = 0;
let playerWalkAmp = 0;

playerGroup.position.set(0, 0, 0);
scene.add(playerGroup);

let playerMoveSpeed = 11;
let playerDisplayName = "Survivor";
let introCameraActive = false;
let introCameraT = 0;
const INTRO_CAM_SEC = 2.12;

let cameraYaw = 0;
let cameraPitch = THREE.MathUtils.degToRad(24);
const CAM_DIST = 13.5;
const CAM_LOOK_Y = 0.95;
const CAM_EYE_OFFSET_Y = 1.12;
const CAM_PITCH_MIN = 0.18;
const CAM_PITCH_MAX = 1.28;
const CAM_MOUSE_SENS = 0.002;
const CAM_FOV_THIRD = 52;
const CAM_FOV_FIRST = 78;
const FP_EYE_Y = 1.38;
const CAM_PREF_KEY = "zs-survivor-cam";
/** @type {'first' | 'third'} */
let cameraPerson = "third";

const EXTRACT_FUEL_NEEDED = 4;
let extractFuelCollected = 0;

/** @type {{ pistol: { cur: number, max: number }, shotgun: { cur: number, max: number }, smg: { cur: number, max: number } }} */
const ammoState = {
  pistol: { cur: 10, max: 18 },
  shotgun: { cur: 2, max: 10 },
  smg: { cur: 0, max: 48 },
};

let portalMessageT = 0;

function makePortalLabelSprite(lines) {
  const cnv = document.createElement("canvas");
  const ctx = cnv.getContext("2d");
  cnv.width = 640;
  cnv.height = 160;
  ctx.fillStyle = "rgba(0, 24, 28, 0.82)";
  ctx.fillRect(0, 0, cnv.width, cnv.height);
  ctx.strokeStyle = "rgba(100, 255, 220, 0.95)";
  ctx.lineWidth = 3;
  ctx.strokeRect(3, 3, cnv.width - 6, cnv.height - 6);
  ctx.font = "bold 40px ui-sans-serif, system-ui, sans-serif";
  ctx.fillStyle = "#d0fff4";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const midY = cnv.height / 2 - (lines.length > 1 ? 22 : 0);
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], cnv.width / 2, midY + i * 50);
  }
  const tex = new THREE.CanvasTexture(cnv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(12, 3, 1);
  return spr;
}

const jamPortalGroup = new THREE.Group();
{
  const ph = terrainHeightAt(JAM_PORTAL_POS.x, JAM_PORTAL_POS.z);
  jamPortalGroup.position.set(JAM_PORTAL_POS.x, ph + 0.06, JAM_PORTAL_POS.z);
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0x55ffd8,
    emissive: 0x1188aa,
    emissiveIntensity: 1.35,
    metalness: 0.45,
    roughness: 0.32,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(2.05, 0.32, 14, 48), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.castShadow = true;
  jamPortalGroup.add(ring);
  const ringInner = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.14, 10, 36), ringMat.clone());
  ringInner.rotation.x = Math.PI / 2;
  ringInner.material.emissiveIntensity = 1.8;
  jamPortalGroup.add(ringInner);
  const portalLight = new THREE.PointLight(0x88fff0, 2.8, 26, 1.45);
  portalLight.position.y = 0.55;
  jamPortalGroup.add(portalLight);
  const label = makePortalLabelSprite(["Vibe Jam Portal", "Behind the gate"]);
  label.position.y = 4.35;
  jamPortalGroup.add(label);
}
scene.add(jamPortalGroup);
function syncJamPortalWorldHeight() {
  const ph = terrainHeightAt(JAM_PORTAL_POS.x, JAM_PORTAL_POS.z);
  jamPortalGroup.position.set(JAM_PORTAL_POS.x, ph + 0.06, JAM_PORTAL_POS.z);
}

const zombieMat = new THREE.MeshStandardMaterial({
  color: 0x3cb356,
  roughness: 0.82,
  metalness: 0.04,
  emissive: 0x0d2814,
  emissiveIntensity: 0.12,
});
const bossZombieMat = new THREE.MeshStandardMaterial({
  color: 0x1a5030,
  roughness: 0.78,
  metalness: 0.08,
  emissive: 0x020a06,
  emissiveIntensity: 0.22,
});
const zombieEyes = new THREE.MeshBasicMaterial({
  color: 0xff2424,
});

/** @type {{ mesh: THREE.Group, hp: number, speed: number, touchCd: number, isBoss: boolean, hitRadius: number, hitY: number, dmgPlayer: number }[]} */
let zombies = [];
/** @type {{ mesh: THREE.Mesh, vel: THREE.Vector3, t: number, damage: number }[]} */
let bullets = [];

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const aimHit = new THREE.Vector3();
const tmpV = new THREE.Vector3();
const shootDir = new THREE.Vector3();
const muzzleWorld = new THREE.Vector3();
const pelletDir = new THREE.Vector3();
const camDir = new THREE.Vector3();
const menuCamOff = new THREE.Vector3();
const introCamFrom = new THREE.Vector3();
const introCamTo = new THREE.Vector3();
const introLookFrom = new THREE.Vector3();
const introLookTo = new THREE.Vector3();
const introLookCur = new THREE.Vector3();
const thirdCamPos = new THREE.Vector3();
const camLookTmp = new THREE.Vector3();
const camMoveFwd = new THREE.Vector3();
const camMoveRight = new THREE.Vector3();
const camWorldUp = new THREE.Vector3(0, 1, 0);

const AUTO_AIM_SEC_PER_PICKUP = 10;
const AUTO_AIM_MAX_STACK = 22;
const AUTO_AIM_RANGE = 48;
const BASE_FIRE_CD = 0.14;
const RAPID_FIRE_CD = 0.062;
const RAPID_FIRE_MULT = 0.58;
const RAPID_FIRE_SEC_PER_PICKUP = 10;
const RAPID_FIRE_MAX_STACK = 22;
const MAX_BLOOD_DECALS = 72;
const PICKUP_PICK_RADIUS = 1.65;
const MED_KIT_HEAL = 38;
const FLASH_BAT_MAX = 120; // seconds
const FLASH_BAT_PICKUP = 45; // seconds
const FLASH_DRAIN_PER_SEC = 1.0;
const MELEE_RANGE = 2.25;
const MELEE_CD_SEC = 0.38;

let gameTime = 0;
let nightBlend = 0;

const BOSS_WAVE_INTERVAL = 4;
const BOSS_WAVE_FIRST = 3;

/** @typedef {'pistol' | 'shotgun' | 'smg'} WeaponId */
/** @typedef {'autoAim' | 'rapidFire' | 'weaponPistol' | 'weaponShotgun' | 'weaponSmg' | 'medKit' | 'fuelCell' | 'ammoPistol' | 'ammoShotgun' | 'ammoSmg' | 'gateKey' | 'battery'} PickupKind */
/** @type {WeaponId} */
let currentWeapon = "pistol";

const WEAPON = {
  pistol: { label: "Pistol", cd: 0.14, rapidOk: true },
  shotgun: { label: "Shotgun", cd: 0.52, rapidOk: true },
  smg: { label: "SMG", cd: 0.068, rapidOk: false },
};

let playing = false;
let paused = false;
let wave = 1;
let kills = 0;
let playerHp = 100;
let spawnQueue = 0;
let spawnDelay = 0;
let waveClearTimer = 0;
let fireCd = 0;
let flickerT = 0;
let autoAimTime = 0;
let rapidFireTime = 0;
let ambientPickupTimer = 0;
let flashlightOn = true;
let flashlightBattery = FLASH_BAT_MAX * 0.72;
let meleeCd = 0;
/** @type {{ mesh: THREE.Group, bobPhase: number, kind: PickupKind }[]} */
let pickups = [];
/** @type {{ group: THREE.Group, t: number, flare: THREE.Mesh, flashLight: THREE.PointLight }[]} */
let muzzleFlashes = [];
/** @type {{ mesh: THREE.Mesh, age: number }[]} */
let bloodDecals = [];

function isBossWave(w) {
  return w >= BOSS_WAVE_FIRST && (w - BOSS_WAVE_FIRST) % BOSS_WAVE_INTERVAL === 0;
}

function resolveTreeAndBorder(x, z) {
  let nx = THREE.MathUtils.clamp(x, -WORLD_LIMIT, WORLD_LIMIT);
  let nz = THREE.MathUtils.clamp(z, -WORLD_LIMIT, WORLD_LIMIT);
  for (let pass = 0; pass < 4; pass++) {
    for (const t of treeColliders) {
      const dx = nx - t.x;
      const dz = nz - t.z;
      const d2 = dx * dx + dz * dz;
      if (d2 >= t.r * t.r || d2 < 1e-10) continue;
      const d = Math.sqrt(d2);
      const push = t.r - d + 0.08;
      nx += (dx / d) * push;
      nz += (dz / d) * push;
    }
    nx = THREE.MathUtils.clamp(nx, -WORLD_LIMIT, WORLD_LIMIT);
    nz = THREE.MathUtils.clamp(nz, -WORLD_LIMIT, WORLD_LIMIT);
  }
  return { x: nx, z: nz };
}

function getNearestZombie(maxDist) {
  const max2 = maxDist * maxDist;
  const px = playerGroup.position.x;
  const pz = playerGroup.position.z;
  let best = null;
  let bestD2 = max2;
  for (const z of zombies) {
    const dx = z.mesh.position.x - px;
    const dz = z.mesh.position.z - pz;
    const d2 = dx * dx + dz * dz;
    if (d2 < bestD2) {
      bestD2 = d2;
      best = z;
    }
  }
  return best;
}

function spawnMuzzleFlash(intensity = 1) {
  muzzle.getWorldPosition(muzzleWorld);
  const group = new THREE.Group();
  const flare = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 8, 8),
    new THREE.MeshBasicMaterial({
      color: 0xffe8cc,
      transparent: true,
      opacity: 1,
      depthWrite: false,
    })
  );
  group.add(flare);
  const flashLight = new THREE.PointLight(0xffaa55, 2.8 * intensity, 6, 2);
  group.add(flashLight);
  group.position.copy(muzzleWorld);
  scene.add(group);
  muzzleFlashes.push({ group, t: 0.07, flare, flashLight });
}

function updateMuzzleFlashes(dt) {
  for (let i = muzzleFlashes.length - 1; i >= 0; i--) {
    const m = muzzleFlashes[i];
    m.t -= dt;
    const k = THREE.MathUtils.clamp(m.t / 0.07, 0, 1);
    m.flare.material.opacity = k;
    m.flare.scale.setScalar(0.65 + (1 - k) * 1.4);
    m.flashLight.intensity = 2.8 * k;
    if (m.t <= 0) {
      m.flare.geometry.dispose();
      m.flare.material.dispose();
      scene.remove(m.group);
      muzzleFlashes.splice(i, 1);
    }
  }
}

function spawnBloodDecal(x, z) {
  while (bloodDecals.length >= MAX_BLOOD_DECALS) {
    const old = bloodDecals.shift();
    scene.remove(old.mesh);
    old.mesh.material.dispose();
    old.mesh.geometry.dispose();
  }
  const r = 0.38 + Math.random() * 0.62;
  const mesh = new THREE.Mesh(
    new THREE.CircleGeometry(r, 12),
    new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.02, 0.75, 0.12 + Math.random() * 0.06),
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    })
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, 0.045, z);
  mesh.rotation.z = Math.random() * Math.PI * 2;
  mesh.scale.setScalar(0.85 + Math.random() * 0.35);
  scene.add(mesh);
  bloodDecals.push({ mesh, age: 0 });
}

function updateBloodDecals(dt) {
  for (let i = bloodDecals.length - 1; i >= 0; i--) {
    const b = bloodDecals[i];
    b.age += dt;
    if (b.age < 10) {
      b.mesh.material.opacity = 0.88;
    } else {
      b.mesh.material.opacity = Math.max(0, 0.88 - (b.age - 10) * 0.1);
    }
    if (b.age > 20 || b.mesh.material.opacity <= 0.02) {
      scene.remove(b.mesh);
      b.mesh.material.dispose();
      b.mesh.geometry.dispose();
      bloodDecals.splice(i, 1);
    }
  }
}

const pickupMat = new THREE.MeshStandardMaterial({
  color: 0x44c8dd,
  emissive: 0x113340,
  emissiveIntensity: 0.85,
  roughness: 0.35,
  metalness: 0.4,
});
const rapidPickupMat = new THREE.MeshStandardMaterial({
  color: 0xdd8844,
  emissive: 0x331808,
  emissiveIntensity: 0.9,
  roughness: 0.38,
  metalness: 0.42,
});
const shotgunPickupMat = new THREE.MeshStandardMaterial({
  color: 0x8b6f4a,
  emissive: 0x221808,
  emissiveIntensity: 0.55,
  roughness: 0.45,
  metalness: 0.35,
});
const smgPickupMat = new THREE.MeshStandardMaterial({
  color: 0x6a5a9c,
  emissive: 0x181028,
  emissiveIntensity: 0.65,
  roughness: 0.4,
  metalness: 0.42,
});
const pistolPickupMat = new THREE.MeshStandardMaterial({
  color: 0x5a6a78,
  emissive: 0x101820,
  emissiveIntensity: 0.45,
  roughness: 0.5,
  metalness: 0.35,
});
const medKitBodyMat = new THREE.MeshStandardMaterial({
  color: 0xf2f4f8,
  emissive: 0x223344,
  emissiveIntensity: 0.08,
  roughness: 0.45,
  metalness: 0.15,
});
const medKitCrossMat = new THREE.MeshStandardMaterial({
  color: 0xdd2020,
  emissive: 0x550808,
  emissiveIntensity: 0.35,
  roughness: 0.4,
  metalness: 0.1,
});
const fuelCellMat = new THREE.MeshStandardMaterial({
  color: 0x55a0e6,
  emissive: 0x113355,
  emissiveIntensity: 0.9,
  metalness: 0.55,
  roughness: 0.28,
});
const ammoBoxMat = new THREE.MeshStandardMaterial({
  color: 0xc4a060,
  emissive: 0x332010,
  emissiveIntensity: 0.35,
  metalness: 0.25,
  roughness: 0.6,
});

function isClearOfTrees(x, z, margin = 1.35) {
  for (const t of treeColliders) {
    const dx = x - t.x;
    const dz = z - t.z;
    if (dx * dx + dz * dz < (t.r + margin) * (t.r + margin)) return false;
  }
  return true;
}

function pickSpawnPointAwayFrom(px, pz, minR, maxR) {
  for (let attempt = 0; attempt < 48; attempt++) {
    const ang = Math.random() * Math.PI * 2;
    const d = minR + Math.random() * (maxR - minR);
    const x = THREE.MathUtils.clamp(px + Math.cos(ang) * d, -WORLD_LIMIT + 4, WORLD_LIMIT - 4);
    const z = THREE.MathUtils.clamp(pz + Math.sin(ang) * d, -WORLD_LIMIT + 4, WORLD_LIMIT - 4);
    if (Math.hypot(x - JAM_PORTAL_POS.x, z - JAM_PORTAL_POS.z) < 22) continue;
    if (!isClearOfTrees(x, z, 1.4)) continue;
    return { x, z };
  }
  return { x: px + 18, z: pz };
}

function pickFuelSpawnPoint(px, pz, minR, maxR) {
  for (let attempt = 0; attempt < 80; attempt++) {
    const ang = Math.random() * Math.PI * 2;
    const d = minR + Math.random() * (maxR - minR);
    let x = px + Math.cos(ang) * d;
    let z = pz + Math.sin(ang) * d;
    x = THREE.MathUtils.clamp(x, -WORLD_LIMIT + 4, WORLD_LIMIT - 4);
    z = THREE.MathUtils.clamp(z, -WORLD_LIMIT + 4, WORLD_LIMIT - 4);
    if (x > GATE_LINE_X - 12) continue;
    if (Math.hypot(x - JAM_PORTAL_POS.x, z - JAM_PORTAL_POS.z) < 14) continue;
    if (!isClearOfTrees(x, z, 1.45)) continue;
    return { x, z };
  }
  const x = THREE.MathUtils.clamp(GATE_LINE_X - 38 - Math.random() * 62, -WORLD_LIMIT + 6, GATE_LINE_X - 14);
  const z = THREE.MathUtils.clamp((Math.random() - 0.5) * 170, -WORLD_LIMIT + 8, WORLD_LIMIT - 8);
  return { x, z };
}

function computeThirdPersonCameraPosition(targetPos, lookTarget) {
  const flat = Math.cos(cameraPitch) * CAM_DIST;
  const h = Math.sin(cameraPitch) * CAM_DIST;
  targetPos.set(
    playerGroup.position.x - Math.sin(cameraYaw) * flat,
    playerGroup.position.y + CAM_EYE_OFFSET_Y + h,
    playerGroup.position.z - Math.cos(cameraYaw) * flat
  );
  lookTarget.set(playerGroup.position.x, playerGroup.position.y + CAM_LOOK_Y, playerGroup.position.z);
}

function updateCrosshairVisible() {
  if (!el.crosshair) return;
  const on =
    playing && !introCameraActive && !paused && document.pointerLockElement === canvas;
  el.crosshair.classList.toggle("visible", !!on);
}

function showToast(msg, dur = 2.2) {
  if (el.toast) {
    el.toast.textContent = msg;
    el.toast.classList.add("visible");
  }
  portalMessageT = dur;
}

function toggleFlashlight() {
  if (flashlightBattery <= 0.01) {
    flashlightOn = false;
    showToast("Battery dead", 1.2);
    return;
  }
  flashlightOn = !flashlightOn;
}

function initFlashlightForRun() {
  flashlightOn = true;
  flashlightBattery = FLASH_BAT_MAX * 0.72;
}

function updateFlashlight(dt) {
  if (!playing || paused) return;
  if (!flashlightOn) return;
  flashlightBattery = Math.max(0, flashlightBattery - dt * FLASH_DRAIN_PER_SEC);
  if (flashlightBattery <= 0.001) {
    flashlightOn = false;
    showToast("Battery dead", 1.4);
  }
}

function initAmmoForRun() {
  ammoState.pistol.cur = 10;
  ammoState.pistol.max = 18;
  ammoState.shotgun.cur = 2;
  ammoState.shotgun.max = 10;
  ammoState.smg.cur = 0;
  ammoState.smg.max = 48;
}

function currentAmmoString() {
  const a = ammoState[currentWeapon];
  return `${a.cur} / ${a.max}`;
}

function tryConsumeAmmoForCurrentWeapon() {
  const a = ammoState[currentWeapon];
  if (currentWeapon === "shotgun") {
    if (a.cur < 1) return false;
    a.cur -= 1;
    return true;
  }
  if (a.cur < 1) return false;
  a.cur -= 1;
  return true;
}

function addAmmo(weapon, amount) {
  const a = ammoState[weapon];
  a.cur = Math.min(a.max, a.cur + amount);
}

function removeFuelPickupsFromScene() {
  for (let i = pickups.length - 1; i >= 0; i--) {
    if (pickups[i].kind === "fuelCell") {
      scene.remove(pickups[i].mesh);
      pickups.splice(i, 1);
    }
  }
}

function spawnObjectiveFuelCells() {
  removeFuelPickupsFromScene();
  const px = playerGroup.position.x;
  const pz = playerGroup.position.z;
  for (let n = 0; n < EXTRACT_FUEL_NEEDED; n++) {
    const { x, z } = pickFuelSpawnPoint(px, pz, 40 + n * 16, 95 + n * 22);
    spawnPickup("fuelCell", x, z, 0);
  }
}

function spawnGateKeyPickup() {
  if (pickups.some((p) => p.kind === "gateKey")) return;
  const kx = THREE.MathUtils.clamp(GATE_LINE_X + 26 + Math.random() * 40, GATE_LINE_X + 14, WORLD_LIMIT - 12);
  const kz = THREE.MathUtils.clamp((Math.random() - 0.5) * 140, -WORLD_LIMIT + 10, WORLD_LIMIT - 10);
  spawnPickup("gateKey", kx, kz, 0);
}

function currentFireCd() {
  const w = WEAPON[currentWeapon];
  let cd = w.cd;
  if (w.rapidOk && rapidFireTime > 0) {
    cd *= RAPID_FIRE_MULT;
  }
  return cd;
}

function weaponHudLabel() {
  return WEAPON[currentWeapon].label;
}

/** @param {PickupKind} kind */
function spawnPickup(kind, nearX, nearZ, spread = 14) {
  if (pickups.length >= 14) return;
  let x;
  let z;
  if (spread <= 0) {
    x = THREE.MathUtils.clamp(nearX, -WORLD_LIMIT + 2, WORLD_LIMIT - 2);
    z = THREE.MathUtils.clamp(nearZ, -WORLD_LIMIT + 2, WORLD_LIMIT - 2);
  } else {
    const ang = Math.random() * Math.PI * 2;
    const d = 4 + Math.random() * spread;
    x = THREE.MathUtils.clamp(nearX + Math.cos(ang) * d, -WORLD_LIMIT + 2, WORLD_LIMIT - 2);
    z = THREE.MathUtils.clamp(nearZ + Math.sin(ang) * d, -WORLD_LIMIT + 2, WORLD_LIMIT - 2);
  }
  const mesh = new THREE.Group();

  if (kind === "autoAim") {
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.55, 0), pickupMat);
    core.castShadow = true;
    mesh.add(core);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.75, 0.06, 6, 16),
      new THREE.MeshBasicMaterial({ color: 0x88eeff, transparent: true, opacity: 0.5, depthWrite: false })
    );
    ring.rotation.x = Math.PI / 2;
    mesh.add(ring);
  } else if (kind === "rapidFire") {
    const core = new THREE.Mesh(new THREE.TetrahedronGeometry(0.62, 0), rapidPickupMat);
    core.castShadow = true;
    mesh.add(core);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.78, 0.07, 6, 18),
      new THREE.MeshBasicMaterial({ color: 0xffaa66, transparent: true, opacity: 0.55, depthWrite: false })
    );
    ring.rotation.x = Math.PI / 2;
    mesh.add(ring);
  } else if (kind === "weaponShotgun") {
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.55), shotgunPickupMat);
    stock.castShadow = true;
    mesh.add(stock);
    const barrels = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 0.65, 8), shotgunPickupMat);
    barrels.rotation.z = Math.PI / 2;
    barrels.position.set(0.45, 0, 0);
    barrels.castShadow = true;
    mesh.add(barrels);
  } else if (kind === "weaponSmg") {
    const core = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.28, 0.22), smgPickupMat);
    core.castShadow = true;
    mesh.add(core);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.35, 0.12), smgPickupMat);
    mag.position.set(0.1, -0.25, 0);
    mesh.add(mag);
  } else if (kind === "medKit") {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.28, 0.48), medKitBodyMat);
    box.castShadow = true;
    mesh.add(box);
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.31, 0.12), medKitCrossMat);
    mesh.add(c1);
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.12), medKitCrossMat);
    c2.position.y = 0.02;
    mesh.add(c2);
  } else if (kind === "fuelCell") {
    const can = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.5, 10), fuelCellMat);
    can.castShadow = true;
    mesh.add(can);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), fuelCellMat);
    cap.position.y = 0.32;
    mesh.add(cap);
    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(0.45, 0.04, 6, 20),
      new THREE.MeshBasicMaterial({ color: 0x66ccff, transparent: true, opacity: 0.45, depthWrite: false })
    );
    glow.rotation.x = Math.PI / 2;
    mesh.add(glow);
  } else if (kind === "ammoPistol") {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.28, 0.32), ammoBoxMat);
    box.castShadow = true;
    mesh.add(box);
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.48, 0.06, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x2244aa, emissive: 0x112244, emissiveIntensity: 0.4 })
    );
    strip.position.y = 0.02;
    mesh.add(strip);
  } else if (kind === "ammoShotgun") {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.32, 0.34), ammoBoxMat);
    box.castShadow = true;
    mesh.add(box);
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.52, 0.07, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x8b5a2a, emissive: 0x332210, emissiveIntensity: 0.35 })
    );
    strip.position.y = 0.02;
    mesh.add(strip);
  } else if (kind === "ammoSmg") {
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.28, 0.36), ammoBoxMat);
    box.castShadow = true;
    mesh.add(box);
    const strip = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.06, 0.1),
      new THREE.MeshStandardMaterial({ color: 0x5544aa, emissive: 0x221044, emissiveIntensity: 0.45 })
    );
    strip.position.y = 0.02;
    mesh.add(strip);
  } else if (kind === "gateKey") {
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.62, 6), ammoBoxMat);
    shaft.rotation.z = Math.PI / 2;
    shaft.castShadow = true;
    mesh.add(shaft);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.34, 0.08), ammoBoxMat);
    head.position.set(0.32, 0, 0);
    head.castShadow = true;
    mesh.add(head);
    const tooth = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.12, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xc07020, emissive: 0x401808, emissiveIntensity: 0.5 })
    );
    tooth.position.set(-0.34, -0.04, 0);
    mesh.add(tooth);
    const glint = new THREE.Mesh(
      new THREE.TorusGeometry(0.52, 0.028, 6, 20),
      new THREE.MeshBasicMaterial({ color: 0xff4444, transparent: true, opacity: 0.35, depthWrite: false })
    );
    glint.rotation.x = Math.PI / 2;
    mesh.add(glint);
  } else if (kind === "battery") {
    const cell = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 0.42, 12), fuelCellMat);
    cell.castShadow = true;
    mesh.add(cell);
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 10), ammoBoxMat);
    tip.position.y = 0.26;
    mesh.add(tip);
    const glow = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.03, 6, 18),
      new THREE.MeshBasicMaterial({ color: 0xffe066, transparent: true, opacity: 0.5, depthWrite: false })
    );
    glow.rotation.x = Math.PI / 2;
    mesh.add(glow);
  } else {
    const core = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 0.5, 10), pistolPickupMat);
    core.rotation.z = Math.PI / 2;
    core.castShadow = true;
    mesh.add(core);
  }

  const yBase = terrainHeightAt(x, z) + 0.55;
  mesh.position.set(x, yBase, z);
  scene.add(mesh);
  pickups.push({ mesh, bobPhase: Math.random() * Math.PI * 2, kind });
}

function randomPickupKind() {
  const r = Math.random();
  if (r < 0.09) return "ammoPistol";
  if (r < 0.14) return "ammoShotgun";
  if (r < 0.18) return "ammoSmg";
  if (r < 0.26) return "battery";
  if (r < 0.34) return "medKit";
  if (r < 0.40) return "autoAim";
  if (r < 0.46) return "rapidFire";
  if (r < 0.50) return "weaponShotgun";
  if (r < 0.54) return "weaponSmg";
  return "weaponPistol";
}

function maybeDropPickupFromKill(zx, zz) {
  if (Math.random() > 0.09) return;
  spawnPickup(randomPickupKind(), zx, zz, 10);
}

function updatePickups(dt) {
  for (let i = pickups.length - 1; i >= 0; i--) {
    const p = pickups[i];
    p.bobPhase += dt * 2.8;
    const groundY = terrainHeightAt(p.mesh.position.x, p.mesh.position.z);
    p.mesh.position.y = groundY + 0.52 + Math.sin(p.bobPhase) * 0.14;
    p.mesh.rotation.y += dt * 1.6;

    const dx = p.mesh.position.x - playerGroup.position.x;
    const dz = p.mesh.position.z - playerGroup.position.z;
    if (dx * dx + dz * dz < PICKUP_PICK_RADIUS * PICKUP_PICK_RADIUS) {
      if (p.kind === "autoAim") {
        autoAimTime = Math.min(autoAimTime + AUTO_AIM_SEC_PER_PICKUP, AUTO_AIM_MAX_STACK);
      } else if (p.kind === "rapidFire") {
        rapidFireTime = Math.min(rapidFireTime + RAPID_FIRE_SEC_PER_PICKUP, RAPID_FIRE_MAX_STACK);
      } else if (p.kind === "weaponShotgun") {
        currentWeapon = "shotgun";
      } else if (p.kind === "weaponSmg") {
        currentWeapon = "smg";
      } else if (p.kind === "medKit") {
        playerHp = Math.min(100, playerHp + MED_KIT_HEAL);
      } else if (p.kind === "gateKey") {
        gateUnlocked = true;
        showToast("West gate unlocked — the compound is open", 2.5);
      } else if (p.kind === "fuelCell") {
        extractFuelCollected = Math.min(EXTRACT_FUEL_NEEDED, extractFuelCollected + 1);
        showToast(`Fuel ${extractFuelCollected}/${EXTRACT_FUEL_NEEDED}`, 1.35);
      } else if (p.kind === "ammoPistol") {
        addAmmo("pistol", 6);
      } else if (p.kind === "ammoShotgun") {
        addAmmo("shotgun", 2);
      } else if (p.kind === "ammoSmg") {
        addAmmo("smg", 8);
      } else if (p.kind === "battery") {
        flashlightBattery = Math.min(FLASH_BAT_MAX, flashlightBattery + FLASH_BAT_PICKUP);
        if (!flashlightOn && flashlightBattery > 0.05) flashlightOn = true;
        showToast(`Battery ${Math.round((flashlightBattery / FLASH_BAT_MAX) * 100)}%`, 1.25);
      } else {
        currentWeapon = "pistol";
      }
      scene.remove(p.mesh);
      pickups.splice(i, 1);
    }
  }
}

const barrelsGroup = new THREE.Group();
/** @type {{ mesh: THREE.Mesh, band: THREE.Mesh, x: number, z: number, collider: { x: number, z: number, r: number }, broken: boolean }[]} */
const barrels = [];
const barrelMat = new THREE.MeshStandardMaterial({ color: 0x3a2c22, roughness: 0.85, metalness: 0.06 });
const barrelBandMat = new THREE.MeshStandardMaterial({
  color: 0x222428,
  roughness: 0.6,
  metalness: 0.55,
  emissive: 0x080808,
  emissiveIntensity: 0.15,
});
for (let i = 0; i < 28; i++) {
  const x = THREE.MathUtils.clamp((Math.random() - 0.5) * (WORLD_LIMIT * 1.75), -WORLD_LIMIT + 10, WORLD_LIMIT - 10);
  const z = THREE.MathUtils.clamp((Math.random() - 0.5) * (WORLD_LIMIT * 1.75), -WORLD_LIMIT + 10, WORLD_LIMIT - 10);
  if (x * x + z * z < 520) continue;
  if (Math.hypot(x - JAM_PORTAL_POS.x, z - JAM_PORTAL_POS.z) < 26) continue;
  if (x > GATE_LINE_X - 4 && x < GATE_LINE_X + 6 && Math.abs(z) < 58) continue;
  if (!isClearOfTrees(x, z, 2.15)) continue;
  const y = terrainHeightAt(x, z);
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 1.05, 14), barrelMat);
  m.position.set(x, y + 0.52, z);
  m.castShadow = true;
  m.receiveShadow = true;
  const band = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 6, 20), barrelBandMat);
  band.rotation.x = Math.PI / 2;
  band.position.copy(m.position);
  band.position.y += 0.12;
  barrelsGroup.add(m);
  barrelsGroup.add(band);
  const c = { x, z, r: 1.35 };
  treeColliders.push(c);
  barrels.push({ mesh: m, band, x, z, collider: c, broken: false });
}
scene.add(barrelsGroup);

function maybeBarrelDropKind() {
  const r = Math.random();
  if (r < 0.34) return "battery";
  if (r < 0.58) return "ammoPistol";
  if (r < 0.70) return "ammoShotgun";
  if (r < 0.82) return "ammoSmg";
  return "medKit";
}

function tryMelee() {
  if (!playing || introCameraActive || paused) return;
  if (meleeCd > 0) return;
  meleeCd = MELEE_CD_SEC;
  const px = playerGroup.position.x;
  const pz = playerGroup.position.z;
  for (const b of barrels) {
    if (b.broken) continue;
    const dx = b.x - px;
    const dz = b.z - pz;
    if (dx * dx + dz * dz > MELEE_RANGE * MELEE_RANGE) continue;
    b.broken = true;
    b.collider.r = 0;
    scene.remove(b.mesh);
    scene.remove(b.band);
    spawnPickup(maybeBarrelDropKind(), b.x, b.z, 0);
    spawnBloodDecal(b.x, b.z);
    return;
  }
}

function buildZombieGroup(isBoss) {
  let mat;
  if (isBoss) {
    mat = bossZombieMat;
  } else {
    mat = zombieMat.clone();
    const hue = 0.2 + Math.random() * 0.16;
    const sat = 0.32 + Math.random() * 0.38;
    const light = 0.24 + Math.random() * 0.2;
    mat.color.setHSL(hue, sat, light);
    mat.emissive.setHSL(hue, 0.45, 0.04 + Math.random() * 0.08);
  }
  const g = new THREE.Group();
  if (isBoss) {
    g.scale.setScalar(1.55);
  }

  const legGeom = new THREE.CylinderGeometry(0.088, 0.07, 0.46, 5);
  const legL = new THREE.Group();
  legL.position.set(-0.15, 0.5, 0);
  const legLm = new THREE.Mesh(legGeom, mat);
  legLm.position.y = -0.21;
  legLm.castShadow = true;
  legL.add(legLm);
  g.add(legL);
  const legR = new THREE.Group();
  legR.position.set(0.15, 0.5, 0);
  const legRm = new THREE.Mesh(legGeom.clone(), mat);
  legRm.position.y = -0.21;
  legRm.castShadow = true;
  legR.add(legRm);
  g.add(legR);

  const torso = new THREE.Group();
  g.add(torso);

  const zBody = new THREE.Mesh(new THREE.DodecahedronGeometry(0.44, 0), mat);
  zBody.scale.set(1.05, 1.35, 0.95);
  zBody.position.y = 0.82;
  zBody.castShadow = true;
  torso.add(zBody);
  const head = new THREE.Mesh(new THREE.TetrahedronGeometry(0.42, 0), mat);
  head.position.y = 1.48;
  head.rotation.z = Math.PI;
  head.scale.set(1.05, 1.2, 1.05);
  head.castShadow = true;
  torso.add(head);
  const le = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), zombieEyes);
  le.position.set(-0.12, 1.5, 0.34);
  torso.add(le);
  const re = new THREE.Mesh(new THREE.OctahedronGeometry(0.07, 0), zombieEyes);
  re.position.set(0.12, 1.5, 0.34);
  torso.add(re);
  if (isBoss) {
    const horn = new THREE.Mesh(new THREE.TetrahedronGeometry(0.18, 0), mat);
    horn.position.set(0, 1.95, 0);
    horn.rotation.set(-0.3, 0, 0.2);
    horn.castShadow = true;
    torso.add(horn);
  }

  g.userData.rig = { legL, legR, torso };
  g.userData.walkPhase = Math.random() * Math.PI * 2;
  g.userData.walkJitter = Math.random() * Math.PI * 2;
  return g;
}

function spawnZombie() {
  const angle = Math.random() * Math.PI * 2;
  const dist = 28 + Math.random() * 18;
  const x = THREE.MathUtils.clamp(
    playerGroup.position.x + Math.cos(angle) * dist,
    -WORLD_LIMIT + 2,
    WORLD_LIMIT - 2
  );
  const z = THREE.MathUtils.clamp(
    playerGroup.position.z + Math.sin(angle) * dist,
    -WORLD_LIMIT + 2,
    WORLD_LIMIT - 2
  );

  const g = buildZombieGroup(false);
  g.position.set(x, 0, z);
  const tilt = (Math.random() - 0.5) * 0.12;
  g.rotation.z = tilt;
  scene.add(g);

  const hp = 6 + Math.floor(wave * 1.75) + Math.floor(wave / 2);
  const speed = 2.55 + wave * 0.18 + Math.random() * 0.35;
  zombies.push({
    mesh: g,
    hp,
    speed,
    touchCd: 0,
    isBoss: false,
    hitRadius: 0.75,
    hitY: 1.05,
    dmgPlayer: 10,
  });
}

function spawnBoss() {
  const angle = Math.random() * Math.PI * 2;
  const dist = 32 + Math.random() * 12;
  const x = THREE.MathUtils.clamp(
    playerGroup.position.x + Math.cos(angle) * dist,
    -WORLD_LIMIT + 2,
    WORLD_LIMIT - 2
  );
  const z = THREE.MathUtils.clamp(
    playerGroup.position.z + Math.sin(angle) * dist,
    -WORLD_LIMIT + 2,
    WORLD_LIMIT - 2
  );
  const g = buildZombieGroup(true);
  g.position.set(x, 0, z);
  scene.add(g);
  const hp = 52 + wave * 14;
  const speed = 2.0 + wave * 0.1;
  zombies.push({
    mesh: g,
    hp,
    speed,
    touchCd: 0,
    isBoss: true,
    hitRadius: 1.12,
    hitY: 1.12,
    dmgPlayer: 18,
  });
}

function zombiesForWave(w) {
  return 1 + Math.floor(w * 0.72);
}

function applyCharacterFromForm() {
  if (!el.playerColor || !body.material) return;
  playerDisplayName = el.playerName?.value?.trim() || "Survivor";
  playerMoveSpeed = parseFloat(el.playerSpeed?.value);
  if (!Number.isFinite(playerMoveSpeed)) playerMoveSpeed = 11;
  playerMoveSpeed = THREE.MathUtils.clamp(playerMoveSpeed, 6, 18);
  body.material.color.set(el.playerColor.value);
  const legTone = new THREE.Color(el.playerColor.value).multiplyScalar(0.52);
  legTone.lerp(new THREE.Color(0x1a2030), 0.28);
  playerLegMat.color.copy(legTone);
}

function readCameraPersonPref() {
  try {
    return localStorage.getItem(CAM_PREF_KEY) === "first" ? "first" : "third";
  } catch {
    return "third";
  }
}

function writeCameraPersonPref() {
  try {
    localStorage.setItem(CAM_PREF_KEY, cameraPerson);
  } catch {
    /* ignore */
  }
}

function syncCameraFovAndRig() {
  const fp = cameraPerson === "first";
  camera.fov = fp ? CAM_FOV_FIRST : CAM_FOV_THIRD;
  camera.updateProjectionMatrix();
  // Keep the rig enabled so the flashlight lights still render in FPV.
  // Instead hide only the player meshes that would block the camera.
  playerRig.visible = true;
  body.visible = !fp;
  playerLegL.visible = !fp;
  playerLegR.visible = !fp;
}

function syncPauseRadiosFromGame() {
  if (!el.cameraFirst || !el.cameraThird) return;
  if (cameraPerson === "first") {
    el.cameraFirst.checked = true;
  } else {
    el.cameraThird.checked = true;
  }
}

function setPaused(on) {
  paused = !!on;
  if (el.pauseOverlay) {
    el.pauseOverlay.classList.toggle("visible", paused);
    el.pauseOverlay.setAttribute("aria-hidden", paused ? "false" : "true");
  }
  if (paused) {
    document.exitPointerLock?.();
    syncPauseRadiosFromGame();
  }
  updateCrosshairVisible();
}

function applyMenuCamera() {
  const p = playerGroup.position;
  camera.fov = 46;
  camera.updateProjectionMatrix();
  playerRig.visible = true;
  menuCamOff.set(0.95, 1.05, 1.55);
  menuCamOff.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerGroup.rotation.y);
  camera.position.set(p.x + menuCamOff.x, p.y + menuCamOff.y, p.z + menuCamOff.z);
  camera.lookAt(p.x, p.y + 0.92, p.z);
}

function snapGameplayCamera() {
  syncCameraFovAndRig();
  const p = playerGroup.position;
  if (cameraPerson === "first") {
    camera.position.set(p.x, p.y + FP_EYE_Y, p.z);
    camera.up.set(0, 1, 0);
    camera.rotation.order = "YXZ";
    camera.rotation.y = cameraYaw;
    camera.rotation.x = cameraPitch;
    camera.rotation.z = 0;
  } else {
    computeThirdPersonCameraPosition(thirdCamPos, camLookTmp);
    camera.position.copy(thirdCamPos);
    camera.lookAt(camLookTmp);
  }
}

function menuDefaults() {
  if (el.playerName) el.playerName.value = "Survivor";
  if (el.playerColor) el.playerColor.value = "#5a7ec8";
  if (el.playerSpeed) el.playerSpeed.value = "11";
  if (el.playerSpeedVal) el.playerSpeedVal.textContent = "11";
  applyCharacterFromForm();
}

function redirectToJamPortal() {
  const name = el.playerName?.value?.trim() || playerDisplayName || "Survivor";
  const hexRaw = el.playerColor?.value || "#" + body.material.color.getHexString();
  const colorParam = hexRaw.replace(/^#/, "");
  const refUrl = window.location.href.split("#")[0];
  const url = new URL("https://jam.pieter.com/portal/2026");
  url.searchParams.set("username", name);
  url.searchParams.set("color", colorParam);
  url.searchParams.set("speed", String(playerMoveSpeed));
  url.searchParams.set("ref", refUrl);
  window.location.href = url.toString();
}

function checkJamPortalEntry() {
  const dx = playerGroup.position.x - JAM_PORTAL_POS.x;
  const dz = playerGroup.position.z - JAM_PORTAL_POS.z;
  if (dx * dx + dz * dz < JAM_PORTAL_POS.enterRadius * JAM_PORTAL_POS.enterRadius) {
    if (!gateUnlocked) {
      showToast("Find the gate key — the portal sector is locked off", 2.5);
      return;
    }
    if (extractFuelCollected < EXTRACT_FUEL_NEEDED) {
      const need = EXTRACT_FUEL_NEEDED - extractFuelCollected;
      showToast(`Collect ${need} more fuel cell(s) before extracting`, 2.6);
      return;
    }
    redirectToJamPortal();
  }
}

function parseJamInboundParams() {
  const q = new URLSearchParams(window.location.search);
  const u = q.get("username");
  const col = q.get("color");
  const sp = q.get("speed");
  if (u && el.playerName) el.playerName.value = u.slice(0, 32);
  if (sp && el.playerSpeed) {
    const n = parseFloat(sp);
    if (Number.isFinite(n)) {
      const c = THREE.MathUtils.clamp(n, 6, 18);
      el.playerSpeed.value = String(c);
      if (el.playerSpeedVal) el.playerSpeedVal.textContent = String(c);
      playerMoveSpeed = c;
    }
  }
  if (!col || !el.playerColor) return;
  const t = col.trim();
  if (t.startsWith("#")) {
    el.playerColor.value = t.slice(0, 7);
    return;
  }
  if (/^[0-9a-fA-F]{6}$/.test(t)) {
    el.playerColor.value = `#${t}`;
    return;
  }
  const probe = document.createElement("canvas").getContext("2d");
  if (!probe) return;
  probe.fillStyle = t;
  probe.fillRect(0, 0, 1, 1);
  const px = probe.getImageData(0, 0, 1, 1).data;
  const tc = new THREE.Color(px[0] / 255, px[1] / 255, px[2] / 255);
  el.playerColor.value = `#${tc.getHexString()}`;
}

function beginWave() {
  spawnQueue = zombiesForWave(wave);
  if (isBossWave(wave)) {
    spawnQueue = Math.max(2, spawnQueue - 2);
    spawnBoss();
  }
  spawnDelay = 0.15;
  waveClearTimer = 0;
  el.wave.textContent = String(wave);
}

function resetGame(quickRestart = false) {
  resetGateVisual();
  for (const z of zombies) scene.remove(z.mesh);
  zombies = [];
  for (const b of bullets) scene.remove(b.mesh);
  bullets = [];
  for (const p of pickups) scene.remove(p.mesh);
  pickups = [];
  for (const m of muzzleFlashes) scene.remove(m.group);
  muzzleFlashes = [];
  for (const bd of bloodDecals) {
    scene.remove(bd.mesh);
    bd.mesh.material.dispose();
    bd.mesh.geometry.dispose();
  }
  bloodDecals = [];
  playerGroup.position.set(0, 0, 0);
  playerGroup.rotation.y = 0;
  playerWalkPhase = 0;
  playerWalkAmp = 0;
  playerLegL.rotation.x = 0;
  playerLegR.rotation.x = 0;
  playerTorso.position.y = 0;
  playerTorso.rotation.z = 0;
  wave = 1;
  kills = 0;
  playerHp = 100;
  fireCd = 0;
  autoAimTime = 0;
  rapidFireTime = 0;
  ambientPickupTimer = 5;
  gameTime = 0;
  nightBlend = 1;
  currentWeapon = "pistol";
  spawnQueue = 0;
  waveClearTimer = 0;
  spawnDelay = 0;
  extractFuelCollected = 0;
  cameraYaw = 0;
  cameraPitch = THREE.MathUtils.degToRad(24);
  initAmmoForRun();
  initFlashlightForRun();
  applyCharacterFromForm();
  el.gameOverOverlay.classList.remove("visible");
  paused = false;
  if (el.pauseOverlay) el.pauseOverlay.classList.remove("visible");
  if (el.launcherBar) el.launcherBar.classList.add("hidden");
  spawnObjectiveFuelCells();
  spawnGateKeyPickup();
  syncJamPortalWorldHeight();
  if (quickRestart) {
    introCameraActive = false;
    introCameraT = 0;
    beginWave();
    playing = true;
    snapGameplayCamera();
    canvas.requestPointerLock?.();
  } else {
    introCameraActive = true;
    introCameraT = 0;
    introCamFrom.copy(camera.position);
    camera.getWorldDirection(camDir);
    introLookFrom.copy(camera.position).add(camDir.multiplyScalar(11));
    computeThirdPersonCameraPosition(introCamTo, introLookTo);
    playing = true;
  }
  el.wave.textContent = String(wave);
  updateHud();
}

function updateHud() {
  el.alive.textContent = String(zombies.length);
  el.kills.textContent = String(kills);
  if (el.ammoText) el.ammoText.textContent = playing ? currentAmmoString() : "—";
  if (el.flashText) {
    if (!playing) {
      el.flashText.textContent = "—";
    } else {
      const pct = Math.round((flashlightBattery / FLASH_BAT_MAX) * 100);
      el.flashText.textContent = `${flashlightOn ? "ON" : "OFF"} · ${THREE.MathUtils.clamp(pct, 0, 100)}%`;
    }
  }
  if (el.objectiveText) {
    if (!playing) {
      el.objectiveText.textContent = `Find the gate key, reach the west compound for ${EXTRACT_FUEL_NEEDED} fuel cells, then extract at the portal.`;
    } else {
      const keyLine = gateUnlocked ? "Gate open" : "Find gate key";
      el.objectiveText.textContent = `${keyLine} — Fuel ${extractFuelCollected}/${EXTRACT_FUEL_NEEDED} — Portal far west`;
    }
  }
  el.healthFill.style.transform = `scaleX(${THREE.MathUtils.clamp(playerHp / 100, 0, 1)})`;
  if (autoAimTime > 0.05) {
    el.buffRow.classList.remove("inactive");
    el.buffTime.textContent = `${autoAimTime.toFixed(1)}s`;
  } else {
    el.buffRow.classList.add("inactive");
    el.buffTime.textContent = "—";
  }
  if (rapidFireTime > 0.05) {
    el.rapidBuffRow.classList.remove("inactive");
    el.rapidBuffTime.textContent = `${rapidFireTime.toFixed(1)}s`;
  } else {
    el.rapidBuffRow.classList.add("inactive");
    el.rapidBuffTime.textContent = "—";
  }
  el.weaponName.textContent = weaponHudLabel();
  el.dayNightLabel.textContent = "Dead of night — corrupted tape";
}

function gameOver() {
  playing = false;
  paused = false;
  if (el.pauseOverlay) el.pauseOverlay.classList.remove("visible");
  document.exitPointerLock?.();
  el.gameOverStats.textContent = `You reached wave ${wave} and dropped ${kills} of them. Not bad — next run can go further.`;
  el.gameOverOverlay.classList.add("visible");
}

const justPressed = new Set();
const keys = new Set();
window.addEventListener("keydown", (e) => {
  if (e.code === "Escape") {
    if (e.repeat) return;
    if (!playing || introCameraActive) return;
    if (el.gameOverOverlay?.classList.contains("visible")) return;
    setPaused(!paused);
    e.preventDefault();
    return;
  }
  keys.add(e.code);
  if (!e.repeat) justPressed.add(e.code);
});
window.addEventListener("keyup", (e) => keys.delete(e.code));

let mouseDown = false;
window.addEventListener("pointerdown", (e) => {
  if (e.button === 0) mouseDown = true;
});
window.addEventListener("pointerup", (e) => {
  if (e.button === 0) mouseDown = false;
});

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

function setAimRayNdc() {
  if (document.pointerLockElement === canvas) {
    ndc.x = 0;
    ndc.y = 0;
  } else {
    ndc.x = (pointerX / window.innerWidth) * 2 - 1;
    ndc.y = -(pointerY / window.innerHeight) * 2 + 1;
  }
}

function computeShootDirection() {
  if (autoAimTime > 0) {
    const z = getNearestZombie(AUTO_AIM_RANGE);
    if (z) {
      shootDir.set(
        z.mesh.position.x - playerGroup.position.x,
        0,
        z.mesh.position.z - playerGroup.position.z
      );
      if (shootDir.lengthSq() > 1e-6) {
        shootDir.normalize();
        return true;
      }
    }
  }
  setAimRayNdc();
  raycaster.setFromCamera(ndc, camera);
  raycaster.ray.intersectPlane(groundPlane, aimHit);
  shootDir.subVectors(aimHit, playerGroup.position);
  shootDir.y = 0;
  if (shootDir.lengthSq() < 0.0001) return false;
  shootDir.normalize();
  return true;
}

function pushBullet(dir, damage, speed = 52) {
  let bColor = 0xffeeaa;
  let bEm = 0xaa6600;
  if (autoAimTime > 0 && rapidFireTime > 0) {
    bColor = 0xffccee;
    bEm = 0x8844aa;
  } else if (autoAimTime > 0) {
    bColor = 0xaaffee;
    bEm = 0x228866;
  } else if (rapidFireTime > 0) {
    bColor = 0xffaa66;
    bEm = 0xcc5522;
  }
  if (currentWeapon === "shotgun") {
    bColor = 0xffddaa;
    bEm = 0xaa6633;
  }
  if (currentWeapon === "smg") {
    bColor = 0xaaaaff;
    bEm = 0x4444cc;
  }
  const bullet = new THREE.Mesh(
    new THREE.SphereGeometry(currentWeapon === "shotgun" ? 0.09 : 0.12, 8, 8),
    new THREE.MeshStandardMaterial({
      color: bColor,
      emissive: bEm,
      emissiveIntensity: 0.65,
      roughness: 0.4,
      metalness: 0.2,
    })
  );
  bullet.castShadow = true;
  const origin = playerGroup.position.clone().add(dir.clone().multiplyScalar(0.9));
  origin.y = terrainHeightAt(playerGroup.position.x, playerGroup.position.z) + 1.05;
  bullet.position.copy(origin);
  scene.add(bullet);
  bullets.push({
    mesh: bullet,
    vel: dir.clone().multiplyScalar(speed),
    t: 1.6,
    damage,
  });
}

function tryShoot() {
  if (fireCd > 0) return;
  if (!computeShootDirection()) return;
  if (ammoState[currentWeapon].cur < 1) {
    showToast("Out of ammo", 1.1);
    return;
  }
  if (!tryConsumeAmmoForCurrentWeapon()) return;

  if (currentWeapon === "shotgun") {
    spawnMuzzleFlash(1.35);
    const spread = 0.32;
    const pellets = 7;
    for (let i = 0; i < pellets; i++) {
      const t = pellets <= 1 ? 0 : (i / (pellets - 1) - 0.5) * 2;
      pelletDir.copy(shootDir);
      pelletDir.applyAxisAngle(new THREE.Vector3(0, 1, 0), t * spread);
      pushBullet(pelletDir, 0.55);
    }
    fireCd = currentFireCd();
    return;
  }

  spawnMuzzleFlash(currentWeapon === "smg" ? 0.75 : 1);
  const dmg = currentWeapon === "smg" ? 1.0 : 1.15;
  pushBullet(shootDir, dmg);
  fireCd = currentFireCd();
}

let pointerX = window.innerWidth / 2;
let pointerY = window.innerHeight / 2;
window.addEventListener("pointermove", (e) => {
  pointerX = e.clientX;
  pointerY = e.clientY;
  if (playing && !introCameraActive && !paused && document.pointerLockElement === canvas) {
    // First-person should feel non-inverted, third-person can stay "cinematic".
    cameraYaw += (cameraPerson === "first" ? 1 : -1) * e.movementX * CAM_MOUSE_SENS;
    cameraPitch = THREE.MathUtils.clamp(
      cameraPitch + (cameraPerson === "first" ? -1 : 1) * e.movementY * CAM_MOUSE_SENS * 0.82,
      CAM_PITCH_MIN,
      CAM_PITCH_MAX
    );
  }
});

canvas.addEventListener("click", () => {
  if (playing && !introCameraActive && !paused && document.pointerLockElement !== canvas) {
    canvas.requestPointerLock?.();
  }
});

function updatePlayer(dt, nightForTorch) {
  camMoveFwd.set(Math.sin(cameraYaw), 0, Math.cos(cameraYaw));
  camMoveRight.crossVectors(camMoveFwd, camWorldUp).normalize();
  let mx = 0;
  let mz = 0;
  if (keys.has("KeyW")) {
    mx += camMoveFwd.x;
    mz += camMoveFwd.z;
  }
  if (keys.has("KeyS")) {
    mx -= camMoveFwd.x;
    mz -= camMoveFwd.z;
  }
  if (keys.has("KeyA")) {
    mx -= camMoveRight.x;
    mz -= camMoveRight.z;
  }
  if (keys.has("KeyD")) {
    mx += camMoveRight.x;
    mz += camMoveRight.z;
  }
  const len = Math.hypot(mx, mz);
  const speed = playerMoveSpeed;
  if (len > 1e-6) {
    mx = (mx / len) * speed * dt;
    mz = (mz / len) * speed * dt;
  }
  playerGroup.position.x += mx;
  playerGroup.position.z += mz;
  const resolved = resolveTreeAndBorder(playerGroup.position.x, playerGroup.position.z);
  playerGroup.position.x = resolved.x;
  playerGroup.position.z = resolved.z;
  if (!gateUnlocked && playerGroup.position.x < GATE_PASS_X) {
    playerGroup.position.x = GATE_PASS_X;
  }
  playerGroup.position.y = terrainHeightAt(playerGroup.position.x, playerGroup.position.z);

  const moveStep = Math.hypot(mx, mz);
  const moving = moveStep > 1e-7;
  playerWalkAmp += ((moving ? 1 : 0) - playerWalkAmp) * (1 - Math.exp(-dt * 12));
  playerWalkPhase += dt * 15.5 * Math.max(0.18, playerWalkAmp);
  const sWalk = Math.sin(playerWalkPhase);
  const bob = Math.abs(Math.sin(playerWalkPhase * 2));
  playerLegL.rotation.x = sWalk * 0.52 * playerWalkAmp;
  playerLegR.rotation.x = -sWalk * 0.52 * playerWalkAmp;
  playerTorso.position.y = bob * 0.052 * playerWalkAmp;
  playerTorso.rotation.z = sWalk * 0.038 * playerWalkAmp;

  if (cameraPerson === "first") {
    if (autoAimTime > 0) {
      const z = getNearestZombie(AUTO_AIM_RANGE);
      if (z) {
        tmpV.set(z.mesh.position.x - playerGroup.position.x, 0, z.mesh.position.z - playerGroup.position.z);
        if (tmpV.lengthSq() > 1e-6) {
          const targetY = Math.atan2(tmpV.x, tmpV.z);
          let delta = targetY - cameraYaw;
          while (delta > Math.PI) delta -= Math.PI * 2;
          while (delta < -Math.PI) delta += Math.PI * 2;
          cameraYaw += delta * (1 - Math.exp(-dt * 14));
        }
      }
    }
    playerGroup.rotation.y = cameraYaw;
    camera.position.set(
      playerGroup.position.x,
      playerGroup.position.y + FP_EYE_Y,
      playerGroup.position.z
    );
    camera.up.set(0, 1, 0);
    camera.rotation.order = "YXZ";
    camera.rotation.y = cameraYaw;
    camera.rotation.x = cameraPitch;
    camera.rotation.z = 0;
  } else {
    setAimRayNdc();
    raycaster.setFromCamera(ndc, camera);
    raycaster.ray.intersectPlane(groundPlane, aimHit);
    tmpV.subVectors(aimHit, playerGroup.position);
    tmpV.y = 0;
    if (autoAimTime > 0) {
      const z = getNearestZombie(AUTO_AIM_RANGE);
      if (z) {
        tmpV.set(z.mesh.position.x - playerGroup.position.x, 0, z.mesh.position.z - playerGroup.position.z);
        if (tmpV.lengthSq() > 1e-6) {
          const targetY = Math.atan2(tmpV.x, tmpV.z);
          const curY = playerGroup.rotation.y;
          let delta = targetY - curY;
          while (delta > Math.PI) delta -= Math.PI * 2;
          while (delta < -Math.PI) delta += Math.PI * 2;
          playerGroup.rotation.y += delta * (1 - Math.exp(-dt * 14));
        }
      } else if (tmpV.lengthSq() > 1e-6) {
        playerGroup.rotation.y = Math.atan2(tmpV.x, tmpV.z);
      }
    } else if (tmpV.lengthSq() > 1e-6) {
      playerGroup.rotation.y = Math.atan2(tmpV.x, tmpV.z);
    }

    computeThirdPersonCameraPosition(thirdCamPos, camLookTmp);
    camera.position.copy(thirdCamPos);
    camera.lookAt(camLookTmp);
  }

  playerLantern.position.copy(playerGroup.position);
  playerLantern.position.y = playerGroup.position.y + 5.8;

  const fx = Math.sin(playerGroup.rotation.y);
  const fz = Math.cos(playerGroup.rotation.y);
  const tx = playerGroup.position.x + fx * 20;
  const tz = playerGroup.position.z + fz * 20;
  torchTarget.position.set(tx, terrainHeightAt(tx, tz) + 0.6, tz);
  playerTorchSpot.target.updateMatrixWorld();
  playerTorchSpot.updateMatrixWorld();

  const torchK = Math.pow(Math.min(1, nightForTorch), 0.98);
  const batK = flashlightOn ? THREE.MathUtils.clamp(flashlightBattery / FLASH_BAT_MAX, 0, 1) : 0;
  const beamK = torchK * (0.15 + 0.85 * batK);
  playerTorchSpot.intensity = THREE.MathUtils.lerp(14, 54, beamK);
  playerTorchSpot.distance = THREE.MathUtils.lerp(58, 108, beamK);
  playerTorchPoint.intensity = THREE.MathUtils.lerp(16, 52, beamK);
  playerTorchPoint.distance = THREE.MathUtils.lerp(62, 108, beamK);
  playerTorchPoint.decay = THREE.MathUtils.lerp(1.02, 1.14, torchK);
  playerTorchPoint.position.copy(torchFlameMesh.position);
  if (torchFlameMesh) {
    torchFlameMesh.visible = beamK > 0.02;
    torchFlameMesh.material.emissiveIntensity =
      THREE.MathUtils.lerp(1.1, 3.1, torchK) + Math.sin(flickerT * 14) * 0.35 * (0.45 + torchK);
    torchFlameMesh.scale.setScalar(0.95 + 0.65 * torchK);
  }
  playerTorchSpot.visible = beamK > 0.02;
  playerTorchPoint.visible = beamK > 0.02;
}

function updateDayNight(dt) {
  if (!playing) return undefined;
  gameTime += dt;
  nightBlend = 1;

  const tape = 1 + Math.sin(flickerT * 1.65) * 0.032 + Math.sin(flickerT * 31) * 0.005;
  scene.background.setHex(0x020003);

  if (scene.fog instanceof THREE.FogExp2) {
    // Dead-of-night: visibility is almost zero without the flashlight.
    scene.fog.density = (0.058 + Math.sin(flickerT * 2.15) * 0.0045) * tape;
    scene.fog.color.setHex(0x010001);
  }

  ambient.intensity = 0.018;
  ambient.color.setHex(0x0c0a14);

  hemi.intensity = 0.032;
  fill.intensity = 0.01;

  playerLantern.intensity = 1.25;

  sick.intensity = 0.14 + Math.sin(flickerT * 2.35) * 0.05;

  moon.intensity = 0.045 + Math.sin(flickerT * 0.8) * 0.018;

  const gMul = 0.18;
  ground.material.color.setRGB(gMul, gMul * 0.92, gMul * 0.9);

  zombieEyes.color.setHex(0xff2424);

  foliageMat.color.setHex(0x0c1810);
  trunkMat.color.setHex(0x181210);

  return nightBlend;
}

function updateZombies(dt) {
  const p = playerGroup.position;
  for (const z of zombies) {
    tmpV.subVectors(p, z.mesh.position);
    tmpV.y = 0;
    const d = tmpV.length();
    if (d > 1e-4) tmpV.multiplyScalar(1 / d);
    z.mesh.position.addScaledVector(tmpV, z.speed * dt);
    z.mesh.lookAt(p.x, z.mesh.position.y + 0.5, p.z);

    const rig = z.mesh.userData.rig;
    if (rig) {
      const chase = d > 0.4 ? 1 : 0.15;
      const pace = z.speed * (z.isBoss ? 2.35 : 2.75);
      z.mesh.userData.walkPhase += dt * pace;
      const ph = z.mesh.userData.walkPhase;
      const jitter = z.mesh.userData.walkJitter ?? 0;
      const sham = Math.sin(ph * 0.43 + jitter) * 0.055;
      const amp = (z.isBoss ? 0.36 : 0.46) * chase;
      rig.legL.rotation.x = Math.sin(ph) * amp + sham;
      rig.legR.rotation.x = -Math.sin(ph) * amp + sham;
      rig.torso.position.y = Math.abs(Math.sin(ph * 2)) * 0.048 * chase;
      rig.torso.rotation.z = Math.sin(ph * 0.52 + jitter * 0.2) * 0.085 * chase;
    }

    z.touchCd -= dt;
    const reach = z.isBoss ? 1.35 : 1.05;
    if (d < reach && z.touchCd <= 0) {
      playerHp -= z.dmgPlayer;
      z.touchCd = z.isBoss ? 0.55 : 0.45;
      if (playerHp <= 0) {
        playerHp = 0;
        gameOver();
      }
    }
  }
}

function updateBullets(dt) {
  outer: for (let i = bullets.length - 1; i >= 0; i--) {
    const b = bullets[i];
    b.mesh.position.addScaledVector(b.vel, dt);
    b.t -= dt;
    if (b.t <= 0 || Math.abs(b.mesh.position.x) > WORLD_LIMIT + 28 || Math.abs(b.mesh.position.z) > WORLD_LIMIT + 28) {
      scene.remove(b.mesh);
      bullets.splice(i, 1);
      continue;
    }
    for (let j = zombies.length - 1; j >= 0; j--) {
      const z = zombies[j];
      const dx = b.mesh.position.x - z.mesh.position.x;
      const dz = b.mesh.position.z - z.mesh.position.z;
      const horiz = Math.hypot(dx, dz);
      const vert = Math.abs(b.mesh.position.y - z.hitY);
      if (horiz < z.hitRadius && vert < 1.2) {
        z.hp -= b.damage;
        scene.remove(b.mesh);
        bullets.splice(i, 1);
        if (z.hp <= 0) {
          spawnBloodDecal(z.mesh.position.x, z.mesh.position.z);
          maybeDropPickupFromKill(z.mesh.position.x, z.mesh.position.z);
          scene.remove(z.mesh);
          zombies.splice(j, 1);
          kills += 1;
        }
        continue outer;
      }
    }
  }
}

function updateWaves(dt) {
  if (!playing) return;
  ambientPickupTimer -= dt;
  if (ambientPickupTimer <= 0 && pickups.length < 4) {
    spawnPickup(randomPickupKind(), playerGroup.position.x, playerGroup.position.z, 28);
    ambientPickupTimer = 24 + Math.random() * 14;
  }
  if (spawnQueue > 0) {
    spawnDelay -= dt;
    if (spawnDelay <= 0) {
      spawnZombie();
      spawnQueue -= 1;
      spawnDelay = Math.max(0.04, 0.22 - wave * 0.01);
    }
  } else if (zombies.length === 0) {
    waveClearTimer += dt;
    if (waveClearTimer > 2.2) {
      wave += 1;
      beginWave();
    }
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  flickerT += dt;

  jamPortalGroup.rotation.y += dt * 0.88;
  updateGateAnimation(dt);

  if (playing && !introCameraActive && !paused) {
    fireCd -= dt;
    autoAimTime = Math.max(0, autoAimTime - dt);
    rapidFireTime = Math.max(0, rapidFireTime - dt);
    meleeCd = Math.max(0, meleeCd - dt);
    if (justPressed.has("KeyF")) toggleFlashlight();
    if (justPressed.has("KeyV")) tryMelee();
    if (mouseDown) tryShoot();
    updateFlashlight(dt);
    const nb = updateDayNight(dt);
    updatePlayer(dt, nb ?? nightBlend);
    updateZombies(dt);
    updateBullets(dt);
    updatePickups(dt);
    updateMuzzleFlashes(dt);
    updateBloodDecals(dt);
    updateWaves(dt);
    checkJamPortalEntry();
    justPressed.clear();
  } else if (playing && introCameraActive) {
    if (!paused) {
      introCameraT += dt / INTRO_CAM_SEC;
    }
    const k = THREE.MathUtils.clamp(introCameraT, 0, 1);
    const ease = k * k * (3 - 2 * k);
    camera.position.lerpVectors(introCamFrom, introCamTo, ease);
    introLookCur.lerpVectors(introLookFrom, introLookTo, ease);
    camera.lookAt(introLookCur);
    if (introCameraT >= 1) {
      introCameraActive = false;
      playerGroup.rotation.y = 0;
      cameraYaw = 0;
      beginWave();
      snapGameplayCamera();
    }
    justPressed.clear();
  } else if (playing && paused) {
    updateDayNight(dt);
    if (cameraPerson === "first") {
      snapGameplayCamera();
    } else {
      computeThirdPersonCameraPosition(thirdCamPos, camLookTmp);
      camera.position.copy(thirdCamPos);
      camera.lookAt(camLookTmp);
    }
    justPressed.clear();
  } else {
    document.exitPointerLock?.();
    playerGroup.rotation.y += dt * 0.2;
    applyMenuCamera();
    justPressed.clear();
  }

  if (portalMessageT > 0) {
    portalMessageT = Math.max(0, portalMessageT - dt);
    if (portalMessageT <= 0 && el.toast) el.toast.classList.remove("visible");
  }
  updateCrosshairVisible();

  updateHud();
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

cameraPerson = readCameraPersonPref();

parseJamInboundParams();
applyCharacterFromForm();
if (el.playerSpeedVal && el.playerSpeed) el.playerSpeedVal.textContent = el.playerSpeed.value;
syncPauseRadiosFromGame();
syncCameraFovAndRig();

el.launcherPlay?.addEventListener("click", () => resetGame(false));
el.restartBtn.addEventListener("click", () => resetGame(true));
el.playerColor?.addEventListener("input", () => applyCharacterFromForm());
el.playerSpeed?.addEventListener("input", () => {
  if (el.playerSpeedVal) el.playerSpeedVal.textContent = el.playerSpeed.value;
  const n = parseFloat(el.playerSpeed.value);
  if (Number.isFinite(n)) playerMoveSpeed = THREE.MathUtils.clamp(n, 6, 18);
});
el.pauseResumeBtn?.addEventListener("click", () => setPaused(false));
el.pauseDefaultsBtn?.addEventListener("click", () => menuDefaults());
el.cameraFirst?.addEventListener("change", () => {
  if (el.cameraFirst.checked) {
    cameraPerson = "first";
    writeCameraPersonPref();
    syncCameraFovAndRig();
    if (playing && !introCameraActive) snapGameplayCamera();
  }
});
el.cameraThird?.addEventListener("change", () => {
  if (el.cameraThird.checked) {
    cameraPerson = "third";
    writeCameraPersonPref();
    syncCameraFovAndRig();
    if (playing && !introCameraActive) snapGameplayCamera();
  }
});

applyMenuCamera();

requestAnimationFrame(frame);
