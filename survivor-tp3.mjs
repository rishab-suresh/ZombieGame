import * as THREE from "https://unpkg.com/three@0.170.0/build/three.module.js";

console.info(
  "%cZombie Survivor%c — Play · Esc pause · first/third person.",
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
  gameOverTitle: document.getElementById("gameOverTitle"),
  gameOverStats: document.getElementById("gameOverStats"),
  restartBtn: document.getElementById("restartBtn"),
  launcherBar: document.getElementById("launcherBar"),
  launcherPlay: document.getElementById("launcherPlay"),
  diffCasual: document.getElementById("diffCasual"),
  diffSurvival: document.getElementById("diffSurvival"),
  diffDesc: document.getElementById("diffDesc"),
  pauseOverlay: document.getElementById("pauseOverlay"),
  pauseResumeBtn: document.getElementById("pauseResumeBtn"),
  pauseDefaultsBtn: document.getElementById("pauseDefaultsBtn"),
  cameraFirst: document.getElementById("cameraFirst"),
  cameraThird: document.getElementById("cameraThird"),
  playerColor: document.getElementById("playerColor"),
  playerSpeed: document.getElementById("playerSpeed"),
  playerSpeedVal: document.getElementById("playerSpeedVal"),
  crosshair: document.getElementById("crosshair"),
  toast: document.getElementById("toast"),
  vhsOverlay: document.querySelector(".vhs-overlay"),
  ammoText: document.getElementById("ammoText"),
  flashText: document.getElementById("flashText"),
  objectiveText: document.getElementById("objectiveText"),
  touchUi: document.getElementById("touchUi"),
  lookPad: document.getElementById("lookPad"),
  joyPad: document.getElementById("joyPad"),
  joyKnob: document.getElementById("joyKnob"),
  touchPause: document.getElementById("touchPause"),
  touchFlash: document.getElementById("touchFlash"),
  touchMelee: document.getElementById("touchMelee"),
  touchFire: document.getElementById("touchFire"),
};

const canvas = document.getElementById("gameCanvas");
if (!canvas) {
  throw new Error('Missing #gameCanvas — add <canvas id="gameCanvas"> in index.html');
}

const IS_LITE_GPU =
  window.matchMedia("(pointer: coarse)").matches || window.innerWidth < 820;
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: !IS_LITE_GPU,
  powerPreference: "high-performance",
});
function currentPixelRatio() {
  const cap = IS_LITE_GPU || window.matchMedia("(pointer: coarse)").matches ? 1.15 : 2;
  return Math.min(window.devicePixelRatio || 1, cap);
}
function viewSize() {
  const vv = window.visualViewport;
  return {
    w: Math.max(1, Math.round(vv?.width ?? window.innerWidth)),
    h: Math.max(1, Math.round(vv?.height ?? window.innerHeight)),
  };
}
function fitRenderer() {
  const { w, h } = viewSize();
  renderer.setPixelRatio(currentPixelRatio());
  renderer.setSize(w, h, false);
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.88;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050208);

const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 1400);
camera.position.set(0, 38, 32);
fitRenderer();

const fogColor = new THREE.Color(0x020105);
scene.fog = new THREE.FogExp2(fogColor.getHex(), 0.016);
const skyWork = new THREE.Color();
const skyDay = new THREE.Color(0x7aa0c8);
const skyNight = new THREE.Color(0x000000);
const skyDusk = new THREE.Color(0xc07040);
const skyDawn = new THREE.Color(0xe8a878);

const ambient = new THREE.AmbientLight(0x1a1830, 0.04);
scene.add(ambient);
const hemi = new THREE.HemisphereLight(0x202040, 0x080604, 0.07);
scene.add(hemi);
const moon = new THREE.DirectionalLight(0xc8c0e8, 0.09);
moon.position.set(-38, 72, 28);
moon.castShadow = true;
moon.shadow.mapSize.setScalar(IS_LITE_GPU ? 1024 : 2048);
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

const FLASH_REACH = 7.8;
const FLASH_HARD_CUT = 9.2;

function terrainHeightAt(x, z) {
  return (
    Math.sin(x * 0.07) * 0.55 +
    Math.cos(z * 0.058) * 0.48 +
    Math.sin(x * 0.13 + z * 0.11) * 0.18 +
    Math.cos(x * 0.025 - z * 0.031) * 0.22
  );
}

const WORLD_LIMIT = 480;
const GATE_LINE_X = -200;
const GATE_PASS_X = GATE_LINE_X + 1.9;
const EXTRACT_PORTAL_POS = { x: -430, z: 48, enterRadius: 3.05 };
const GROUND_HALF = WORLD_LIMIT + 28;

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
const TREE_COUNT = IS_LITE_GPU ? 280 : 560;
const BUSH_COUNT = IS_LITE_GPU ? 360 : 780;
const TREE_EXTENT = WORLD_LIMIT + 22;
for (let i = 0; i < TREE_COUNT; i++) {
  const x = -TREE_EXTENT + Math.random() * (2 * TREE_EXTENT);
  const z = -TREE_EXTENT + Math.random() * (2 * TREE_EXTENT);
  if (x * x + z * z < 900) continue;
  if (Math.hypot(x - EXTRACT_PORTAL_POS.x, z - EXTRACT_PORTAL_POS.z) < 28) continue;
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
for (let i = 0; i < BUSH_COUNT; i++) {
  const x = -TREE_EXTENT + Math.random() * (2 * TREE_EXTENT);
  const z = -TREE_EXTENT + Math.random() * (2 * TREE_EXTENT);
  if (x * x + z * z < 480) continue;
  if (Math.hypot(x - EXTRACT_PORTAL_POS.x, z - EXTRACT_PORTAL_POS.z) < 20) continue;
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

const GEO_RAD = IS_LITE_GPU ? 8 : 14;
const GEO_CAP = IS_LITE_GPU ? 3 : 6;

const playerGroup = new THREE.Group();
const playerRig = new THREE.Group();
playerGroup.add(playerRig);

const playerSkinMat = new THREE.MeshStandardMaterial({
  color: 0xc4a07a,
  roughness: 0.62,
  metalness: 0.04,
});
const playerLegMat = new THREE.MeshStandardMaterial({
  color: 0x3d4e78,
  roughness: 0.78,
  metalness: 0.08,
});
const playerBootMat = new THREE.MeshStandardMaterial({
  color: 0x1c1814,
  roughness: 0.7,
  metalness: 0.12,
});
const playerGunMat = new THREE.MeshStandardMaterial({
  color: 0x2a2c30,
  roughness: 0.38,
  metalness: 0.62,
});

function addPlayerLeg(side) {
  const hip = new THREE.Group();
  hip.position.set(side * 0.13, 0.92, 0);
  const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.28, GEO_CAP, GEO_RAD), playerLegMat);
  thigh.position.y = -0.2;
  thigh.castShadow = true;
  thigh.receiveShadow = true;
  hip.add(thigh);
  const shin = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.26, GEO_CAP, GEO_RAD), playerLegMat);
  shin.position.y = -0.52;
  shin.castShadow = true;
  hip.add(shin);
  const boot = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.12, 2, GEO_RAD), playerBootMat);
  boot.rotation.x = Math.PI * 0.5;
  boot.position.set(0, -0.7, 0.05);
  boot.castShadow = true;
  hip.add(boot);
  playerRig.add(hip);
  return hip;
}
const playerLegL = addPlayerLeg(-1);
const playerLegR = addPlayerLeg(1);

const playerTorso = new THREE.Group();
playerTorso.position.y = 0.02;
playerRig.add(playerTorso);

const body = new THREE.Mesh(
  new THREE.CapsuleGeometry(0.2, 0.42, GEO_CAP, GEO_RAD),
  new THREE.MeshStandardMaterial({
    color: 0x5a7ec8,
    roughness: 0.55,
    metalness: 0.18,
  })
);
body.position.y = 1.18;
body.castShadow = true;
body.receiveShadow = true;
playerTorso.add(body);

const playerCollar = new THREE.Mesh(
  new THREE.TorusGeometry(0.16, 0.035, 8, GEO_RAD),
  body.material
);
playerCollar.rotation.x = Math.PI * 0.5;
playerCollar.position.y = 1.42;
playerTorso.add(playerCollar);

