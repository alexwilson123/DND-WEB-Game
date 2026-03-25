const MAP_TEMPLATE = [
  "#############",
  "#S..g....#..#",
  "#.###.##.#m.#",
  "#...#....#..#",
  "###.#.#######",
  "#...#..p..k.#",
  "#.#####.###.#",
  "#.#...#...#.#",
  "#.#.o.###.#.#",
  "#...#...#...#",
  "#m###.#.###.#",
  "#....t....E.#",
  "#############",
];

const DIRS = [
  { x: 0, y: -1, name: "North", yaw: Math.PI },
  { x: 1, y: 0, name: "East", yaw: Math.PI / 2 },
  { x: 0, y: 1, name: "South", yaw: 0 },
  { x: -1, y: 0, name: "West", yaw: -Math.PI / 2 },
];

const ENEMY_TYPES = {
  g: {
    name: "Goblin Skirmisher",
    hp: 12,
    attack: [2, 5],
    color: "#8bbf4a",
    scale: 0.72,
    model: { key: "orc", scale: 0.62, y: 0.02, rotationY: Math.PI },
  },
  m: {
    name: "Crypt Maw",
    hp: 18,
    attack: [3, 7],
    color: "#c66d4e",
    scale: 0.9,
    model: { key: "xenomorph", scale: 0.78, y: 0.08, rotationY: Math.PI },
  },
  o: {
    name: "Ogre Sentinel",
    hp: 28,
    attack: [5, 10],
    color: "#8b6a54",
    scale: 1.08,
    model: { key: "giant", scale: 1.02, y: 0.04, rotationY: Math.PI },
  },
};

const ITEM_TYPES = {
  p: { kind: "potion", label: "healing potion", color: "#88d7bc" },
  k: { kind: "key", label: "moon key", color: "#f1d06d" },
  t: { kind: "treasure", label: "ancient cache", color: "#f2a94e" },
};

const PARTY_TEMPLATE = [
  {
    id: "seraphine",
    name: "Seraphine",
    role: "Knight Captain",
    maxHp: 16,
    attack: [3, 6],
    color: "linear-gradient(135deg, #7a5a43, #332018)",
    portrait: "assets/portraits/seraphine.svg",
    ability: { name: "Vanguard Cry", cooldown: 3, type: "buff" },
  },
  {
    id: "brom",
    name: "Brom",
    role: "Shield Dwarf",
    maxHp: 20,
    attack: [2, 5],
    color: "linear-gradient(135deg, #4f6672, #1f2d34)",
    portrait: "assets/portraits/brom.svg",
    ability: { name: "Bulwark", cooldown: 4, type: "guard" },
  },
  {
    id: "lyra",
    name: "Lyra",
    role: "Sun Acolyte",
    maxHp: 13,
    attack: [2, 4],
    color: "linear-gradient(135deg, #8a6a54, #412920)",
    portrait: "assets/portraits/lyra.svg",
    ability: { name: "Radiant Mend", cooldown: 3, type: "heal" },
  },
  {
    id: "corwin",
    name: "Corwin",
    role: "Spellblade",
    maxHp: 14,
    attack: [3, 5],
    color: "linear-gradient(135deg, #5b4b6f, #23192e)",
    portrait: "assets/portraits/corwin.svg",
    ability: { name: "Arcane Bolt", cooldown: 2, type: "spell" },
  },
];

const LEVEL_THEMES = [
  { id: "keep", name: "Upper Keep", wall: "#7a6750", floor: "#463428", ceiling: "#2b2420", door: "#725237", accent: "#efb965", fog: "#171311" },
  { id: "grotto", name: "Mire Grotto", wall: "#56654b", floor: "#26392f", ceiling: "#19231e", door: "#55694b", accent: "#8ad5a0", fog: "#0f1714" },
  { id: "crypt", name: "Moon Crypt", wall: "#635d76", floor: "#302c3f", ceiling: "#1b1725", door: "#6d6686", accent: "#9baef5", fog: "#11121a" },
];

const state = {
  map: [],
  width: 0,
  height: 0,
  player: null,
  party: [],
  selectedMemberId: null,
  enemies: [],
  items: [],
  revealed: new Set(),
  log: [],
  turn: 0,
  exitUnlocked: false,
  gameOver: false,
  victory: false,
  currentThemeId: "keep",
  effects: {
    nextAttackBonus: 0,
    damageShield: 0,
  },
  animation: {
    time: 0,
    swingUntil: 0,
    flashUntil: 0,
  },
};

const world = {
  engine: null,
  scene: null,
  camera: null,
  heroAnchor: null,
  viewAnchor: null,
  weapon: null,
  headLight: null,
  motion: {
    currentPosition: null,
    targetPosition: null,
    currentYaw: 0,
    targetYaw: 0,
    currentLookYaw: 0,
    targetLookYaw: 0,
    currentPitch: 0,
    targetPitch: 0,
  },
  torchLights: [],
  themeMaterials: new Map(),
  meshes: {
    floors: [],
    ceilings: [],
    walls: [],
    doors: [],
  },
  enemyMeshes: new Map(),
  itemMeshes: new Map(),
  particles: [],
  imported: {
    lanternLoaded: false,
    lanternContainer: null,
    enemyModels: {
      orc: { loaded: false, container: null },
      giant: { loaded: false, container: null },
      xenomorph: { loaded: false, container: null },
    },
  },
  input: {
    pointerLocked: false,
  },
};

const viewport = document.getElementById("viewport");
const minimap = document.getElementById("minimap");
const mapCtx = minimap.getContext("2d");
const logEl = document.getElementById("log");
const attackBtn = document.getElementById("attack-btn");
const potionBtn = document.getElementById("potion-btn");
const abilityBtn = document.getElementById("ability-btn");
const restartBtn = document.getElementById("restart-btn");
const facingLabel = document.getElementById("facing-label");
const objectiveLabel = document.getElementById("objective-label");
const turnCounter = document.getElementById("turn-counter");
const partyPanel = document.getElementById("party-panel");
const partySummary = document.getElementById("party-summary");
const selectionHint = document.getElementById("selection-hint");

const statEls = {
  health: document.getElementById("stat-health"),
  attack: document.getElementById("stat-attack"),
  potions: document.getElementById("stat-potions"),
  gold: document.getElementById("stat-gold"),
};

function tileKey(x, y) {
  return `${x},${y}`;
}

function isInside(x, y) {
  return x >= 0 && y >= 0 && x < state.width && y < state.height;
}

function getTile(x, y) {
  if (!isInside(x, y)) return "#";
  return state.map[y][x];
}

function isWall(x, y) {
  return getTile(x, y) === "#";
}

function roll([min, max]) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getThemeIndexForY(y) {
  if (y <= 4) return 0;
  if (y <= 8) return 1;
  return 2;
}

function getCurrentTheme() {
  return LEVEL_THEMES[getThemeIndexForY(state.player.y)];
}

function getLivingParty() {
  return state.party.filter((member) => member.alive);
}

function getMemberById(id) {
  return state.party.find((member) => member.id === id) || null;
}

function getSelectedMember() {
  const selected = getMemberById(state.selectedMemberId);
  return selected && selected.alive ? selected : getLivingParty()[0] || null;
}

function getPartyHealthTotals() {
  return state.party.reduce(
    (totals, member) => {
      totals.hp += Math.max(member.hp, 0);
      totals.maxHp += member.maxHp;
      return totals;
    },
    { hp: 0, maxHp: 0 }
  );
}