const playerHead = new THREE.Group();
playerHead.position.y = 1.58;
const headMesh = new THREE.Mesh(new THREE.SphereGeometry(0.155, GEO_RAD + 2, GEO_RAD), playerSkinMat);
headMesh.scale.set(0.92, 1.05, 0.9);
headMesh.castShadow = true;
playerHead.add(headMesh);
const hair = new THREE.Mesh(
  new THREE.SphereGeometry(0.16, GEO_RAD, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
  new THREE.MeshStandardMaterial({ color: 0x1a1410, roughness: 0.9, metalness: 0.02 })
);
hair.rotation.x = 0.15;
hair.position.y = 0.02;
playerHead.add(hair);
playerTorso.add(playerHead);

function addPlayerArm(side) {
  const shoulder = new THREE.Group();
  shoulder.position.set(side * 0.28, 1.34, 0);
  const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.22, GEO_CAP, GEO_RAD), body.material);
  upper.position.y = -0.16;
  upper.castShadow = true;
  shoulder.add(upper);
  const lower = new THREE.Mesh(new THREE.CapsuleGeometry(0.045, 0.2, GEO_CAP, GEO_RAD), playerSkinMat);
  lower.position.y = -0.4;
  lower.castShadow = true;
  shoulder.add(lower);
  playerTorso.add(shoulder);
  return shoulder;
}
const playerArmL = addPlayerArm(-1);
const playerArmR = addPlayerArm(1);
playerArmL.rotation.z = 0.18;
playerArmR.rotation.z = -0.22;
playerArmR.rotation.x = -0.55;

const gun = new THREE.Group();
gun.position.set(0.08, -0.52, 0.22);
playerArmR.add(gun);
const stock = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.12, 0.22), playerGunMat);
stock.position.z = -0.08;
gun.add(stock);
const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.034, 0.42, GEO_RAD), playerGunMat);
muzzle.rotation.x = Math.PI * 0.5;
muzzle.position.z = 0.18;
muzzle.castShadow = true;
gun.add(muzzle);

const torchHandle = new THREE.Mesh(
  new THREE.CylinderGeometry(0.035, 0.04, 0.28, GEO_RAD),
  new THREE.MeshStandardMaterial({ color: 0x3a2a20, roughness: 0.75, metalness: 0.15 })
);
torchHandle.position.set(0.02, -0.48, 0.08);
torchHandle.rotation.x = 0.4;
torchHandle.castShadow = true;
playerArmL.add(torchHandle);
torchFlameMesh = new THREE.Mesh(
  new THREE.SphereGeometry(0.07, 10, 8),
  new THREE.MeshStandardMaterial({
    color: 0xffaa55,
    emissive: 0xff6600,
    emissiveIntensity: 0.85,
    roughness: 0.4,
    metalness: 0.1,
  })
);
torchFlameMesh.position.set(0.02, -0.32, 0.16);
playerArmL.add(torchFlameMesh);

const playerTorchPoint = new THREE.PointLight(0xffcc88, 4, 7, 2);
playerTorchPoint.castShadow = false;
scene.add(playerTorchPoint);

const playerTorchSpot = new THREE.SpotLight(0xffe8c8, 12, FLASH_HARD_CUT, 0.36, 0.24, 0.65);
playerTorchSpot.castShadow = !IS_LITE_GPU;
playerTorchSpot.shadow.mapSize.setScalar(IS_LITE_GPU ? 512 : 1024);
playerTorchSpot.shadow.bias = -0.00012;
playerTorchSpot.shadow.camera.near = 0.2;
playerTorchSpot.shadow.camera.far = FLASH_HARD_CUT + 2;
const flashRig = new THREE.Group();
scene.add(flashRig);
flashRig.add(playerTorchSpot);
flashRig.add(torchTarget);
playerTorchSpot.position.set(0, 0, 0);
torchTarget.position.set(0, 0, -FLASH_REACH);
playerTorchSpot.target = torchTarget;

let playerWalkPhase = 0;
let playerWalkAmp = 0;

playerGroup.position.set(0, 0, 0);
scene.add(playerGroup);

let playerMoveSpeed = 11;
let introCameraActive = false;
let introCameraT = 0;
const INTRO_CAM_SEC = 2.12;

let cameraYaw = 0;
/** Third-person orbit elevation (0 ≈ behind, higher ≈ overhead). */
let orbitPitch = THREE.MathUtils.degToRad(24);
/** First-person look pitch. Three.js YXZ: +x looks down. */
let lookPitch = 0;
const CAM_DIST = 13.5;
const CAM_LOOK_Y = 0.95;
const CAM_EYE_OFFSET_Y = 1.12;
const ORBIT_PITCH_MIN = 0.12;
const ORBIT_PITCH_MAX = 1.22;
const LOOK_PITCH_MIN = -1.15;
const LOOK_PITCH_MAX = 1.12;
const CAM_MOUSE_SENS = 0.0022;
const CAM_TOUCH_SENS = 0.0034;
const DAY_CYCLE_SEC = 220;
const CAM_FOV_THIRD = 52;
const CAM_FOV_FIRST = 78;
const FP_EYE_Y = 1.62;
const CAM_PREF_KEY = "zs-survivor-cam";
const DIFF_PREF_KEY = "zs-survivor-diff";
/** @type {'first' | 'third'} */
let cameraPerson = "first";
/** @type {'casual' | 'survival'} */
let gameDifficulty = "survival";

const DIFF = {
  survival: {
    pistolStart: [10, 18],
    shotgunStart: [2, 10],
    smgStart: [0, 48],
    ammoPickup: { pistol: 6, shotgun: 2, smg: 8 },
    pickupMax: 28,
    ambientMax: 6,
    ambientInterval: [24, 38],
    killDropChance: 0.09,
    zombieWaveMul: 1,
    zombieHpMul: 1,
    zombieDmgMul: 1,
    zombieSpeedMul: 1,
    keySpawnQueueMul: 1,
    spawnDelayMul: 1,
  },
  casual: {
    pistolStart: [24, 36],
    shotgunStart: [6, 16],
    smgStart: [18, 64],
    ammoPickup: { pistol: 12, shotgun: 4, smg: 16 },
    pickupMax: 42,
    ambientMax: 11,
    ambientInterval: [12, 20],
    killDropChance: 0.24,
    zombieWaveMul: 1.45,
    zombieHpMul: 0.72,
    zombieDmgMul: 0.6,
    zombieSpeedMul: 1.08,
    keySpawnQueueMul: 0.55,
    spawnDelayMul: 0.72,
  },
};

function diffCfg() {
  return DIFF[gameDifficulty];
}

function isCasual() {
  return gameDifficulty === "casual";
}

function difficultyLabel() {
  return isCasual() ? "Casual" : "Survival";
}

const KEYS_NEEDED = 4;
let keysCollected = 0;
let hordeWasNight = false;
let hordeEverStarted = false;

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

const extractPortalGroup = new THREE.Group();
{
  const ph = terrainHeightAt(EXTRACT_PORTAL_POS.x, EXTRACT_PORTAL_POS.z);
  extractPortalGroup.position.set(EXTRACT_PORTAL_POS.x, ph + 0.06, EXTRACT_PORTAL_POS.z);
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
  extractPortalGroup.add(ring);
  const ringInner = new THREE.Mesh(new THREE.TorusGeometry(1.35, 0.14, 10, 36), ringMat.clone());
  ringInner.rotation.x = Math.PI / 2;
  ringInner.material.emissiveIntensity = 1.8;
  extractPortalGroup.add(ringInner);
  const portalLight = new THREE.PointLight(0x88fff0, 2.8, 26, 1.45);
  portalLight.position.y = 0.55;
  extractPortalGroup.add(portalLight);
  const label = makePortalLabelSprite(["Extract", "Behind the gate"]);
  label.position.y = 4.35;
  extractPortalGroup.add(label);
}
scene.add(extractPortalGroup);
function syncExtractPortalWorldHeight() {
  const ph = terrainHeightAt(EXTRACT_PORTAL_POS.x, EXTRACT_PORTAL_POS.z);
  extractPortalGroup.position.set(EXTRACT_PORTAL_POS.x, ph + 0.06, EXTRACT_PORTAL_POS.z);
}

const zombieMat = new THREE.MeshStandardMaterial({
  color: 0x3cb356,
  roughness: 0.82,
  metalness: 0.04,
  emissive: 0x000000,
  emissiveIntensity: 0,
});
const bossZombieMat = new THREE.MeshStandardMaterial({
  color: 0x1a5030,
  roughness: 0.78,
  metalness: 0.08,
  emissive: 0x000000,
  emissiveIntensity: 0,
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
const FLASH_BAT_MAX = 180; // seconds of night use
const FLASH_BAT_PICKUP = 55; // seconds
const FLASH_DRAIN_PER_SEC = 0.42;
const MELEE_RANGE = 2.85;
const MELEE_CONE_DOT = 0.22;
const MELEE_CD_SEC = 0.52;
const MELEE_ZOMBIE_DAMAGE = 3.4;
const MELEE_WIND = 0.22;
const ARM_R_REST_X = -0.55;
const ARM_R_REST_Z = -0.22;

let gameTime = 0;
let nightBlend = 0;
let deepNightBlend = 0;
let skyPhaseLabel = "Afternoon";

const BOSS_WAVE_INTERVAL = 4;
const BOSS_WAVE_FIRST = 3;

/** @typedef {'pistol' | 'shotgun' | 'smg'} WeaponId */
/** @typedef {'autoAim' | 'rapidFire' | 'weaponPistol' | 'weaponShotgun' | 'weaponSmg' | 'medKit' | 'ammoPistol' | 'ammoShotgun' | 'ammoSmg' | 'gateKey' | 'battery'} PickupKind */
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
let flashlightBattery = FLASH_BAT_MAX;
let flashlightLowWarned = false;
let meleeCd = 0;
let meleeAnim = 0;
let meleeHitArmed = false;
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
    if (Math.hypot(x - EXTRACT_PORTAL_POS.x, z - EXTRACT_PORTAL_POS.z) < 22) continue;
    if (!isClearOfTrees(x, z, 1.4)) continue;
    return { x, z };
  }
  return { x: px + 18, z: pz };
}

function pickExplorePoint(placed, minSep, minFromOrigin) {
  const xMin = GATE_PASS_X + 22;
  const xMax = WORLD_LIMIT - 18;
  const zSpan = WORLD_LIMIT - 18;
  for (let attempt = 0; attempt < 160; attempt++) {
    const x = THREE.MathUtils.lerp(xMin, xMax, Math.random());
    const z = THREE.MathUtils.lerp(-zSpan, zSpan, Math.random());
    if (Math.hypot(x, z) < minFromOrigin) continue;
    if (Math.hypot(x - EXTRACT_PORTAL_POS.x, z - EXTRACT_PORTAL_POS.z) < 28) continue;
    if (!isClearOfTrees(x, z, 1.5)) continue;
    if (placed.some((p) => Math.hypot(p.x - x, p.z - z) < minSep)) continue;
    return { x, z };
  }
  return {
    x: THREE.MathUtils.clamp(WORLD_LIMIT - 36 - placed.length * 28, xMin, xMax),
    z: THREE.MathUtils.clamp((placed.length % 2 === 0 ? 1 : -1) * (140 + placed.length * 70), -zSpan, zSpan),
  };
}

function spawnScatteredKeys() {
  const placed = [];
  const minSep = WORLD_LIMIT * 0.48;
  for (let n = 0; n < KEYS_NEEDED; n++) {
    const p = pickExplorePoint(placed, minSep, 85 + n * 40);
    placed.push(p);
    spawnPickup("gateKey", p.x, p.z, 0, true);
  }
}

function playerLookForward(out = tmpV) {
  // Matches Three.js camera default (-Z) after yaw around Y.
  return out.set(-Math.sin(cameraYaw), 0, -Math.cos(cameraYaw));
}

function computeThirdPersonCameraPosition(targetPos, lookTarget) {
  const flat = Math.cos(orbitPitch) * CAM_DIST;
  const h = Math.sin(orbitPitch) * CAM_DIST;
  const fx = -Math.sin(cameraYaw);
  const fz = -Math.cos(cameraYaw);
  targetPos.set(
    playerGroup.position.x - fx * flat,
    playerGroup.position.y + CAM_EYE_OFFSET_Y + h,
    playerGroup.position.z - fz * flat
  );
  lookTarget.set(playerGroup.position.x, playerGroup.position.y + CAM_LOOK_Y, playerGroup.position.z);
}

function updateCrosshairVisible() {
  if (!el.crosshair) return;
  const on =
    playing &&
    !introCameraActive &&
    !paused &&
    (document.pointerLockElement === canvas || useTouchControls());
  el.crosshair.classList.toggle("visible", !!on);
}

let preferTouchUi = window.matchMedia("(pointer: coarse)").matches;
function useTouchControls() {
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    preferTouchUi ||
    window.innerWidth <= 760
  );
}

const joy = { id: null, ox: 0, oy: 0, x: 0, y: 0 };
const lookTouch = { id: null, x: 0, y: 0 };
let touchFireHeld = false;

function syncTouchUi() {
  const show =
    useTouchControls() &&
    playing &&
    !introCameraActive &&
    !paused &&
    !el.gameOverOverlay?.classList.contains("visible");
  if (el.touchUi) el.touchUi.hidden = !show;
  if (!show) {
    joy.id = null;
    joy.x = 0;
    joy.y = 0;
    lookTouch.id = null;
    touchFireHeld = false;
    if (el.joyKnob) el.joyKnob.style.transform = "translate(0px, 0px)";
    el.touchFire?.classList.remove("held");
  }
}

function applyLookDelta(dx, dy, sens) {
  cameraYaw -= dx * sens;
  if (cameraPerson === "first") {
    lookPitch = THREE.MathUtils.clamp(lookPitch + dy * sens * 0.95, LOOK_PITCH_MIN, LOOK_PITCH_MAX);
  } else {
    orbitPitch = THREE.MathUtils.clamp(orbitPitch + dy * sens * 0.82, ORBIT_PITCH_MIN, ORBIT_PITCH_MAX);
  }
}

function updateJoyFromEvent(e) {
  const maxR = 52;
  let dx = e.clientX - joy.ox;
  let dy = e.clientY - joy.oy;
  const len = Math.hypot(dx, dy);
  if (len > maxR) {
    dx = (dx / len) * maxR;
    dy = (dy / len) * maxR;
  }
  joy.x = dx / maxR;
  joy.y = dy / maxR;
  if (el.joyKnob) el.joyKnob.style.transform = `translate(${dx}px, ${dy}px)`;
}

function bindTouchControls() {
  const pad = el.joyPad;
  const look = el.lookPad;
  pad?.addEventListener("pointerdown", (e) => {
    if (!playing || paused || introCameraActive) return;
    e.preventDefault();
    e.stopPropagation();
    joy.id = e.pointerId;
    const rect = pad.getBoundingClientRect();
    joy.ox = rect.left + rect.width * 0.5;
    joy.oy = rect.top + rect.height * 0.5;
    pad.setPointerCapture?.(e.pointerId);
    updateJoyFromEvent(e);
  });
  const endJoy = (e) => {
    if (joy.id !== e.pointerId) return;
    joy.id = null;
    joy.x = 0;
    joy.y = 0;
    if (el.joyKnob) el.joyKnob.style.transform = "translate(0px, 0px)";
  };
  pad?.addEventListener("pointerup", endJoy);
  pad?.addEventListener("pointercancel", endJoy);

  look?.addEventListener("pointerdown", (e) => {
    if (!playing || paused || introCameraActive) return;
    e.preventDefault();
    lookTouch.id = e.pointerId;
    lookTouch.x = e.clientX;
    lookTouch.y = e.clientY;
    look.setPointerCapture?.(e.pointerId);
  });
  const endLook = (e) => {
    if (lookTouch.id !== e.pointerId) return;
    lookTouch.id = null;
  };
  look?.addEventListener("pointerup", endLook);
  look?.addEventListener("pointercancel", endLook);

  el.touchFire?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    touchFireHeld = true;
    el.touchFire.classList.add("held");
    el.touchFire.setPointerCapture?.(e.pointerId);
  });
  const endFire = () => {
    touchFireHeld = false;
    el.touchFire?.classList.remove("held");
  };
  el.touchFire?.addEventListener("pointerup", endFire);
  el.touchFire?.addEventListener("pointercancel", endFire);

  el.touchMelee?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    tryMelee();
  });
  el.touchFlash?.addEventListener("pointerdown", (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFlashlight();
  });
  el.touchPause?.addEventListener("click", (e) => {
    e.preventDefault();
    if (playing && !introCameraActive) setPaused(true);
  });
}

window.addEventListener(
  "touchstart",
  () => {
    preferTouchUi = true;
    syncTouchUi();
  },
  { passive: true }
);
window.addEventListener(
  "touchmove",
  (e) => {
    if (playing && !paused && !el.gameOverOverlay?.classList.contains("visible")) {
      e.preventDefault();
    }
  },
  { passive: false }
);
document.addEventListener("gesturestart", (e) => e.preventDefault());
document.addEventListener("contextmenu", (e) => {
  if (playing) e.preventDefault();
});

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
  flashlightBattery = FLASH_BAT_MAX;
  flashlightLowWarned = false;
}

function flashlightPower() {
  if (!flashlightOn) return 0;
  const pct = THREE.MathUtils.clamp(flashlightBattery / FLASH_BAT_MAX, 0, 1);
  if (pct >= 0.2) return 1;
  return THREE.MathUtils.smoothstep(0.02, 0.2, pct);
}

function updateFlashlight(dt) {
  if (!playing || paused) return;
  if (!flashlightOn) return;
  if (nightBlend < 0.12) return;
  flashlightBattery = Math.max(0, flashlightBattery - dt * FLASH_DRAIN_PER_SEC);
  if (flashlightBattery <= 0.001) {
    flashlightOn = false;
    showToast("Battery dead — you are blind", 1.6);
    return;
  }
  if (!flashlightLowWarned && flashlightBattery / FLASH_BAT_MAX <= 0.2) {
    flashlightLowWarned = true;
    showToast("Battery low", 1.2);
  }
}