function getPartyAttackRange() {
  return getLivingParty().reduce(
    (totals, member) => {
      totals.min += member.attack[0];
      totals.max += member.attack[1];
      return totals;
    },
    { min: 0, max: 0 }
  );
}

function getEnemyAt(x, y) {
  return state.enemies.find((enemy) => enemy.alive && enemy.x === x && enemy.y === y) || null;
}

function getItemAt(x, y) {
  return state.items.find((item) => !item.taken && item.x === x && item.y === y) || null;
}

function logMessage(text, tone = "") {
  state.log.unshift({ text, tone });
  state.log = state.log.slice(0, 8);
}

function revealAroundPlayer() {
  for (let dy = -2; dy <= 2; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) {
      const x = state.player.x + dx;
      const y = state.player.y + dy;
      if (isInside(x, y)) {
        state.revealed.add(tileKey(x, y));
      }
    }
  }
}

function color3(hex) {
  return BABYLON.Color3.FromHexString(hex);
}

function color4(hex, alpha = 1) {
  return BABYLON.Color4.FromColor3(color3(hex), alpha);
}

function makeMaterial(name, diffuseHex, emissiveHex = "#000000", specularHex = "#111111") {
  const material = new BABYLON.StandardMaterial(name, world.scene);
  material.diffuseColor = color3(diffuseHex);
  material.ambientColor = color3(diffuseHex);
  material.specularColor = color3(specularHex);
  material.emissiveColor = color3(emissiveHex);
  return material;
}

function createTextureCanvas(paint) {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");
  paint(ctx, canvas.width, canvas.height);
  return canvas;
}

function createDynamicTexture(name, canvas) {
  const texture = new BABYLON.DynamicTexture(name, { width: canvas.width, height: canvas.height }, world.scene, false);
  const ctx = texture.getContext();
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(canvas, 0, 0);
  texture.update(false);
  return texture;
}

function paintStoneTexture(ctx, width, height, theme) {
  ctx.fillStyle = theme.wall;
  ctx.fillRect(0, 0, width, height);
  for (let row = 0; row < 7; row += 1) {
    const offset = row % 2 === 0 ? 0 : 22;
    for (let col = -1; col < 7; col += 1) {
      const x = col * 44 + offset;
      const y = row * 38;
      ctx.fillStyle = shadeHex(theme.wall, (row + col) % 2 === 0 ? 14 : -12);
      ctx.fillRect(x, y, 40, 34);
      ctx.strokeStyle = shadeHex(theme.fog, 18);
      ctx.strokeRect(x + 0.5, y + 0.5, 40, 34);
      ctx.strokeStyle = hexToRgba(theme.accent, 0.08);
      ctx.beginPath();
      ctx.moveTo(x + 5, y + 8);
      ctx.lineTo(x + 28, y + 11);
      ctx.stroke();
    }
  }
  paintNoise(ctx, width, height, 0.12, 2);
}

function paintFloorTexture(ctx, width, height, theme) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, shadeHex(theme.floor, 12));
  gradient.addColorStop(1, shadeHex(theme.floor, -16));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = hexToRgba(theme.fog, 0.4);
  ctx.lineWidth = 4;
  for (let x = 0; x <= width; x += 42) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y <= height; y += 42) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
  ctx.strokeStyle = hexToRgba(theme.accent, theme.id === "grotto" ? 0.16 : 0.08);
  for (let i = 0; i < 18; i += 1) {
    const x = (i * 31) % width;
    const y = (i * 47) % height;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 12, y + 6);
    ctx.stroke();
  }
  paintNoise(ctx, width, height, 0.1, 2);
}

function paintCeilingTexture(ctx, width, height, theme) {
  const gradient = ctx.createLinearGradient(0, 0, 0, height);
  gradient.addColorStop(0, shadeHex(theme.ceiling, 6));
  gradient.addColorStop(1, shadeHex(theme.ceiling, -14));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  for (let i = 0; i < 28; i += 1) {
    ctx.fillStyle = hexToRgba(theme.accent, 0.04 + (i % 3) * 0.02);
    ctx.beginPath();
    ctx.arc((i * 37) % width, (i * 23) % height, 8 + (i % 5), 0, Math.PI * 2);
    ctx.fill();
  }
  paintNoise(ctx, width, height, 0.08, 2);
}

function paintDoorTexture(ctx, width, height, theme) {
  ctx.fillStyle = theme.door;
  ctx.fillRect(0, 0, width, height);
  for (let x = 0; x < width; x += 28) {
    ctx.fillStyle = shadeHex(theme.door, x % 56 === 0 ? 18 : -10);
    ctx.fillRect(x, 0, 20, height);
    ctx.strokeStyle = hexToRgba(theme.fog, 0.32);
    ctx.strokeRect(x + 0.5, 0.5, 20, height - 1);
  }
  ctx.strokeStyle = hexToRgba(theme.accent, 0.18);
  for (let i = 0; i < 12; i += 1) {
    ctx.beginPath();
    ctx.moveTo(0, 14 + i * 18);
    ctx.bezierCurveTo(width * 0.35, 10 + i * 20, width * 0.68, 18 + i * 16, width, 14 + i * 18);
    ctx.stroke();
  }
  paintNoise(ctx, width, height, 0.08, 2);
}