function initAmmoForRun() {
  const d = diffCfg();
  ammoState.pistol.cur = d.pistolStart[0];
  ammoState.pistol.max = d.pistolStart[1];
  ammoState.shotgun.cur = d.shotgunStart[0];
  ammoState.shotgun.max = d.shotgunStart[1];
  ammoState.smg.cur = d.smgStart[0];
  ammoState.smg.max = d.smgStart[1];
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

function spawnGateKeyPickup() {
  spawnScatteredKeys();
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
function spawnPickup(kind, nearX, nearZ, spread = 14, force = false) {
  if (!force && pickups.length >= diffCfg().pickupMax) return;
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
  if (isCasual()) {
    if (r < 0.2) return "ammoPistol";
    if (r < 0.32) return "ammoShotgun";
    if (r < 0.42) return "ammoSmg";
    if (r < 0.5) return "rapidFire";
    if (r < 0.58) return "autoAim";
    if (r < 0.66) return "medKit";
    if (r < 0.74) return "battery";
    if (r < 0.82) return "weaponShotgun";
    if (r < 0.9) return "weaponSmg";
    return "weaponPistol";
  }
  if (r < 0.09) return "ammoPistol";
  if (r < 0.14) return "ammoShotgun";
  if (r < 0.18) return "ammoSmg";
  if (r < 0.26) return "battery";
  if (r < 0.34) return "medKit";
  if (r < 0.4) return "autoAim";
  if (r < 0.46) return "rapidFire";
  if (r < 0.5) return "weaponShotgun";
  if (r < 0.54) return "weaponSmg";
  return "weaponPistol";
}

function maybeDropPickupFromKill(zx, zz) {
  if (Math.random() > diffCfg().killDropChance) return;
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
        keysCollected = Math.min(KEYS_NEEDED, keysCollected + 1);
        const keyQueue = Math.round((2 + keysCollected * 2) * diffCfg().keySpawnQueueMul);
        spawnQueue += Math.max(1, keyQueue);
        if (keysCollected >= KEYS_NEEDED) {
          gateUnlocked = true;
          showToast("All keys — west gate is open. The woods go feral.", 2.8);
        } else {
          showToast(`Key ${keysCollected}/${KEYS_NEEDED} — nights get worse`, 1.8);
        }
        if (isNightHorde() && hordeEverStarted) {
          spawnDelay = Math.min(spawnDelay, 0.08);
        }
      } else if (p.kind === "ammoPistol") {
        addAmmo("pistol", diffCfg().ammoPickup.pistol);
      } else if (p.kind === "ammoShotgun") {
        addAmmo("shotgun", diffCfg().ammoPickup.shotgun);
      } else if (p.kind === "ammoSmg") {
        addAmmo("smg", diffCfg().ammoPickup.smg);
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
scene.add(barrelsGroup);
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
const barrelBodyGeo = new THREE.CylinderGeometry(0.62, 0.62, 1.05, 14);
const barrelBandGeo = new THREE.TorusGeometry(0.62, 0.05, 6, 20);
const BARREL_TARGET = 26;
const BARREL_MIN_SEP = 22;
const BARREL_FORGET_DIST = 72;
const BARREL_PLAYER_CLEAR = 88;
const BARREL_RESPAWN_MIN = 4;
const BARREL_RESPAWN_MAX = 10;
/** @type {{ x: number, z: number }[]} */
const recentBarrelSpots = [];
/** @type {{ t: number, avoid: { x: number, z: number } }[]} */
const barrelRespawnQueue = [];

function rememberBrokenBarrelSpot(x, z) {
  recentBarrelSpots.push({ x, z });
  if (recentBarrelSpots.length > 80) recentBarrelSpots.shift();
}

function barrelSpotBlocked(x, z, extraAvoid) {
  if (x * x + z * z < 900) return true;
  if (Math.hypot(x - EXTRACT_PORTAL_POS.x, z - EXTRACT_PORTAL_POS.z) < 26) return true;
  if (x > GATE_LINE_X - 4 && x < GATE_LINE_X + 6 && Math.abs(z) < 58) return true;
  if (!isClearOfTrees(x, z, 2.15)) return true;
  if (playing) {
    if (Math.hypot(x - playerGroup.position.x, z - playerGroup.position.z) < BARREL_PLAYER_CLEAR) return true;
  }
  for (const b of barrels) {
    if (Math.hypot(b.x - x, b.z - z) < BARREL_MIN_SEP) return true;
  }
  for (const p of recentBarrelSpots) {
    if (Math.hypot(p.x - x, p.z - z) < BARREL_FORGET_DIST) return true;
  }
  if (extraAvoid && Math.hypot(extraAvoid.x - x, extraAvoid.z - z) < BARREL_FORGET_DIST) return true;
  return false;
}

function pickRandomBarrelSpot(extraAvoid = null) {
  const px = playing ? playerGroup.position.x : 0;
  const pz = playing ? playerGroup.position.z : 0;
  for (let i = 0; i < 110; i++) {
    const ang = Math.random() * Math.PI * 2;
    const d = BARREL_PLAYER_CLEAR + 12 + Math.random() * 240;
    const x = THREE.MathUtils.clamp(px + Math.cos(ang) * d, -WORLD_LIMIT + 12, WORLD_LIMIT - 12);
    const z = THREE.MathUtils.clamp(pz + Math.sin(ang) * d, -WORLD_LIMIT + 12, WORLD_LIMIT - 12);
    if (barrelSpotBlocked(x, z, extraAvoid)) continue;
    return { x, z };
  }
  for (let i = 0; i < 80; i++) {
    const x = THREE.MathUtils.clamp(
      (Math.random() - 0.5) * WORLD_LIMIT * 1.85,
      -WORLD_LIMIT + 12,
      WORLD_LIMIT - 12
    );
    const z = THREE.MathUtils.clamp(
      (Math.random() - 0.5) * WORLD_LIMIT * 1.85,
      -WORLD_LIMIT + 12,
      WORLD_LIMIT - 12
    );
    if (barrelSpotBlocked(x, z, extraAvoid)) continue;
    return { x, z };
  }
  return null;
}

function spawnBarrelAt(x, z) {
  const y = terrainHeightAt(x, z);
  const m = new THREE.Mesh(barrelBodyGeo, barrelMat);
  m.position.set(x, y + 0.52, z);
  m.castShadow = true;
  m.receiveShadow = true;
  const band = new THREE.Mesh(barrelBandGeo, barrelBandMat);
  band.rotation.x = Math.PI / 2;
  band.position.copy(m.position);
  band.position.y += 0.12;
  barrelsGroup.add(m);
  barrelsGroup.add(band);
  const c = { x, z, r: 1.35 };
  treeColliders.push(c);
  barrels.push({ mesh: m, band, x, z, collider: c, broken: false });
}

function trySpawnBarrel(extraAvoid = null) {
  const p = pickRandomBarrelSpot(extraAvoid);
  if (!p) return false;
  spawnBarrelAt(p.x, p.z);
  return true;
}

function clearBarrels() {
  for (const b of barrels) {
    b.mesh.parent?.remove(b.mesh);
    b.band.parent?.remove(b.band);
    const i = treeColliders.indexOf(b.collider);
    if (i >= 0) treeColliders.splice(i, 1);
  }
  barrels.length = 0;
  barrelRespawnQueue.length = 0;
  recentBarrelSpots.length = 0;
}

function seedBarrels() {
  clearBarrels();
  let guard = 0;
  while (barrels.length < BARREL_TARGET && guard++ < 500) {
    trySpawnBarrel(null);
  }
}

function maybeBarrelDropKind() {
  const r = Math.random();
  if (r < 0.34) return "battery";
  if (r < 0.58) return "ammoPistol";
  if (r < 0.7) return "ammoShotgun";
  if (r < 0.82) return "ammoSmg";
  return "medKit";
}

function breakBarrel(b) {
  if (b.broken) return false;
  b.broken = true;
  const avoid = { x: b.x, z: b.z };
  const ci = treeColliders.indexOf(b.collider);
  if (ci >= 0) treeColliders.splice(ci, 1);
  b.mesh.parent?.remove(b.mesh);
  b.band.parent?.remove(b.band);
  const bi = barrels.indexOf(b);
  if (bi >= 0) barrels.splice(bi, 1);
  spawnPickup(maybeBarrelDropKind(), avoid.x, avoid.z, 0, true);
  rememberBrokenBarrelSpot(avoid.x, avoid.z);
  barrelRespawnQueue.push({
    t: BARREL_RESPAWN_MIN + Math.random() * (BARREL_RESPAWN_MAX - BARREL_RESPAWN_MIN),
    avoid,
  });
  return true;
}

function updateBarrels(dt) {
  if (!playing || paused) return;
  for (let i = barrelRespawnQueue.length - 1; i >= 0; i--) {
    barrelRespawnQueue[i].t -= dt;
    if (barrelRespawnQueue[i].t > 0) continue;
    const job = barrelRespawnQueue.splice(i, 1)[0];
    if (!trySpawnBarrel(job.avoid)) {
      barrelRespawnQueue.push({ t: 2.2 + Math.random() * 2, avoid: job.avoid });
    }
  }
}

seedBarrels();

function resolveMeleeHit() {
  const px = playerGroup.position.x;
  const pz = playerGroup.position.z;
  playerLookForward(tmpV);
  const fx = tmpV.x;
  const fz = tmpV.z;

  for (const b of barrels) {
    if (b.broken) continue;
    const dx = b.x - px;
    const dz = b.z - pz;
    const dist = Math.hypot(dx, dz);
    if (dist > MELEE_RANGE || dist < 1e-6) continue;
    const toward = (dx / dist) * fx + (dz / dist) * fz;
    if (toward < MELEE_CONE_DOT && dist > 1.35) continue;
    if (breakBarrel(b)) {
      showToast("Barrel smashed", 0.9);
      return;
    }
  }

  for (let j = zombies.length - 1; j >= 0; j--) {
    const z = zombies[j];
    const dx = z.mesh.position.x - px;
    const dz = z.mesh.position.z - pz;
    const dist = Math.hypot(dx, dz);
    const reach = MELEE_RANGE + (z.isBoss ? 0.45 : 0);
    if (dist > reach || dist < 1e-6) continue;
    const toward = (dx / dist) * fx + (dz / dist) * fz;
    if (toward < MELEE_CONE_DOT) continue;
    z.hp -= z.isBoss ? MELEE_ZOMBIE_DAMAGE * 0.72 : MELEE_ZOMBIE_DAMAGE;
    z.mesh.position.x += fx * 1.35;
    z.mesh.position.z += fz * 1.35;
    if (z.hp <= 0) {
      spawnBloodDecal(z.mesh.position.x, z.mesh.position.z);
      maybeDropPickupFromKill(z.mesh.position.x, z.mesh.position.z);
      scene.remove(z.mesh);
      zombies.splice(j, 1);
      kills += 1;
      showToast("Melee kill", 0.85);
    } else {
      spawnBloodDecal(z.mesh.position.x, z.mesh.position.z);
      showToast("Melee hit", 0.7);
    }
    return;
  }
}

function meleeCamRoll() {
  if (meleeAnim <= 0) return 0;
  const k = 1 - meleeAnim;
  if (k < MELEE_WIND) return -k * 0.08;
  if (k < 0.42) return THREE.MathUtils.lerp(-0.08, 0.22, (k - MELEE_WIND) / 0.2);
  return THREE.MathUtils.lerp(0.22, 0, (k - 0.42) / 0.58);
}

function applyMeleePose(dt) {
  const fp = cameraPerson === "first";
  if (meleeAnim <= 0) {
    playerArmR.position.set(0.28, 1.34, 0);
    playerArmR.rotation.set(ARM_R_REST_X, 0, ARM_R_REST_Z);
    playerTorso.rotation.y = 0;
    if (fp) playerArmR.visible = false;
    return;
  }
  const prev = meleeAnim;
  meleeAnim = Math.max(0, meleeAnim - dt / 0.5);
  if (meleeHitArmed && prev >= 0.68 && meleeAnim < 0.68) {
    meleeHitArmed = false;
    resolveMeleeHit();
  }
  const k = 1 - meleeAnim;
  if (fp) {
    playerArmR.position.set(0.38, 1.5, 0.32);
  } else {
    playerArmR.position.set(0.28, 1.34, 0);
  }
  if (k < MELEE_WIND) {
    const w = k / MELEE_WIND;
    const e = w * w;
    playerArmR.rotation.x = ARM_R_REST_X - e * (fp ? 1.55 : 1.25);
    playerArmR.rotation.y = -e * (fp ? 1.15 : 0.85);
    playerArmR.rotation.z = ARM_R_REST_Z + e * (fp ? 0.85 : 0.55);
    playerTorso.rotation.y = -e * 0.55;
  } else if (k < 0.42) {
    const w = (k - MELEE_WIND) / 0.2;
    const e = w * w * (3 - 2 * w);
    playerArmR.rotation.x = ARM_R_REST_X - (fp ? 1.55 : 1.25) + e * (fp ? 3.05 : 2.55);
    playerArmR.rotation.y = -(fp ? 1.15 : 0.85) + e * (fp ? 2.05 : 1.55);
    playerArmR.rotation.z = ARM_R_REST_Z + (fp ? 0.85 : 0.55) - e * (fp ? 1.35 : 0.95);
    playerTorso.rotation.y = -0.55 + e * 1.35;
  } else {
    const w = THREE.MathUtils.clamp((k - 0.42) / 0.58, 0, 1);
    const e = 1 - (1 - w) * (1 - w);
    playerArmR.rotation.x = THREE.MathUtils.lerp(fp ? 1.5 : 1.3, ARM_R_REST_X, e);
    playerArmR.rotation.y = THREE.MathUtils.lerp(fp ? 0.9 : 0.7, 0, e);
    playerArmR.rotation.z = THREE.MathUtils.lerp(ARM_R_REST_Z - (fp ? 0.55 : 0.4), ARM_R_REST_Z, e);
    playerTorso.rotation.y = THREE.MathUtils.lerp(0.8, 0, e);
  }
  if (fp) playerArmR.visible = meleeAnim > 0.02;
}

function tryMelee() {
  if (!playing || introCameraActive || paused) return;
  if (meleeCd > 0) return;
  meleeCd = MELEE_CD_SEC;
  meleeAnim = 1;
  meleeHitArmed = true;
}

function buildZombieGroup(isBoss) {
  let mat;
  if (isBoss) {
    mat = bossZombieMat;
  } else {
    mat = zombieMat.clone();
    const hue = 0.18 + Math.random() * 0.14;
    const sat = 0.28 + Math.random() * 0.32;
    const light = 0.22 + Math.random() * 0.18;
    mat.color.setHSL(hue, sat, light);
    mat.emissive.setHSL(hue, 0.4, 0.04 + Math.random() * 0.06);
  }
  const cloth = mat.clone();
  cloth.color.multiplyScalar(0.72);
  const g = new THREE.Group();
  if (isBoss) {
    g.scale.setScalar(1.42);
  }

  const rad = GEO_RAD;
  const cap = GEO_CAP;

  const legL = new THREE.Group();
  legL.position.set(-0.12, 0.88, 0.02);
  const thighL = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.26, cap, rad), mat);
  thighL.position.y = -0.18;
  thighL.castShadow = true;
  legL.add(thighL);
  const shinL = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.24, cap, rad), mat);
  shinL.position.set(0.01, -0.48, 0.04);
  shinL.rotation.x = 0.12;
  shinL.castShadow = true;
  legL.add(shinL);
  g.add(legL);

  const legR = new THREE.Group();
  legR.position.set(0.12, 0.88, -0.02);
  const thighR = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.26, cap, rad), mat);
  thighR.position.y = -0.18;
  thighR.castShadow = true;
  legR.add(thighR);
  const shinR = new THREE.Mesh(new THREE.CapsuleGeometry(0.058, 0.24, cap, rad), mat);
  shinR.position.set(-0.01, -0.48, 0.02);
  shinR.rotation.x = -0.08;
  shinR.castShadow = true;
  legR.add(shinR);
  g.add(legR);

  const torso = new THREE.Group();
  torso.rotation.x = 0.18;
  g.add(torso);

  const zBody = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.38, cap, rad), cloth);
  zBody.position.y = 1.16;
  zBody.castShadow = true;
  zBody.receiveShadow = true;
  torso.add(zBody);

  const armL = new THREE.Group();
  armL.position.set(-0.26, 1.32, 0.04);
  armL.rotation.z = 0.35;
  armL.rotation.x = 0.4;
  const upperL = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.2, cap, rad), cloth);
  upperL.position.y = -0.14;
  upperL.castShadow = true;
  armL.add(upperL);
  const lowerL = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.22, cap, rad), mat);
  lowerL.position.y = -0.38;
  lowerL.castShadow = true;
  armL.add(lowerL);
  torso.add(armL);

  const armR = new THREE.Group();
  armR.position.set(0.26, 1.3, 0.02);
  armR.rotation.z = -0.28;
  armR.rotation.x = -0.55;
  const upperR = new THREE.Mesh(new THREE.CapsuleGeometry(0.048, 0.2, cap, rad), cloth);
  upperR.position.y = -0.14;
  upperR.castShadow = true;
  armR.add(upperR);
  const lowerR = new THREE.Mesh(new THREE.CapsuleGeometry(0.042, 0.22, cap, rad), mat);
  lowerR.position.y = -0.38;
  lowerR.castShadow = true;
  armR.add(lowerR);
  torso.add(armR);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.1, rad), mat);
  neck.position.y = 1.4;
  torso.add(neck);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, rad + 2, rad), mat);
  head.scale.set(0.95, 1.12, 1.05);
  head.position.set(0.02, 1.56, 0.06);
  head.rotation.x = 0.2;
  head.castShadow = true;
  torso.add(head);

  const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.05, 0.1), mat);
  jaw.position.set(0.02, 1.46, 0.14);
  jaw.rotation.x = 0.35;
  torso.add(jaw);

  const le = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), zombieEyes);
  le.position.set(-0.06, 1.6, 0.16);
  torso.add(le);
  const re = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), zombieEyes);
  re.position.set(0.08, 1.6, 0.15);
  torso.add(re);

  if (isBoss) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.22, 8), mat);
    horn.position.set(0, 1.82, 0.02);
    horn.rotation.x = -0.4;
    horn.castShadow = true;
    torso.add(horn);
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.12, rad, 8), cloth);
    shoulder.position.set(0.22, 1.38, -0.02);
    torso.add(shoulder);
  }

  g.userData.rig = { legL, legR, torso, armL, armR };
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

  const k = keysCollected;
  const d = diffCfg();
  const hp = Math.max(3, Math.round((6 + Math.floor(wave * 1.75) + Math.floor(wave / 2) + k * 4) * d.zombieHpMul));
  const speed = (2.55 + wave * 0.18 + k * 0.45 + Math.random() * 0.35) * d.zombieSpeedMul;
  zombies.push({
    mesh: g,
    hp,
    speed,
    touchCd: 0,
    isBoss: false,
    hitRadius: 0.72,
    hitY: 1.12,
    dmgPlayer: Math.max(4, Math.round((10 + k * 2) * d.zombieDmgMul)),
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
  const k = keysCollected;
  const d = diffCfg();
  const hp = Math.max(20, Math.round((52 + wave * 14 + k * 18) * d.zombieHpMul));
  const speed = (2.0 + wave * 0.1 + k * 0.22) * d.zombieSpeedMul;
  zombies.push({
    mesh: g,
    hp,
    speed,
    touchCd: 0,
    isBoss: true,
    hitRadius: 1.12,
    hitY: 1.22,
    dmgPlayer: Math.max(8, Math.round((18 + k * 3) * d.zombieDmgMul)),
  });
}

function zombiesForWave(w) {
  return Math.max(2, Math.round((2 + Math.floor(w * 0.85) + keysCollected * 3) * diffCfg().zombieWaveMul));
}

function applyCharacterFromForm() {
  if (!el.playerColor || !body.material) return;
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
    return localStorage.getItem(CAM_PREF_KEY) === "third" ? "third" : "first";
  } catch {
    return "first";
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
  playerHead.visible = !fp;
  playerArmL.visible = !fp;
  playerArmR.visible = !fp;
  playerLegL.visible = !fp;
  playerLegR.visible = !fp;
  playerCollar.visible = !fp;
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
  syncTouchUi();
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
    camera.rotation.x = lookPitch;
    camera.rotation.z = meleeCamRoll();
  } else {
    computeThirdPersonCameraPosition(thirdCamPos, camLookTmp);
    camera.position.copy(thirdCamPos);
    camera.lookAt(camLookTmp);
  }
}