function paintBumpTexture(ctx, width, height, type) {
  ctx.fillStyle = "#7f7fff";
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = "#a0a0ff";
  ctx.fillStyle = "#6464ff";
  if (type === "wall") {
    for (let row = 0; row < 7; row += 1) {
      const offset = row % 2 === 0 ? 0 : 22;
      for (let col = -1; col < 7; col += 1) {
        const x = col * 44 + offset;
        const y = row * 38;
        ctx.fillRect(x, y, 40, 34);
        ctx.strokeRect(x + 0.5, y + 0.5, 40, 34);
      }
    }
  } else if (type === "floor") {
    for (let x = 0; x <= width; x += 42) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 42) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  } else if (type === "door") {
    for (let x = 0; x < width; x += 28) {
      ctx.fillRect(x, 0, 20, height);
    }
  } else {
    for (let i = 0; i < 24; i += 1) {
      ctx.beginPath();
      ctx.arc((i * 37) % width, (i * 23) % height, 7 + (i % 5), 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function paintNoise(ctx, width, height, alpha, size) {
  for (let i = 0; i < 700; i += 1) {
    const value = 70 + ((i * 19) % 110);
    ctx.fillStyle = `rgba(${value}, ${value}, ${value}, ${alpha})`;
    ctx.fillRect((i * 29) % width, (i * 43) % height, size, size);
  }
}

function shadeHex(hex, delta) {
  const channels = hex.match(/[A-Za-z0-9]{2}/g).map((chunk) => parseInt(chunk, 16));
  const shifted = channels.map((channel) => Math.max(0, Math.min(255, channel + delta)));
  return `rgb(${shifted[0]}, ${shifted[1]}, ${shifted[2]})`;
}

function hexToRgba(hex, alpha) {
  const channels = hex.match(/[A-Za-z0-9]{2}/g).map((chunk) => parseInt(chunk, 16));
  return `rgba(${channels[0]}, ${channels[1]}, ${channels[2]}, ${alpha})`;
}

function createEnemyBillboardTexture(enemyType) {
  const spec = ENEMY_TYPES[enemyType];
  const canvas = createTextureCanvas((ctx, width, height) => {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(0,0,0,0)");
    gradient.addColorStop(1, "rgba(0,0,0,0.22)");
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = spec.color;
    ctx.beginPath();
    ctx.ellipse(width / 2, height * 0.42, width * 0.22, height * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#231913";
    ctx.fillRect(width * 0.37, height * 0.48, width * 0.26, height * 0.24);
    ctx.fillRect(width * 0.28, height * 0.64, width * 0.14, height * 0.18);
    ctx.fillRect(width * 0.58, height * 0.64, width * 0.14, height * 0.18);
    ctx.fillStyle = "#f4ebd4";
    ctx.beginPath();
    ctx.arc(width * 0.43, height * 0.34, width * 0.028, 0, Math.PI * 2);
    ctx.arc(width * 0.57, height * 0.34, width * 0.028, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = hexToRgba("#f7dca0", 0.22);
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(width / 2, height * 0.43, width * 0.24, -0.4, 0.85);
    ctx.stroke();
  });
  return createDynamicTexture(`enemy-billboard-${enemyType}`, canvas);
}

function getThemeMaterials(theme) {
  if (world.themeMaterials.has(theme.id)) return world.themeMaterials.get(theme.id);
  const wallTexture = createDynamicTexture(`${theme.id}-wall-diffuse`, createTextureCanvas((ctx, width, height) => paintStoneTexture(ctx, width, height, theme)));
  const floorTexture = createDynamicTexture(`${theme.id}-floor-diffuse`, createTextureCanvas((ctx, width, height) => paintFloorTexture(ctx, width, height, theme)));
  const ceilingTexture = createDynamicTexture(`${theme.id}-ceiling-diffuse`, createTextureCanvas((ctx, width, height) => paintCeilingTexture(ctx, width, height, theme)));
  const doorTexture = createDynamicTexture(`${theme.id}-door-diffuse`, createTextureCanvas((ctx, width, height) => paintDoorTexture(ctx, width, height, theme)));
  const wallBump = createDynamicTexture(`${theme.id}-wall-bump`, createTextureCanvas((ctx, width, height) => paintBumpTexture(ctx, width, height, "wall")));
  const floorBump = createDynamicTexture(`${theme.id}-floor-bump`, createTextureCanvas((ctx, width, height) => paintBumpTexture(ctx, width, height, "floor")));
  const ceilingBump = createDynamicTexture(`${theme.id}-ceiling-bump`, createTextureCanvas((ctx, width, height) => paintBumpTexture(ctx, width, height, "ceiling")));
  const doorBump = createDynamicTexture(`${theme.id}-door-bump`, createTextureCanvas((ctx, width, height) => paintBumpTexture(ctx, width, height, "door")));

  const materials = {
    wall: makeMaterial(`${theme.id}-wall`, theme.wall),
    floor: makeMaterial(`${theme.id}-floor`, theme.floor, "#000000", theme.id === "grotto" ? "#527d70" : "#111111"),
    ceiling: makeMaterial(`${theme.id}-ceiling`, theme.ceiling),
    door: makeMaterial(`${theme.id}-door`, theme.door),
    accent: makeMaterial(`${theme.id}-accent`, theme.accent, theme.accent),
  };
  materials.wall.diffuseTexture = wallTexture;
  materials.wall.bumpTexture = wallBump;
  materials.wall.diffuseTexture.uScale = 1.2;
  materials.wall.diffuseTexture.vScale = 1.2;
  materials.wall.bumpTexture.level = 0.65;

  materials.floor.diffuseTexture = floorTexture;
  materials.floor.bumpTexture = floorBump;
  materials.floor.diffuseTexture.uScale = 2;
  materials.floor.diffuseTexture.vScale = 2;
  materials.floor.bumpTexture.level = theme.id === "grotto" ? 0.95 : 0.55;

  materials.ceiling.diffuseTexture = ceilingTexture;
  materials.ceiling.bumpTexture = ceilingBump;
  materials.ceiling.diffuseTexture.uScale = 1.4;
  materials.ceiling.diffuseTexture.vScale = 1.4;
  materials.ceiling.bumpTexture.level = 0.4;

  materials.door.diffuseTexture = doorTexture;
  materials.door.bumpTexture = doorBump;
  materials.door.diffuseTexture.uScale = 1;
  materials.door.diffuseTexture.vScale = 1;
  materials.door.bumpTexture.level = 0.7;

  const importedWall = new BABYLON.Texture("assets/textures/brick_diffuse.jpg", world.scene, true, false);
  const importedWallBump = new BABYLON.Texture("assets/textures/brick_bump.jpg", world.scene, true, false);
  importedWall.uScale = 1.5;
  importedWall.vScale = 1.5;
  importedWallBump.uScale = 1.5;
  importedWallBump.vScale = 1.5;

  const importedFloor = new BABYLON.Texture("assets/textures/hardwood2_diffuse.jpg", world.scene, true, false);
  const importedFloorBump = new BABYLON.Texture("assets/textures/hardwood2_bump.jpg", world.scene, true, false);
  importedFloor.uScale = 2.2;
  importedFloor.vScale = 2.2;
  importedFloorBump.uScale = 2.2;
  importedFloorBump.vScale = 2.2;

  materials.wall.diffuseTexture = importedWall;
  materials.wall.bumpTexture = importedWallBump;
  materials.floor.diffuseTexture = importedFloor;
  materials.floor.bumpTexture = importedFloorBump;

  world.themeMaterials.set(theme.id, materials);
  return materials;
}

function gridToWorld(x, y) {
  return new BABYLON.Vector3((x - state.width / 2) * 3, 0, (y - state.height / 2) * 3);
}

function setup3D() {
  world.engine = new BABYLON.Engine(viewport, true, { stencil: true, preserveDrawingBuffer: true });
  world.scene = new BABYLON.Scene(world.engine);
  world.scene.fogMode = BABYLON.Scene.FOGMODE_EXP2;
  world.scene.fogDensity = 0.014;
  world.scene.clearColor = color4("#171311", 1);

  const hemi = new BABYLON.HemisphericLight("hemi", new BABYLON.Vector3(0, 1, 0), world.scene);
  hemi.intensity = 0.52;
  hemi.groundColor = color3("#3a3028");

  const fill = new BABYLON.HemisphericLight("fill", new BABYLON.Vector3(0.35, 0.8, 0.2), world.scene);
  fill.intensity = 0.24;

  world.heroAnchor = new BABYLON.TransformNode("hero", world.scene);
  world.viewAnchor = new BABYLON.TransformNode("view", world.scene);
  world.viewAnchor.parent = world.heroAnchor;
  world.camera = new BABYLON.UniversalCamera("camera", new BABYLON.Vector3(0, 1.62, 0), world.scene);
  world.camera.parent = world.viewAnchor;
  world.camera.inputs.clear();
  world.camera.fov = 0.95;
  world.camera.minZ = 0.1;
  world.camera.maxZ = 120;

  world.headLight = new BABYLON.PointLight("head-light", new BABYLON.Vector3(0, 1.4, 0.6), world.scene);
  world.headLight.parent = world.viewAnchor;
  world.headLight.diffuse = color3("#f2c981");
  world.headLight.range = 10;
  world.headLight.intensity = 0.55;

  world.weapon = BABYLON.MeshBuilder.CreateBox("weapon", { width: 0.08, height: 0.72, depth: 0.08 }, world.scene);
  world.weapon.parent = world.camera;
  world.weapon.position = new BABYLON.Vector3(0.42, -0.4, 1.04);
  world.weapon.rotation = new BABYLON.Vector3(0.45, 0.22, 0.82);
  world.weapon.material = makeMaterial("weapon-mat", "#cdb27d", "#231b12");

  world.engine.runRenderLoop(() => {
    state.animation.time = performance.now();
    animateWorld();
    world.scene.render();
  });
  window.addEventListener("resize", () => world.engine.resize());
  setupMouseLook();
  loadImportedAssets();
}

function animateWorld() {
  const time = state.animation.time;
  const flicker = 0.82 + Math.sin(time / 90) * 0.08 + Math.sin(time / 41) * 0.06 + Math.sin(time / 23) * 0.04;
  if (world.motion.targetPosition) {
    world.motion.currentPosition = BABYLON.Vector3.Lerp(world.motion.currentPosition, world.motion.targetPosition, 0.18);
    world.heroAnchor.position.copyFrom(world.motion.currentPosition);
  }
  world.motion.currentYaw = BABYLON.Scalar.LerpAngle(world.motion.currentYaw, world.motion.targetYaw, 0.2);
  world.heroAnchor.rotation.y = world.motion.currentYaw;
  world.motion.currentLookYaw = BABYLON.Scalar.LerpAngle(world.motion.currentLookYaw, world.motion.targetLookYaw, 0.18);
  world.motion.currentPitch = BABYLON.Scalar.Lerp(world.motion.currentPitch, world.motion.targetPitch, 0.18);
  world.viewAnchor.rotation.y = world.motion.currentLookYaw;
  world.viewAnchor.rotation.x = world.motion.currentPitch;
  world.torchLights.forEach((torch, index) => {
    torch.light.intensity = torch.base * flicker;
    torch.mesh.visibility = 0.7 + Math.sin(time / 130 + index) * 0.15;
  });
  if (world.headLight) {
    world.headLight.intensity = 0.5 + flicker * 0.1;
  }

  if (world.weapon) {
    const swing = Math.max(0, state.animation.swingUntil - time) / 220;
    world.weapon.rotation.z = 0.82 - swing * 1.1;
    world.weapon.position.x = 0.42 + swing * 0.18;
    world.weapon.position.y = -0.4 + swing * 0.2;
  }

  world.enemyMeshes.forEach((mesh, id) => {
    const enemy = state.enemies.find((entry) => entry.id === id);
    if (!enemy || !enemy.alive) return;
    const baseY = mesh.metadata?.baseY ?? mesh.position.y;
    const baseRotationY = mesh.metadata?.baseRotationY ?? mesh.rotation.y;
    const phase = mesh.metadata?.phase ?? 0;
    mesh.position.y = baseY + Math.sin(time / 220 + phase) * 0.05;
    mesh.rotation.y = baseRotationY + Math.sin(time / 340 + phase) * 0.12;
  });

  world.itemMeshes.forEach((mesh, id) => {
    const item = state.items.find((entry) => entry.id === id);
    if (!item || item.taken) return;
    mesh.rotation.y += 0.02;
    mesh.position.y = 0.34 + Math.sin(time / 260 + mesh.position.x) * 0.05;
  });

  const flash = Math.max(0, state.animation.flashUntil - time) / 180;
  world.scene.imageProcessingConfiguration.vignetteEnabled = true;
  world.scene.imageProcessingConfiguration.vignetteWeight = 1.05;
  world.scene.imageProcessingConfiguration.exposure = 1 + flash * 0.18;

  for (let i = world.particles.length - 1; i >= 0; i -= 1) {
    const particle = world.particles[i];
    particle.life -= 16;
    if (particle.life <= 0) {
      particle.mesh.dispose();
      world.particles.splice(i, 1);
      continue;
    }
    particle.mesh.position.addInPlace(particle.velocity);
    particle.velocity.scaleInPlace(0.96);
    particle.velocity.y += 0.002;
    particle.mesh.scaling.scaleInPlace(0.985);
    particle.mesh.visibility = Math.max(0, particle.life / particle.maxLife);
  }

  world.meshes.doors.forEach((door) => {
    const target = state.player.key ? 1 : 0;
    const current = door.metadata?.openAmount ?? 0;
    const next = BABYLON.Scalar.Lerp(current, target, 0.08);
    door.metadata.openAmount = next;
    door.rotation.y = -next * 1.18;
    door.position.x = door.metadata.closedX + next * 0.65;
  });
}

function disposeList(list) {
  list.forEach((mesh) => mesh.dispose());
  list.length = 0;
}

function clearWorldMeshes() {
  disposeList(world.meshes.floors);
  disposeList(world.meshes.ceilings);
  disposeList(world.meshes.walls);
  disposeList(world.meshes.doors);
  world.enemyMeshes.forEach((mesh) => {
    mesh.metadata?.sceneNodes?.forEach((node) => {
      if (node && !node.isDisposed?.()) node.dispose();
    });
    mesh.dispose();
  });
  world.enemyMeshes.clear();
  world.itemMeshes.forEach((mesh) => mesh.dispose());
  world.itemMeshes.clear();
  world.torchLights.forEach((torch) => {
    torch.mesh.dispose();
    torch.light.dispose();
  });
  world.torchLights = [];
}

function createEnemyMesh(enemy) {
  const spec = ENEMY_TYPES[enemy.type];
  const root = createImportedEnemyMesh(enemy) || createFallbackEnemyMesh(enemy);

  const shadow = BABYLON.MeshBuilder.CreateGround(`${enemy.id}-shadow`, { width: 1.1 * spec.scale, height: 0.7 * spec.scale }, world.scene);
  shadow.parent = root;
  shadow.position = new BABYLON.Vector3(0, 0.02, 0);
  shadow.rotation.x = Math.PI / 2;
  const shadowMat = new BABYLON.StandardMaterial(`${enemy.id}-shadow-mat`, world.scene);
  shadowMat.diffuseColor = color3("#000000");
  shadowMat.alpha = 0.24;
  shadow.material = shadowMat;
  root.metadata = {
    ...(root.metadata || {}),
    baseY: root.position.y,
    baseRotationY: root.rotation.y,
    phase: enemy.x * 0.7 + enemy.y * 1.1,
  };
  world.enemyMeshes.set(enemy.id, root);
}

function createImportedEnemyMesh(enemy) {
  const spec = ENEMY_TYPES[enemy.type];
  const modelSpec = spec.model;
  const importedModel = modelSpec ? world.imported.enemyModels[modelSpec.key] : null;
  if (!importedModel?.loaded || !importedModel.container) return null;

  const root = new BABYLON.TransformNode(enemy.id, world.scene);
  const instance = importedModel.container.instantiateModelsToScene((sourceName) => `${enemy.id}-${sourceName}`);
  const sceneNodes = [...instance.rootNodes, ...instance.skeletons, ...instance.animationGroups];
  instance.rootNodes.forEach((node) => {
    node.parent = root;
    node.setEnabled(true);
    if ("isPickable" in node) node.isPickable = false;
    if ("billboardMode" in node) node.billboardMode = BABYLON.Mesh.BILLBOARDMODE_NONE;
    node.getChildMeshes?.().forEach((mesh) => {
      mesh.isPickable = false;
      mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_NONE;
    });
  });
  root.metadata = { sceneNodes };
  root.position = gridToWorld(enemy.x, enemy.y).add(new BABYLON.Vector3(0, modelSpec.y, 0));
  root.rotation.y = modelSpec.rotationY;
  root.scaling = new BABYLON.Vector3(modelSpec.scale, modelSpec.scale, modelSpec.scale);
  return root;
}

function createFallbackEnemyMesh(enemy) {
  const spec = ENEMY_TYPES[enemy.type];
  const root = BABYLON.MeshBuilder.CreatePlane(enemy.id, { width: 1.4 * spec.scale, height: 1.9 * spec.scale }, world.scene);
  root.billboardMode = BABYLON.Mesh.BILLBOARDMODE_Y;
  root.position = gridToWorld(enemy.x, enemy.y).add(new BABYLON.Vector3(0, 0.96, 0));
  const mat = new BABYLON.StandardMaterial(`${enemy.id}-mat`, world.scene);
  mat.diffuseTexture = createEnemyBillboardTexture(enemy.type);
  mat.diffuseTexture.hasAlpha = true;
  mat.useAlphaFromDiffuseTexture = true;
  mat.emissiveColor = color3("#15110f");
  mat.specularColor = color3("#141414");
  root.material = mat;
  return root;
}

function spawnParticleBurst(position, colorHex, count = 10, spread = 0.08, speed = 0.05, size = 0.08) {
  for (let i = 0; i < count; i += 1) {
    const mesh = BABYLON.MeshBuilder.CreateIcoSphere(`particle-${Date.now()}-${i}`, { radius: size, subdivisions: 1 }, world.scene);
    const material = new BABYLON.StandardMaterial(`particle-mat-${Date.now()}-${i}`, world.scene);
    material.emissiveColor = color3(colorHex);
    material.diffuseColor = color3(colorHex);
    material.alpha = 0.9;
    mesh.material = material;
    mesh.position = position.add(
      new BABYLON.Vector3(
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread,
        (Math.random() - 0.5) * spread
      )
    );
    world.particles.push({
      mesh,
      life: 320 + Math.random() * 180,
      maxLife: 500,
      velocity: new BABYLON.Vector3(
        (Math.random() - 0.5) * speed,
        Math.random() * speed,
        (Math.random() - 0.5) * speed
      ),
    });
  }
}

function loadImportedAssets() {
  Promise.allSettled([
    loadImportedModel("Lantern.glb", "lantern"),
    loadImportedModel("orc.glb", "orc"),
    loadImportedModel("giant.glb", "giant"),
    loadImportedModel("xenomorph.glb", "xenomorph"),
  ]).then(() => {
    if (state.player) {
      rebuildScene();
      sync3DState(true);
    }
  });
}

function loadImportedModel(fileName, key) {
  return BABYLON.SceneLoader.LoadAssetContainerAsync("assets/models/", fileName, world.scene)
    .then((container) => {
      container.meshes.forEach((mesh) => {
        mesh.isPickable = false;
        mesh.billboardMode = BABYLON.Mesh.BILLBOARDMODE_NONE;
      });
      container.removeAllFromScene();
      if (key === "lantern") {
        world.imported.lanternLoaded = container.meshes.length > 0 || container.transformNodes.length > 0;
        world.imported.lanternContainer = container;
      } else {
        world.imported.enemyModels[key] = {
          loaded: container.meshes.length > 0 || container.transformNodes.length > 0,
          container,
        };
      }
    })
    .catch(() => {
      if (key === "lantern") {
        world.imported.lanternLoaded = false;
        world.imported.lanternContainer = null;
      } else {
        world.imported.enemyModels[key] = {
          loaded: false,
          container: null,
        };
      }
    });
}

function createLanternInstance(name, position, rotationZ) {
  if (!world.imported.lanternLoaded || !world.imported.lanternContainer) return null;
  const root = new BABYLON.TransformNode(name, world.scene);
  const instance = world.imported.lanternContainer.instantiateModelsToScene((sourceName) => `${name}-${sourceName}`);
  instance.rootNodes.forEach((node) => {
    node.parent = root;
    node.setEnabled(true);
  });
  root.position = position.clone();
  root.rotation.z = rotationZ;
  root.scaling = new BABYLON.Vector3(0.9, 0.9, 0.9);
  return root;
}

function createItemMesh(item) {
  const spec = ITEM_TYPES[item.type];
  const mesh =
    item.type === "p"
      ? BABYLON.MeshBuilder.CreateCylinder(item.id, { diameterTop: 0.16, diameterBottom: 0.34, height: 0.48 }, world.scene)
      : BABYLON.MeshBuilder.CreatePolyhedron(item.id, { type: item.type === "k" ? 1 : 0, size: 0.34 }, world.scene);
  mesh.position = gridToWorld(item.x, item.y).add(new BABYLON.Vector3(0, 0.34, 0));
  mesh.material = makeMaterial(`${item.id}-mat`, spec.color, spec.color);
  world.itemMeshes.set(item.id, mesh);
}

function applyTheme(theme) {
  world.scene.fogColor = color3(theme.fog);
  world.scene.clearColor = color4(theme.fog);
}

function rebuildScene() {
  clearWorldMeshes();

  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      const pos = gridToWorld(x, y);
      const theme = LEVEL_THEMES[getThemeIndexForY(y)];
      const mats = getThemeMaterials(theme);

      const floor = BABYLON.MeshBuilder.CreateGround(`floor-${x}-${y}`, { width: 3, height: 3 }, world.scene);
      floor.position = pos.clone();
      floor.material = mats.floor;
      world.meshes.floors.push(floor);

      const ceiling = BABYLON.MeshBuilder.CreateGround(`ceiling-${x}-${y}`, { width: 3, height: 3 }, world.scene);
      ceiling.position = pos.add(new BABYLON.Vector3(0, 3.2, 0));
      ceiling.rotation.x = Math.PI;
      ceiling.material = mats.ceiling;
      world.meshes.ceilings.push(ceiling);

      const tile = getTile(x, y);
      if (tile === "#") {
        const wall = BABYLON.MeshBuilder.CreateBox(`wall-${x}-${y}`, { width: 3, height: 3.2, depth: 3 }, world.scene);
        wall.position = pos.add(new BABYLON.Vector3(0, 1.6, 0));
        wall.material = mats.wall;
        world.meshes.walls.push(wall);
      } else if (tile === "E") {
        const door = BABYLON.MeshBuilder.CreateBox(`door-${x}-${y}`, { width: 2.2, height: 2.6, depth: 0.3 }, world.scene);
        door.position = pos.add(new BABYLON.Vector3(0, 1.3, 0));
        door.material = mats.door;
        door.metadata = { closedX: door.position.x, openAmount: 0 };
        world.meshes.doors.push(door);
      }

      if (tile !== "#") {
        const torchPosition = pos.add(new BABYLON.Vector3(-1.15, 2.12, -1.1));
        const torchMesh =
          createLanternInstance(`torch-${x}-${y}`, torchPosition, 0.42) ||
          BABYLON.MeshBuilder.CreateCylinder(`torch-${x}-${y}`, { diameter: 0.12, height: 0.45 }, world.scene);
        if (!world.imported.lanternLoaded) {
          torchMesh.position = torchPosition;
          torchMesh.rotation.z = 0.42;
          torchMesh.material = mats.door;
        }

        const torchLight = new BABYLON.PointLight(`torch-light-${x}-${y}`, torchPosition.add(new BABYLON.Vector3(0, 0.25, 0)), world.scene);
        torchLight.diffuse = color3(theme.accent);
        torchLight.range = 8;
        torchLight.intensity = 0.68;
        world.torchLights.push({ mesh: torchMesh, light: torchLight, base: 0.68 });
      }
    }
  }

  state.enemies.forEach((enemy) => createEnemyMesh(enemy));
  state.items.forEach((item) => createItemMesh(item));
  applyTheme(getCurrentTheme());
}

function sync3DState(immediate = false) {
  const dir = DIRS[state.player.dir];
  const targetPosition = gridToWorld(state.player.x, state.player.y);
  world.motion.targetPosition = targetPosition.clone();
  world.motion.targetYaw = dir.yaw;
  if (immediate || !world.motion.currentPosition) {
    world.motion.currentPosition = targetPosition.clone();
    world.motion.currentYaw = dir.yaw;
    world.motion.currentLookYaw = 0;
    world.motion.targetLookYaw = 0;
    world.motion.currentPitch = 0;
    world.motion.targetPitch = 0;
    world.heroAnchor.position.copyFrom(targetPosition);
    world.heroAnchor.rotation = new BABYLON.Vector3(0, dir.yaw, 0);
    world.viewAnchor.rotation = BABYLON.Vector3.Zero();
  }

  state.enemies.forEach((enemy) => {
    const mesh = world.enemyMeshes.get(enemy.id);
    if (mesh) mesh.setEnabled(enemy.alive);
  });
  state.items.forEach((item) => {
    const mesh = world.itemMeshes.get(item.id);
    if (mesh) mesh.setEnabled(!item.taken);
  });
  world.meshes.doors.forEach((door) => {
    door.visibility = state.player.key ? 0.18 : 1;
  });

  if (!immediate) {
    state.animation.swingUntil = state.animation.time + 120;
  }
}

function setFlash() {
  state.animation.flashUntil = state.animation.time + 180;
}

function setupMouseLook() {
  viewport.addEventListener("click", () => {
    if (!world.input.pointerLocked) {
      viewport.requestPointerLock?.();
    }
  });

  document.addEventListener("pointerlockchange", () => {
    world.input.pointerLocked = document.pointerLockElement === viewport;
  });

  document.addEventListener("mousemove", (event) => {
    if (!world.input.pointerLocked) return;
    world.motion.targetLookYaw = BABYLON.Scalar.Clamp(world.motion.targetLookYaw + event.movementX * 0.0025, -0.5, 0.5);
    world.motion.targetPitch = BABYLON.Scalar.Clamp(world.motion.targetPitch + event.movementY * 0.0019, -0.35, 0.28);
  });
}

function isMotionBusy() {
  if (!world.motion.currentPosition || !world.motion.targetPosition) return false;
  const distance = BABYLON.Vector3.Distance(world.motion.currentPosition, world.motion.targetPosition);
  const yawGap = Math.abs(BABYLON.Scalar.NormalizeRadians(world.motion.targetYaw - world.motion.currentYaw));
  return distance > 0.04 || yawGap > 0.025;
}

function updateThemeFromPosition() {
  const theme = getCurrentTheme();
  if (theme.id !== state.currentThemeId) {
    state.currentThemeId = theme.id;
    applyTheme(theme);
    logMessage(`The air changes. You enter the ${theme.name}.`, "important");
  }
}

function collectItem() {
  const item = getItemAt(state.player.x, state.player.y);
  if (!item) return;
  item.taken = true;

  if (item.type === "p") {
    state.player.potions += 1;
    logMessage("You pocket a healing potion.", "success");
  } else if (item.type === "k") {
    state.player.key = true;
    state.exitUnlocked = true;
    logMessage("You found the Moon Key. The exit seal should yield now.", "important");
  } else if (item.type === "t") {
    const gold = roll([18, 30]);
    state.player.gold += gold;
    state.party.forEach((member) => {
      member.attack = [member.attack[0] + 1, member.attack[1] + 1];
    });
    logMessage(`An ancient cache yields ${gold} gold and finer weapons for the whole party.`, "success");
  }
}

function selectMember(memberId) {
  const member = getMemberById(memberId);
  if (!member || !member.alive) return;
  state.selectedMemberId = memberId;
  render();
}

function attemptMove(dx, dy) {
  if (state.gameOver || isMotionBusy()) return;
  const nx = state.player.x + dx;
  const ny = state.player.y + dy;

  if (isWall(nx, ny)) {
    logMessage("Stone blocks the way.", "danger");
    setFlash();
    render();
    return;
  }

  const enemy = getEnemyAt(nx, ny);
  if (enemy) {
    logMessage(`The ${ENEMY_TYPES[enemy.type].name} bars your path.`, "danger");
    enemyTurn();
    advanceTurn(true);
    return;
  }

  if (getTile(nx, ny) === "E" && !state.player.key) {
    logMessage("An argent seal denies passage. The Moon Key must be nearby.", "danger");
    render();
    return;
  }

  state.player.x = nx;
  state.player.y = ny;
  updateThemeFromPosition();
  revealAroundPlayer();
  collectItem();
  sync3DState();

  if (getTile(nx, ny) === "E" && state.player.key) {
    state.victory = true;
    state.gameOver = true;
    logMessage("The Moon Key turns. Dawn spills into the stairwell. You escaped the depths.", "success");
    render();
    return;
  }

  advanceTurn(true);
}

function moveForward(step = 1) {
  const dir = DIRS[state.player.dir];
  attemptMove(dir.x * step, dir.y * step);
}

function strafe(side) {
  const dir = DIRS[state.player.dir];
  attemptMove(dir.y * side, -dir.x * side);
}

function turnPlayer(delta) {
  if (state.gameOver || isMotionBusy()) return;
  state.player.dir = (state.player.dir + delta + DIRS.length) % DIRS.length;
  sync3DState();
  advanceTurn(true);
}

function enemyTurn() {
  if (state.gameOver || getLivingParty().length === 0) return;
  const threats = state.enemies.filter((enemy) => enemy.alive && Math.abs(enemy.x - state.player.x) + Math.abs(enemy.y - state.player.y) === 1);
  threats.forEach((enemy) => {
    const livingParty = getLivingParty();
    if (livingParty.length === 0) return;
    const target = livingParty[Math.floor(Math.random() * livingParty.length)];
    const damage = Math.max(0, roll(ENEMY_TYPES[enemy.type].attack) - state.effects.damageShield);
    target.hp -= damage;
    setFlash();
    if (target.hp <= 0) {
      target.hp = 0;
      target.alive = false;
      logMessage(`The ${ENEMY_TYPES[enemy.type].name} fells ${target.name} with a ${damage} damage blow.`, "danger");
    } else {
      logMessage(`The ${ENEMY_TYPES[enemy.type].name} strikes ${target.name} for ${damage}.`, "danger");
    }
  });

  state.effects.damageShield = 0;
  if (getLivingParty().length === 0) {
    state.gameOver = true;
    logMessage("The whole party falls silent. The keep claims another expedition.", "danger");
  }
}

function attack() {
  if (state.gameOver) return;
  const livingParty = getLivingParty();
  if (livingParty.length === 0) return;

  const dir = DIRS[state.player.dir];
  const target = getEnemyAt(state.player.x + dir.x, state.player.y + dir.y);
  state.animation.swingUntil = state.animation.time + 220;

  if (!target) {
    logMessage("Your swing cuts only stale air.", "danger");
    enemyTurn();
    advanceTurn(true);
    return;
  }

  const attackers = livingParty.map((member) => ({ name: member.name, damage: roll(member.attack) }));
  const damage = attackers.reduce((total, attacker) => total + attacker.damage, 0) + state.effects.nextAttackBonus;
  target.hp -= damage;
  const bonusText = state.effects.nextAttackBonus > 0 ? ` plus ${state.effects.nextAttackBonus} from Vanguard Cry` : "";
  logMessage(
    `${attackers.map((attacker) => `${attacker.name} ${attacker.damage}`).join(", ")}${bonusText}. The party hits the ${ENEMY_TYPES[target.type].name} for ${damage}.`,
    "important"
  );
  state.effects.nextAttackBonus = 0;
  setFlash();
  const hitMesh = world.enemyMeshes.get(target.id);
  if (hitMesh) {
    spawnParticleBurst(hitMesh.position.clone().add(new BABYLON.Vector3(0, 0.2, 0)), "#f6c37e", 12, 0.14, 0.07, 0.07);
  }

  if (target.hp <= 0) {
    target.alive = false;
    const gold = roll([6, 15]);
    state.player.gold += gold;
    logMessage(`The ${ENEMY_TYPES[target.type].name} falls, dropping ${gold} gold.`, "success");
  } else {
    enemyTurn();
  }

  sync3DState();
  advanceTurn(true);
}

function drinkPotion() {
  if (state.gameOver) return;
  if (state.player.potions <= 0) {
    logMessage("Your satchel is dry.", "danger");
    render();
    return;
  }

  const target = getSelectedMember();
  if (!target || target.hp >= target.maxHp) {
    logMessage("Select a wounded ally before using a potion.", "danger");
    render();
    return;
  }

  state.player.potions -= 1;
  const healing = roll([10, 16]);
  target.hp = Math.min(target.maxHp, target.hp + healing);
  setFlash();
  spawnParticleBurst(world.heroAnchor.position.clone().add(new BABYLON.Vector3(0, 1.2, 0)), "#8ad5a0", 10, 0.18, 0.04, 0.06);
  logMessage(`Warm light knits ${target.name}'s wounds for ${healing} health.`, "success");
  enemyTurn();
  advanceTurn(true);
}

function getAbilityTargetEnemy() {
  const dir = DIRS[state.player.dir];
  for (let depth = 1; depth <= 3; depth += 1) {
    const x = state.player.x + dir.x * depth;
    const y = state.player.y + dir.y * depth;
    const enemy = getEnemyAt(x, y);
    if (enemy) return enemy;
    if (getTile(x, y) === "#") break;
  }
  return null;
}

function useAbility(memberId = state.selectedMemberId) {
  if (state.gameOver) return;
  const member = getMemberById(memberId);
  if (!member || !member.alive) {
    logMessage("That hero cannot act right now.", "danger");
    render();
    return;
  }
  if (member.cooldown > 0) {
    logMessage(`${member.name}'s ${member.ability.name} is recharging for ${member.cooldown} more turn(s).`, "danger");
    render();
    return;
  }

  let spentTurn = true;
  if (member.ability.type === "buff") {
    state.effects.nextAttackBonus += 4;
    setFlash();
    spawnParticleBurst(world.heroAnchor.position.clone().add(new BABYLON.Vector3(0, 1.3, 0)), "#efb965", 10, 0.18, 0.04, 0.06);
    logMessage(`${member.name} uses Vanguard Cry. The next party strike gains +4 power.`, "success");
  } else if (member.ability.type === "guard") {
    state.effects.damageShield = 2;
    setFlash();
    spawnParticleBurst(world.heroAnchor.position.clone().add(new BABYLON.Vector3(0, 1.1, 0)), "#8ab8d6", 10, 0.16, 0.03, 0.05);
    logMessage(`${member.name} raises Bulwark. The next enemy assault is reduced by 2 damage per hit.`, "success");
  } else if (member.ability.type === "heal") {
    const target = getSelectedMember();
    if (!target || target.hp >= target.maxHp) {
      logMessage("Select a wounded ally for Radiant Mend.", "danger");
      spentTurn = false;
    } else {
      const healing = roll([8, 14]);
      target.hp = Math.min(target.maxHp, target.hp + healing);
      setFlash();
      spawnParticleBurst(world.heroAnchor.position.clone().add(new BABYLON.Vector3(0, 1.25, 0)), "#f1e28f", 14, 0.18, 0.05, 0.06);
      logMessage(`${member.name} channels Radiant Mend into ${target.name} for ${healing} health.`, "success");
    }
  } else if (member.ability.type === "spell") {
    const target = getAbilityTargetEnemy();
    if (!target) {
      logMessage("Arcane Bolt needs a visible foe in the corridor.", "danger");
      spentTurn = false;
    } else {
      const damage = roll([8, 13]);
      target.hp -= damage;
      setFlash();
      const hitMesh = world.enemyMeshes.get(target.id);
      if (hitMesh) {
        spawnParticleBurst(hitMesh.position.clone().add(new BABYLON.Vector3(0, 0.25, 0)), "#9baef5", 16, 0.18, 0.08, 0.06);
      }
      logMessage(`${member.name} hurls Arcane Bolt for ${damage} into the ${ENEMY_TYPES[target.type].name}.`, "important");
      if (target.hp <= 0) {
        target.alive = false;
        const gold = roll([6, 15]);
        state.player.gold += gold;
        logMessage(`The ${ENEMY_TYPES[target.type].name} collapses under the spell, dropping ${gold} gold.`, "success");
      }
      sync3DState();
    }
  }

  if (!spentTurn) {
    render();
    return;
  }

  member.cooldown = member.ability.cooldown + 1;
  enemyTurn();
  advanceTurn(true);
}

function advanceTurn(countTurn) {
  if (countTurn) {
    state.turn += 1;
    state.party.forEach((member) => {
      member.cooldown = Math.max(0, member.cooldown - 1);
    });
  }
  render();
}

function renderParty() {
  partyPanel.innerHTML = "";
  state.party.forEach((member) => {
    const hpPercent = Math.max(0, (member.hp / member.maxHp) * 100);
    const card = document.createElement("article");
    card.className = `party-card ${member.alive ? "" : "fallen"} ${state.selectedMemberId === member.id ? "selected" : ""}`.trim();

    const portrait = document.createElement("div");
    portrait.className = "portrait";
    portrait.style.setProperty("--portrait", member.color);
    portrait.title = `Select ${member.name}`;
    portrait.addEventListener("click", () => selectMember(member.id));

    const portraitImage = document.createElement("img");
    portraitImage.className = "portrait-image";
    portraitImage.src = member.portrait;
    portraitImage.alt = `${member.name} portrait`;
    portrait.appendChild(portraitImage);

    const info = document.createElement("div");
    info.className = "party-info";

    const head = document.createElement("div");
    head.className = "party-head";
    head.innerHTML = `<strong>${member.name}</strong><span class="party-role">${member.role}</span>`;

    const bars = document.createElement("div");
    bars.className = "member-bars";
    bars.innerHTML = `
      <div class="hp-bar"><div class="hp-fill" style="width: ${hpPercent}%"></div></div>
      <div class="party-role">${member.alive ? `${member.hp}/${member.maxHp} HP` : "Fallen"}</div>
    `;

    const meta = document.createElement("div");
    meta.className = "member-meta";
    meta.innerHTML = `
      <div>Attack<strong>${member.attack[0]}-${member.attack[1]}</strong></div>
      <div>Status<strong>${member.alive ? "Ready" : "Down"}</strong></div>
      <div>Spell<strong>${member.ability.name}</strong></div>
    `;

    const actions = document.createElement("div");
    actions.className = "member-actions";
    const button = document.createElement("button");
    button.textContent = member.cooldown > 0 ? `${member.ability.name} (${member.cooldown})` : member.ability.name;
    button.disabled = !member.alive || member.cooldown > 0 || state.gameOver;
    button.addEventListener("click", () => useAbility(member.id));
    const text = document.createElement("span");
    text.textContent = member.ability.type === "heal" ? "Targeted spell" : member.ability.type === "spell" ? "Ranged magic" : "Battle skill";
    actions.append(button, text);

    info.append(head, bars, meta, actions);
    card.append(portrait, info);
    partyPanel.appendChild(card);
  });
}

function renderLog() {
  logEl.innerHTML = "";
  state.log.forEach((entry) => {
    const row = document.createElement("div");
    row.className = `log-entry ${entry.tone}`.trim();
    row.textContent = entry.text;
    logEl.appendChild(row);
  });
}

function renderMinimap() {
  const size = minimap.width;
  mapCtx.clearRect(0, 0, size, size);
  mapCtx.fillStyle = "#120f0d";
  mapCtx.fillRect(0, 0, size, size);
  const cell = size / state.width;

  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      if (!state.revealed.has(tileKey(x, y))) continue;
      const tile = getTile(x, y);
      mapCtx.fillStyle = tile === "#" ? "#31241e" : "#7a6547";
      if (tile === "E") mapCtx.fillStyle = state.player.key ? "#9dc8a1" : "#8f7f99";
      mapCtx.fillRect(x * cell, y * cell, cell - 1, cell - 1);

      const enemy = getEnemyAt(x, y);
      const item = getItemAt(x, y);
      if (enemy) {
        mapCtx.fillStyle = ENEMY_TYPES[enemy.type].color;
        mapCtx.fillRect(x * cell + cell * 0.25, y * cell + cell * 0.25, cell * 0.5, cell * 0.5);
      } else if (item) {
        mapCtx.fillStyle = ITEM_TYPES[item.type].color;
        mapCtx.beginPath();
        mapCtx.arc(x * cell + cell / 2, y * cell + cell / 2, cell * 0.18, 0, Math.PI * 2);
        mapCtx.fill();
      }
    }
  }

  const px = state.player.x * cell + cell / 2;
  const py = state.player.y * cell + cell / 2;
  mapCtx.fillStyle = "#f2dcb4";
  mapCtx.beginPath();
  mapCtx.arc(px, py, cell * 0.26, 0, Math.PI * 2);
  mapCtx.fill();

  const dir = DIRS[state.player.dir];
  mapCtx.strokeStyle = "#f2a94e";
  mapCtx.lineWidth = 3;
  mapCtx.beginPath();
  mapCtx.moveTo(px, py);
  mapCtx.lineTo(px + dir.x * cell * 0.5, py + dir.y * cell * 0.5);
  mapCtx.stroke();
}

function renderStats() {
  const totals = getPartyHealthTotals();
  const attackRange = getPartyAttackRange();
  statEls.health.textContent = `${totals.hp}/${totals.maxHp}`;
  statEls.attack.textContent = `${attackRange.min}-${attackRange.max}`;
  statEls.potions.textContent = state.player.potions;
  statEls.gold.textContent = state.player.gold;
  facingLabel.textContent = `Facing ${DIRS[state.player.dir].name}`;
  objectiveLabel.textContent = state.player.key ? "Reach the Exit" : "Find the Moon Key";
  turnCounter.textContent = `Turn ${state.turn}`;
  partySummary.textContent = `${getLivingParty().length} Adventurers Standing`;
  attackBtn.disabled = state.gameOver;
  potionBtn.disabled = state.gameOver;
  abilityBtn.disabled = state.gameOver || !getSelectedMember();
  const selected = getSelectedMember();
  abilityBtn.textContent = selected ? selected.ability.name : "Use Ability";
  selectionHint.textContent = selected
    ? `Selected target: ${selected.name}. Click a portrait to choose potion and healing-spell targets, or use the member buttons for class abilities.`
    : "No adventurers remain.";
}

function render() {
  renderStats();
  renderParty();
  renderMinimap();
  renderLog();
  sync3DState();
}

function handleAction(action) {
  const actions = {
    forward: () => moveForward(1),
    backward: () => moveForward(-1),
    "turn-left": () => turnPlayer(-1),
    "turn-right": () => turnPlayer(1),
    "strafe-left": () => strafe(-1),
    "strafe-right": () => strafe(1),
  };
  if (actions[action]) actions[action]();
}

function initGameState() {
  state.map = MAP_TEMPLATE.map((row) => row.split(""));
  state.width = state.map[0].length;
  state.height = state.map.length;
  state.enemies = [];
  state.items = [];
  state.party = PARTY_TEMPLATE.map((member) => ({ ...member, hp: member.maxHp, alive: true, cooldown: 0 }));
  state.selectedMemberId = state.party[0].id;
  state.revealed = new Set();
  state.log = [];
  state.turn = 0;
  state.exitUnlocked = false;
  state.gameOver = false;
  state.victory = false;
  state.effects.nextAttackBonus = 0;
  state.effects.damageShield = 0;
  state.animation.swingUntil = 0;
  state.animation.flashUntil = 0;

  for (let y = 0; y < state.height; y += 1) {
    for (let x = 0; x < state.width; x += 1) {
      const tile = state.map[y][x];
      if (tile === "S") {
        state.player = { x, y, dir: 1, potions: 2, gold: 0, key: false };
        state.currentThemeId = LEVEL_THEMES[getThemeIndexForY(y)].id;
        state.map[y][x] = ".";
      } else if (ENEMY_TYPES[tile]) {
        state.enemies.push({ id: `enemy-${x}-${y}`, x, y, type: tile, hp: ENEMY_TYPES[tile].hp, alive: true });
        state.map[y][x] = ".";
      } else if (ITEM_TYPES[tile]) {
        state.items.push({ id: `item-${x}-${y}`, x, y, type: tile, taken: false });
        state.map[y][x] = ".";
      }
    }
  }
}

function initGame() {
  initGameState();
  if (!world.engine) {
    setup3D();
  }
  rebuildScene();
  revealAroundPlayer();
  sync3DState(true);
  logMessage("Torchlight returns to the old keep. Reach the exit with the Moon Key.", "important");
  render();
}

document.querySelectorAll("[data-action]").forEach((button) => {
  button.addEventListener("click", () => handleAction(button.dataset.action));
});

attackBtn.addEventListener("click", attack);
potionBtn.addEventListener("click", drinkPotion);
abilityBtn.addEventListener("click", () => useAbility());
restartBtn.addEventListener("click", initGame);

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (["w", "a", "s", "d", "q", "e", " ", "r"].includes(key) || event.code === "Space") {
    event.preventDefault();
  }
  if (key === "w") moveForward(1);
  else if (key === "s") moveForward(-1);
  else if (key === "a") strafe(-1);
  else if (key === "d") strafe(1);
  else if (key === "q") turnPlayer(-1);
  else if (key === "e") turnPlayer(1);
  else if (key === "r") drinkPotion();
  else if (key === " " || event.code === "Space") attack();
});

initGame();