function menuDefaults() {
  if (el.playerColor) el.playerColor.value = "#5a7ec8";
  if (el.playerSpeed) el.playerSpeed.value = "11";
  if (el.playerSpeedVal) el.playerSpeedVal.textContent = "11";
  applyCharacterFromForm();
}

function readDifficultyFromLauncher() {
  gameDifficulty = el.diffCasual?.checked ? "casual" : "survival";
  try {
    localStorage.setItem(DIFF_PREF_KEY, gameDifficulty);
  } catch {
    /* ignore */
  }
  syncDifficultyDesc();
}

function loadDifficultyPref() {
  try {
    const v = localStorage.getItem(DIFF_PREF_KEY);
    if (v === "casual" || v === "survival") gameDifficulty = v;
  } catch {
    /* ignore */
  }
  syncDifficultyRadiosFromGame();
}

function syncDifficultyRadiosFromGame() {
  if (el.diffCasual) el.diffCasual.checked = gameDifficulty === "casual";
  if (el.diffSurvival) el.diffSurvival.checked = gameDifficulty === "survival";
  syncDifficultyDesc();
}

function syncDifficultyDesc() {
  if (!el.diffDesc) return;
  el.diffDesc.textContent = isCasual()
    ? "Casual: generous ammo, frequent drops, softer hits — hordes lean into action."
    : "Survival: scarce ammo, brutal nights, keys make each wave worse.";
}

function endRun(title, stats) {
  playing = false;
  paused = false;
  if (el.pauseOverlay) el.pauseOverlay.classList.remove("visible");
  document.exitPointerLock?.();
  if (el.gameOverTitle) el.gameOverTitle.textContent = title;
  el.gameOverStats.textContent = stats;
  el.gameOverOverlay.classList.add("visible");
  syncTouchUi();
}

function gameOver() {
  endRun(
    "That run’s over",
    `${difficultyLabel()} — wave ${wave}, ${kills} kills. ${isCasual() ? "Reload for another action run." : "Not bad — next run can go further."}`
  );
}

function winExtract() {
  endRun(
    "You extracted",
    `${difficultyLabel()} — out on wave ${wave} with ${kills} kills.`
  );
}

function checkExtractPortalEntry() {
  const dx = playerGroup.position.x - EXTRACT_PORTAL_POS.x;
  const dz = playerGroup.position.z - EXTRACT_PORTAL_POS.z;
  if (dx * dx + dz * dz < EXTRACT_PORTAL_POS.enterRadius * EXTRACT_PORTAL_POS.enterRadius) {
    if (!gateUnlocked) {
      showToast("Collect all four keys — extract is locked off", 2.5);
      return;
    }
    winExtract();
  }
}

function beginWave() {
  spawnQueue = zombiesForWave(wave);
  if (isBossWave(wave) || keysCollected >= 3) {
    spawnQueue = Math.max(2, spawnQueue - 2);
    spawnBoss();
    if (keysCollected >= 4) spawnBoss();
  }
  spawnDelay = 0.15;
  waveClearTimer = 0;
  el.wave.textContent = String(wave);
}

function resetGame(quickRestart = false) {
  if (!quickRestart) readDifficultyFromLauncher();
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
  seedBarrels();
  playerGroup.position.set(0, 0, 0);
  playerGroup.rotation.y = Math.PI;
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
  gameTime = DAY_CYCLE_SEC * 0.28;
  try {
    if (new URLSearchParams(location.search).has("night")) {
      gameTime = DAY_CYCLE_SEC * 0.62;
    }
  } catch {
    /* ignore */
  }
  nightBlend = 0.08;
  skyPhaseLabel = "Afternoon";
  currentWeapon = "pistol";
  spawnQueue = 0;
  waveClearTimer = 0;
  spawnDelay = 0;
  keysCollected = 0;
  hordeWasNight = false;
  hordeEverStarted = false;
  cameraYaw = 0;
  orbitPitch = THREE.MathUtils.degToRad(24);
  lookPitch = 0;
  meleeCd = 0;
  meleeAnim = 0;
  initAmmoForRun();
  initFlashlightForRun();
  applyCharacterFromForm();
  el.gameOverOverlay.classList.remove("visible");
  if (el.gameOverTitle) el.gameOverTitle.textContent = "That run’s over";
  paused = false;
  if (el.pauseOverlay) el.pauseOverlay.classList.remove("visible");
  if (el.launcherBar) el.launcherBar.classList.add("hidden");
  spawnScatteredKeys();
  syncExtractPortalWorldHeight();
  const skipIntro = quickRestart || useTouchControls();
  if (skipIntro) {
    introCameraActive = false;
    introCameraT = 0;
    playing = true;
    snapGameplayCamera();
    if (!useTouchControls()) canvas.requestPointerLock?.();
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
  syncTouchUi();
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
      const low = flashlightOn && pct <= 20 ? " · LOW" : "";
      el.flashText.textContent = `${flashlightOn ? "ON" : "OFF"} · ${THREE.MathUtils.clamp(pct, 0, 100)}%${low}`;
    }
  }
  if (el.objectiveText) {
    if (!playing) {
      el.objectiveText.textContent = `Find ${KEYS_NEEDED} keys. Each key makes the nights worse. Extract west.`;
    } else {
      const keyLine = gateUnlocked ? "Gate open" : `Keys ${keysCollected}/${KEYS_NEEDED}`;
      el.objectiveText.textContent = `${difficultyLabel()} — ${keyLine} — Extract west`;
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
  el.dayNightLabel.textContent = playing ? skyPhaseLabel : "Sky cycle — day into night";
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
  if (e.pointerType === "touch") return;
  if (e.button !== 0) return;
  if (e.target === canvas) mouseDown = true;
});
window.addEventListener("pointerup", (e) => {
  if (e.button === 0) mouseDown = false;
});
window.addEventListener("pointercancel", () => {
  mouseDown = false;
});

function fitViewOnResize() {
  fitRenderer();
  syncTouchUi();
}
window.addEventListener("resize", fitViewOnResize);
window.visualViewport?.addEventListener("resize", fitViewOnResize);
window.visualViewport?.addEventListener("scroll", fitViewOnResize);

function setAimRayNdc() {
  if (document.pointerLockElement === canvas || useTouchControls()) {
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
  const hit = raycaster.ray.intersectPlane(groundPlane, aimHit);
  if (hit) {
    shootDir.subVectors(aimHit, playerGroup.position);
    shootDir.y = 0;
    if (shootDir.lengthSq() >= 0.0001) {
      shootDir.normalize();
      return true;
    }
  }
  playerLookForward(shootDir);
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
let ignoreLookUntil = 0;
document.addEventListener("pointerlockchange", () => {
  if (document.pointerLockElement === canvas) ignoreLookUntil = performance.now() + 90;
});
window.addEventListener("pointermove", (e) => {
  pointerX = e.clientX;
  pointerY = e.clientY;
  if (lookTouch.id === e.pointerId) {
    applyLookDelta(e.clientX - lookTouch.x, e.clientY - lookTouch.y, CAM_TOUCH_SENS);
    lookTouch.x = e.clientX;
    lookTouch.y = e.clientY;
    return;
  }
  if (joy.id === e.pointerId) {
    updateJoyFromEvent(e);
    return;
  }
  if (!(playing && !introCameraActive && !paused && document.pointerLockElement === canvas)) return;
  if (performance.now() < ignoreLookUntil) return;
  applyLookDelta(e.movementX, e.movementY, CAM_MOUSE_SENS);
});

canvas.addEventListener("click", () => {
  if (useTouchControls()) return;
  if (playing && !introCameraActive && !paused && document.pointerLockElement !== canvas) {
    canvas.requestPointerLock?.();
  }
});

function updatePlayer(dt, nightForTorch) {
  playerLookForward(camMoveFwd);
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
  if (joy.id != null || Math.hypot(joy.x, joy.y) > 0.08) {
    const jlen = Math.hypot(joy.x, joy.y);
    if (jlen > 0.08) {
      const jx = joy.x / jlen;
      const jy = joy.y / jlen;
      const mag = Math.min(1, jlen);
      mx += (-jy * camMoveFwd.x + jx * camMoveRight.x) * mag;
      mz += (-jy * camMoveFwd.z + jx * camMoveRight.z) * mag;
    }
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
  applyMeleePose(dt);

  if (cameraPerson === "first") {
    if (autoAimTime > 0) {
      const z = getNearestZombie(AUTO_AIM_RANGE);
      if (z) {
        tmpV.set(z.mesh.position.x - playerGroup.position.x, 0, z.mesh.position.z - playerGroup.position.z);
        if (tmpV.lengthSq() > 1e-6) {
          const targetY = Math.atan2(-tmpV.x, -tmpV.z);
          let delta = targetY - cameraYaw;
          while (delta > Math.PI) delta -= Math.PI * 2;
          while (delta < -Math.PI) delta += Math.PI * 2;
          cameraYaw += delta * (1 - Math.exp(-dt * 14));
        }
      }
    }
    playerGroup.rotation.y = cameraYaw + Math.PI;
    camera.position.set(
      playerGroup.position.x,
      playerGroup.position.y + FP_EYE_Y,
      playerGroup.position.z
    );
    camera.up.set(0, 1, 0);
    camera.rotation.order = "YXZ";
    camera.rotation.y = cameraYaw;
    camera.rotation.x = lookPitch;
    camera.rotation.z = meleeCamRoll();
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

  syncFlashlightRig(nightForTorch);

  if (torchFlameMesh) {
    const nightK = Math.max(THREE.MathUtils.clamp(nightForTorch, 0, 1), deepNightBlend);
    const power = flashlightPower();
    const beamOn = flashlightOn && power > 0.02 && (nightK > 0.05 || deepNightBlend > 0.02);
    const fp = cameraPerson === "first";
    torchFlameMesh.visible = beamOn && !fp;
    if (beamOn) {
      torchFlameMesh.material.emissiveIntensity = 1.4 + Math.sin(flickerT * 18) * 0.7;
      torchFlameMesh.scale.setScalar(0.9 + 0.45 * power);
    }
  }
}

function syncFlashlightRig(nightForTorch) {
  const nightK = Math.max(
    THREE.MathUtils.clamp(nightForTorch, 0, 1),
    deepNightBlend
  );
  const power = flashlightPower();
  const batPct = THREE.MathUtils.clamp(flashlightBattery / FLASH_BAT_MAX, 0, 1);
  const beamOn = flashlightOn && power > 0.02 && (nightK > 0.05 || deepNightBlend > 0.02);
  const flicker =
    1 +
    Math.sin(flickerT * 37) * 0.04 * nightK +
    (batPct < 0.2 ? (Math.sin(flickerT * 63) * 0.5 + 0.5) * 0.22 : 0);
  const beamK = beamOn ? power * flicker : 0;
  const fp = cameraPerson === "first";

  if (fp) {
    flashRig.visible = true;
    flashRig.position.copy(camera.position);
    flashRig.quaternion.copy(camera.quaternion);
    if (playerTorchPoint.parent !== flashRig) {
      scene.remove(playerTorchPoint);
      flashRig.add(playerTorchPoint);
    }
    playerTorchPoint.position.set(0, 0, -0.55);
    playerTorchSpot.intensity = beamOn ? 900 * beamK * THREE.MathUtils.lerp(0.6, 1, nightK) : 0;
    playerTorchSpot.distance = FLASH_HARD_CUT;
    playerTorchSpot.angle = 0.46;
    playerTorchSpot.penumbra = 0.3;
    playerTorchSpot.decay = 1;
    playerTorchPoint.intensity = beamOn ? 55 * beamK * nightK : 0;
    playerTorchPoint.distance = 4.2;
    playerTorchPoint.decay = 1.1;
    playerTorchSpot.visible = beamOn;
    playerTorchPoint.visible = beamOn;
  } else {
    flashRig.visible = false;
    playerTorchSpot.intensity = 0;
    playerTorchSpot.visible = false;
    if (playerTorchPoint.parent === flashRig) {
      flashRig.remove(playerTorchPoint);
      scene.add(playerTorchPoint);
    }
    playerTorchPoint.position.set(
      playerGroup.position.x,
      playerGroup.position.y + 1.15,
      playerGroup.position.z
    );
    playerTorchPoint.intensity = beamOn ? 95 * beamK * THREE.MathUtils.lerp(0.5, 1, nightK) : 0;
    playerTorchPoint.distance = FLASH_HARD_CUT;
    playerTorchPoint.decay = 0.9;
    playerTorchPoint.visible = beamOn;
  }
  flashRig.updateMatrixWorld(true);
  playerTorchSpot.target.updateMatrixWorld(true);
  playerTorchSpot.updateMatrixWorld(true);
}

function updateDayNight(dt) {
  if (playing && !paused) gameTime += dt;
  const cycle = playing
    ? ((gameTime % DAY_CYCLE_SEC) + DAY_CYCLE_SEC) % DAY_CYCLE_SEC
    : DAY_CYCLE_SEC * 0.28;
  const u = cycle / DAY_CYCLE_SEC;

  let night = 0;
  if (u < 0.12) {
    night = 1 - THREE.MathUtils.smoothstep(0, 0.12, u);
    skyPhaseLabel = u < 0.085 ? "Dawn" : "Morning";
  } else if (u < 0.32) {
    night = 0;
    skyPhaseLabel = u < 0.2 ? "Morning" : "Afternoon";
  } else if (u < 0.4) {
    night = THREE.MathUtils.smoothstep(0.32, 0.4, u);
    skyPhaseLabel = "Dusk";
  } else if (u < 0.88) {
    night = 1;
    skyPhaseLabel = u < 0.5 ? "Nightfall" : "Dead of night";
  } else {
    night = 1 - THREE.MathUtils.smoothstep(0.88, 1, u);
    skyPhaseLabel = "Predawn";
  }
  nightBlend = THREE.MathUtils.clamp(night, 0, 1);
  if (u >= 0.46 && u < 0.87) {
    deepNightBlend = u < 0.52 ? THREE.MathUtils.smoothstep(0.46, 0.52, u) : 1;
  } else if (u >= 0.87) {
    deepNightBlend = 1 - THREE.MathUtils.smoothstep(0.87, 0.94, u);
  } else {
    deepNightBlend = 0;
  }

  const tape = 1 + Math.sin(flickerT * 1.65) * 0.02 * nightBlend + Math.sin(flickerT * 31) * 0.004 * nightBlend;
  const duskAmt = THREE.MathUtils.clamp(1 - Math.abs(u - 0.36) / 0.07, 0, 1);
  const dawnAmt = THREE.MathUtils.clamp(1 - Math.abs(u - 0.06) / 0.09, 0, 1);

  skyWork.copy(skyDay).lerp(skyNight, nightBlend);
  skyWork.lerp(skyDusk, duskAmt * 0.28 * (1 - deepNightBlend));
  skyWork.lerp(skyDawn, dawnAmt * 0.35 * (1 - deepNightBlend));
  if (deepNightBlend > 0.65) skyWork.setRGB(0, 0, 0);
  else skyWork.lerp(skyNight, deepNightBlend * 0.88);
  if (!(scene.background instanceof THREE.Color)) scene.background = new THREE.Color();
  scene.background.copy(skyWork);
  renderer.setClearColor(skyWork, 1);

  if (deepNightBlend > 0.35) {
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1;
  } else {
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = THREE.MathUtils.lerp(1.12, 0.62, nightBlend);
  }

  const lightsOut = deepNightBlend > 0.08;
  ambient.visible = !lightsOut;
  hemi.visible = !lightsOut;
  fill.visible = !lightsOut;
  sick.visible = !lightsOut;
  playerLantern.visible = !lightsOut;
  moon.visible = !lightsOut;

  if (!lightsOut) {
    ambient.intensity = THREE.MathUtils.lerp(0.42, 0.06, nightBlend);
    ambient.color.setRGB(0.72, 0.78, 0.92);
    hemi.intensity = THREE.MathUtils.lerp(0.55, 0.12, nightBlend);
    hemi.color.set(0xc8d8f0);
    hemi.groundColor.set(0x3a3428);
    fill.intensity = THREE.MathUtils.lerp(0.22, 0.04, nightBlend);
    playerLantern.intensity = THREE.MathUtils.lerp(0.12, 0.02, nightBlend);
    sick.intensity = THREE.MathUtils.lerp(0.04, 0.01, nightBlend);
    const sunAng = u * Math.PI * 2;
    moon.position.set(Math.cos(sunAng) * 78, Math.sin(sunAng) * 86, 28);
    if (moon.position.y < 10) moon.position.y = 10 + (10 - moon.position.y) * 0.08;
    moon.intensity = THREE.MathUtils.lerp(1.15, 0.18, nightBlend);
    moon.color.set(0xfff0d2);
  } else {
    ambient.intensity = 0;
    hemi.intensity = 0;
    fill.intensity = 0;
    playerLantern.intensity = 0;
    sick.intensity = 0;
    moon.intensity = 0;
  }

  if (scene.fog instanceof THREE.FogExp2) {
    scene.fog.density = THREE.MathUtils.lerp(0.0058, 0.055, deepNightBlend) * tape;
    scene.fog.color.setRGB(0, 0, 0);
  }

  const gMul = THREE.MathUtils.lerp(1, 0.035, deepNightBlend);
  ground.material.vertexColors = deepNightBlend < 0.2;
  ground.material.color.setRGB(gMul, gMul * 0.9, gMul * 0.82);
  ground.material.needsUpdate = true;

  zombieEyes.color.setHex(deepNightBlend > 0.35 ? 0xff1a08 : 0x441010);
  foliageMat.color.setHex(deepNightBlend > 0.45 ? 0x010201 : 0x2d9a55);
  trunkMat.color.setHex(deepNightBlend > 0.45 ? 0x020101 : 0x3d2e22);

  if (el.vhsOverlay) {
    el.vhsOverlay.style.opacity = String(THREE.MathUtils.lerp(0.18, 0.78, deepNightBlend));
    el.vhsOverlay.classList.toggle("night", deepNightBlend > 0.55);
  }

  if (!playing) {
    playerTorchSpot.visible = false;
    playerTorchSpot.intensity = 0;
    playerTorchPoint.visible = false;
    playerTorchPoint.intensity = 0;
    if (torchFlameMesh) torchFlameMesh.visible = true;
  }

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
      if (rig.armL) rig.armL.rotation.x = 0.35 - Math.sin(ph) * amp * 0.7;
      if (rig.armR) rig.armR.rotation.x = -0.45 + Math.sin(ph) * amp * 0.7;
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
    for (const barrel of barrels) {
      const dxb = b.mesh.position.x - barrel.x;
      const dzb = b.mesh.position.z - barrel.z;
      const horizB = Math.hypot(dxb, dzb);
      const barrelY = terrainHeightAt(barrel.x, barrel.z) + 0.52;
      if (horizB < 1.2 && Math.abs(b.mesh.position.y - barrelY) < 1.15) {
        breakBarrel(barrel);
        scene.remove(b.mesh);
        bullets.splice(i, 1);
        showToast("Barrel smashed", 0.8);
        continue outer;
      }
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

function isNightHorde() {
  return deepNightBlend > 0.45;
}

function retreatZombies() {
  if (zombies.length === 0) return;
  spawnQueue += zombies.length;
  for (const z of zombies) scene.remove(z.mesh);
  zombies = [];
}

function updateWaves(dt) {
  if (!playing) return;
  const d = diffCfg();
  ambientPickupTimer -= dt;
  if (ambientPickupTimer <= 0 && pickups.length < d.ambientMax) {
    spawnPickup(randomPickupKind(), playerGroup.position.x, playerGroup.position.z, 36);
    const iv = d.ambientInterval;
    ambientPickupTimer = iv[0] + Math.random() * (iv[1] - iv[0]);
  }
  if (!isNightHorde()) {
    retreatZombies();
    hordeWasNight = false;
    return;
  }
  if (!hordeWasNight) {
    showToast("Night. The beam is all you have.", 2.6);
  }
  if (!hordeEverStarted) {
    beginWave();
    hordeEverStarted = true;
  }
  hordeWasNight = true;
  if (spawnQueue > 0) {
    spawnDelay -= dt;
    if (spawnDelay <= 0) {
      spawnZombie();
      spawnQueue -= 1;
      spawnDelay = Math.max(
        0.035,
        (0.2 - wave * 0.012 - keysCollected * 0.028) * diffCfg().spawnDelayMul
      );
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

  extractPortalGroup.rotation.y += dt * 0.88;
  updateGateAnimation(dt);

  if (playing && !introCameraActive && !paused) {
    fireCd -= dt;
    autoAimTime = Math.max(0, autoAimTime - dt);
    rapidFireTime = Math.max(0, rapidFireTime - dt);
    meleeCd = Math.max(0, meleeCd - dt);
    if (justPressed.has("KeyF")) toggleFlashlight();
    if (justPressed.has("KeyV")) tryMelee();
    if (mouseDown || touchFireHeld) tryShoot();
    updateFlashlight(dt);
    const nb = updateDayNight(dt);
    updatePlayer(dt, nb ?? nightBlend);
    updateZombies(dt);
    updateBullets(dt);
    updatePickups(dt);
    updateBarrels(dt);
    updateMuzzleFlashes(dt);
    updateBloodDecals(dt);
    updateWaves(dt);
    checkExtractPortalEntry();
    justPressed.clear();
  } else if (playing && introCameraActive) {
    if (!paused) {
      introCameraT += dt / INTRO_CAM_SEC;
      updateDayNight(dt);
    }
    const k = THREE.MathUtils.clamp(introCameraT, 0, 1);
    const ease = k * k * (3 - 2 * k);
    camera.position.lerpVectors(introCamFrom, introCamTo, ease);
    introLookCur.lerpVectors(introLookFrom, introLookTo, ease);
    camera.lookAt(introLookCur);
    if (introCameraT >= 1) {
      introCameraActive = false;
      playerGroup.rotation.y = Math.PI;
      cameraYaw = 0;
      snapGameplayCamera();
      syncTouchUi();
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
    syncFlashlightRig(nightBlend);
    justPressed.clear();
  } else {
    document.exitPointerLock?.();
    playerGroup.rotation.y += dt * 0.2;
    applyMenuCamera();
    updateDayNight(dt);
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
loadDifficultyPref();

applyCharacterFromForm();
if (el.playerSpeedVal && el.playerSpeed) el.playerSpeedVal.textContent = el.playerSpeed.value;
syncPauseRadiosFromGame();
syncCameraFovAndRig();

el.launcherPlay?.addEventListener("click", () => resetGame(false));
el.restartBtn.addEventListener("click", () => resetGame(true));
el.diffCasual?.addEventListener("change", () => {
  if (el.diffCasual.checked) {
    gameDifficulty = "casual";
    try {
      localStorage.setItem(DIFF_PREF_KEY, "casual");
    } catch {
      /* ignore */
    }
    syncDifficultyDesc();
  }
});
el.diffSurvival?.addEventListener("change", () => {
  if (el.diffSurvival.checked) {
    gameDifficulty = "survival";
    try {
      localStorage.setItem(DIFF_PREF_KEY, "survival");
    } catch {
      /* ignore */
    }
    syncDifficultyDesc();
  }
});
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
bindTouchControls();
syncTouchUi();

requestAnimationFrame(frame);
