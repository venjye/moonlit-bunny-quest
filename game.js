const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");
const boardWrap = document.querySelector(".board-wrap");
const SAVE_KEY = "bunny_adventure_save_v1";
const SAVE_SLOT_PREFIX = "bunny_adventure_save_slot_v2:";
const LAST_SAVE_CODE_KEY = "bunny_adventure_last_save_code_v2";
const LAST_SAVE_CODE_COOKIE = "bunnyAdventureLastSaveCode";
const TAU = Math.PI * 2;

const ui = {
  title: document.querySelector("#game-title"),
  hook: document.querySelector("#game-hook"),
  floorLabel: document.querySelector("#floor-label"),
  hpLabel: document.querySelector("#hp-label"),
  atkLabel: document.querySelector("#atk-label"),
  defLabel: document.querySelector("#def-label"),
  goldLabel: document.querySelector("#gold-label"),
  keysLabel: document.querySelector("#keys-label"),
  mobileHpLabel: document.querySelector("#mobile-hp-label"),
  mobileAtkLabel: document.querySelector("#mobile-atk-label"),
  mobileDefLabel: document.querySelector("#mobile-def-label"),
  mobileGoldLabel: document.querySelector("#mobile-gold-label"),
  mobileKeysLabel: document.querySelector("#mobile-keys-label"),
  chapterLabel: document.querySelector("#chapter-label"),
  rankLabel: document.querySelector("#rank-label"),
  statusLabel: document.querySelector("#status-label"),
  objectiveText: document.querySelector("#objective-text"),
  storybeatText: document.querySelector("#storybeat-text"),
  previewText: document.querySelector("#preview-text"),
  heroDetailList: document.querySelector("#hero-detail-list"),
  handbookList: document.querySelector("#handbook-list"),
  eventLog: document.querySelector("#event-log"),
  progressBar: document.querySelector("#progress-bar"),
  progressDetail: document.querySelector("#progress-detail"),
  restartButton: document.querySelector("#restart-button"),
  inspectButton: document.querySelector("#inspect-button"),
  saveButton: document.querySelector("#save-button"),
  loadButton: document.querySelector("#load-button"),
  saveCodeInput: document.querySelector("#save-code-input"),
  saveCodeHint: document.querySelector("#save-code-hint"),
  endingPanel: document.querySelector("#ending-panel"),
  endingEyebrow: document.querySelector("#ending-eyebrow"),
  endingTitle: document.querySelector("#ending-title"),
  endingSummary: document.querySelector("#ending-summary"),
  endingRestartButton: document.querySelector("#ending-restart-button"),
  endingCloseButton: document.querySelector("#ending-close-button"),
  shopPanel: document.querySelector("#shop-panel"),
  shopTitle: document.querySelector("#shop-title"),
  shopGreeting: document.querySelector("#shop-greeting"),
  shopOffers: document.querySelector("#shop-offers"),
  shopCloseButton: document.querySelector("#shop-close-button"),
  modeButtons: Array.from(document.querySelectorAll(".mode-button")),
  sheetButtons: Array.from(document.querySelectorAll("[data-target]")),
  touchButtons: Array.from(document.querySelectorAll(".touch-button")),
  sheets: {
    journal: document.querySelector("#journal-sheet"),
    guide: document.querySelector("#guide-sheet"),
  },
};

const TILE_TYPES = {
  EMPTY: "empty",
  WALL: "wall",
  STAIRS: "stairs",
  ENEMY: "enemy",
  ITEM: "item",
  DOOR: "door",
  NPC: "npc",
  STORY: "story",
};

const ITEM_DEFS = {
  yellowKey: { label: "黄钥匙", color: "#f2c867" },
  blueKey: { label: "蓝钥匙", color: "#87baff" },
  redKey: { label: "红钥匙", color: "#f28ca6" },
  potion: { label: "月露药水", color: "#84dbc6" },
  atkGem: { label: "胡萝卜锋晶", color: "#f0b063" },
  defGem: { label: "绒盾结晶", color: "#a5d0ff" },
  gold: { label: "月糖金币", color: "#f6d482" },
};

const DIRECTION_MAP = {
  arrowup: { x: 0, y: -1 },
  w: { x: 0, y: -1 },
  arrowdown: { x: 0, y: 1 },
  s: { x: 0, y: 1 },
  arrowleft: { x: -1, y: 0 },
  a: { x: -1, y: 0 },
  arrowright: { x: 1, y: 0 },
  d: { x: 1, y: 0 },
};

const RANKS = ["月塔新手", "绒斗旅者", "银钥行者", "夜桥破阵者", "晨铃回收官", "塔顶归兔人"];

const state = {
  config: null,
  modeKey: "story",
  floorIndex: 0,
  hero: null,
  floors: {
    story: [],
    adventure: [],
    endless: [],
  },
  logs: [],
  seedBase: 0,
  ending: null,
  shopContext: null,
  feedbacks: [],
};

let animationFrameId = 0;

function shouldUseTouchLayout() {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const userAgent = navigator.userAgent || "";
  const coarsePointer = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
  const touchCapable =
    navigator.maxTouchPoints > 0 ||
    "ontouchstart" in window ||
    /ipad|iphone|android|mobile/i.test(userAgent);
  const tabletViewport =
    viewportWidth <= 1366 &&
    viewportHeight >= 900 &&
    viewportHeight <= 1400 &&
    Math.min(viewportWidth, viewportHeight) <= 1180;
  return viewportWidth <= 720 || ((coarsePointer || touchCapable || tabletViewport) && viewportWidth <= 1366);
}

function syncBoardFrame() {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const isTouchLayout = shouldUseTouchLayout();
  document.body.classList.toggle("is-touch-layout", isTouchLayout);
  const topRect = document.querySelector(".floating-top").getBoundingClientRect();
  const quickbarRect = document.querySelector(".mobile-quickbar").getBoundingClientRect();
  const touchRect = document.querySelector(".touch-controls").getBoundingClientRect();
  const statsRect = document.querySelector(".floating-stats").getBoundingClientRect();

  if (isTouchLayout) {
    const topSpace = Math.max(0, topRect.bottom + 10);
    const bottomAnchors = [touchRect.top, quickbarRect.top].filter((value) => value > 0);
    const bottomSpace = Math.max(topSpace + 220, Math.min(...bottomAnchors, viewportHeight) - 10);
    const availableWidth = Math.max(220, viewportWidth - 16);
    const availableHeight = Math.max(180, bottomSpace - topSpace);
    const size = Math.floor(Math.min(availableWidth, availableHeight));
    boardWrap.style.width = `${size}px`;
    boardWrap.style.height = `${size}px`;
    boardWrap.style.left = `${Math.floor((viewportWidth - size) / 2)}px`;
    boardWrap.style.top = `${Math.floor(topSpace + Math.max(0, (availableHeight - size) / 2))}px`;
    return;
  }

  const topSpace = Math.max(topRect.bottom, statsRect.bottom) + 18;
  const sidePad = viewportWidth > 1180 ? 280 : 28;
  const bottomPad = 48;
  const availableWidth = Math.max(280, viewportWidth - sidePad * 2);
  const availableHeight = Math.max(280, viewportHeight - topSpace - bottomPad);
  const size = Math.floor(Math.min(availableWidth, availableHeight, 860));
  boardWrap.style.width = `${size}px`;
  boardWrap.style.height = `${size}px`;
  boardWrap.style.left = `${Math.floor((viewportWidth - size) / 2)}px`;
  boardWrap.style.top = `${Math.floor(topSpace + Math.max(0, (availableHeight - size) / 2))}px`;
}

function seeded(seed) {
  let current = seed >>> 0;
  return () => {
    current = (current * 1664525 + 1013904223) >>> 0;
    return current / 4294967296;
  };
}

function pick(list, random) {
  return list[Math.floor(random() * list.length)];
}

function gridConfig() {
  return state.config.grid;
}

function addLog(text) {
  state.logs.unshift(text);
  state.logs = state.logs.slice(0, 8);
  ui.eventLog.innerHTML = "";
  state.logs.forEach((line) => {
    const item = document.createElement("li");
    item.textContent = line;
    ui.eventLog.appendChild(item);
  });
}

function readCookie(name) {
  const match = document.cookie
    .split("; ")
    .find((item) => item.startsWith(`${encodeURIComponent(name)}=`));
  return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : "";
}

function writeCookie(name, value) {
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; max-age=31536000; path=/; SameSite=Lax`;
}

function normalizeSaveCode(value) {
  return value.trim().slice(0, 40);
}

function saveSlotKey(code) {
  return `${SAVE_SLOT_PREFIX}${encodeURIComponent(code)}`;
}

function lastSaveCode() {
  return localStorage.getItem(LAST_SAVE_CODE_KEY) || readCookie(LAST_SAVE_CODE_COOKIE);
}

function rememberSaveCode(code) {
  localStorage.setItem(LAST_SAVE_CODE_KEY, code);
  writeCookie(LAST_SAVE_CODE_COOKIE, code);
}

function currentSaveCode() {
  return normalizeSaveCode(ui.saveCodeInput.value);
}

function setSaveCodeStatus(text) {
  ui.saveCodeHint.textContent = text;
  ui.previewText.textContent = text;
}

function createSnapshot() {
  return {
    version: 2,
    savedAt: Date.now(),
    modeKey: state.modeKey,
    floorIndex: state.floorIndex,
    hero: state.hero,
    floors: state.floors,
    logs: state.logs,
    seedBase: state.seedBase,
  };
}

function applySnapshot(snapshot) {
  state.modeKey = snapshot.modeKey;
  state.floorIndex = snapshot.floorIndex;
  state.hero = snapshot.hero;
  state.floors = snapshot.floors;
  state.logs = Array.isArray(snapshot.logs) ? snapshot.logs : [];
  state.seedBase = snapshot.seedBase || state.config.seed;
  state.ending = null;
  state.shopContext = null;
  state.feedbacks = [];
  addLog(`读档回到 ${state.floorIndex + 1}F`);
  inspectAround();
  syncUi();
  render();
}

function readSnapshot(raw) {
  try {
    const snapshot = JSON.parse(raw);
    if (!snapshot || !snapshot.hero || !snapshot.floors || !snapshot.modeKey) {
      return null;
    }
    return snapshot;
  } catch {
    return null;
  }
}

function initSaveCode() {
  const code = lastSaveCode();
  if (!code) {
    setSaveCodeStatus("输入一个存档码，点“继续”读取；没有存档时会从新局开始。");
    return;
  }

  ui.saveCodeInput.value = code;
  if (localStorage.getItem(saveSlotKey(code))) {
    setSaveCodeStatus(`已记住存档码“${code}”，点“继续”回到上次进度。`);
    return;
  }

  setSaveCodeStatus(`已记住存档码“${code}”，但这个码还没有本地存档。`);
}

function createHero() {
  const source = state.config.player;
  return {
    x: 1,
    y: gridConfig().rows - 2,
    hp: source.hp,
    atk: source.atk,
    def: source.def,
    gold: source.gold,
    keys: {
      yellow: source.keys.yellow,
      blue: source.keys.blue,
      red: source.keys.red,
    },
  };
}

function currentFloor() {
  return state.floors[state.modeKey][state.floorIndex];
}

function totalFloors() {
  if (state.modeKey === "endless") {
    return state.floorIndex + 1;
  }
  return state.config.modes[state.modeKey].floorCount;
}

function heroRank() {
  const score = state.floorIndex + Math.floor((state.hero.atk + state.hero.def) / 70);
  return RANKS[Math.min(RANKS.length - 1, Math.floor(score / 4))];
}

function createEmptyFloorMap() {
  const { cols, rows } = gridConfig();
  return Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => ({ type: TILE_TYPES.EMPTY })),
  );
}

function isInside(x, y) {
  const { cols, rows } = gridConfig();
  return x >= 0 && y >= 0 && x < cols && y < rows;
}

function tileAt(floor, x, y) {
  if (!isInside(x, y)) {
    return { type: TILE_TYPES.WALL };
  }
  return floor.map[y][x];
}

function setTile(floor, x, y, tile) {
  floor.map[y][x] = tile;
}

function floorSeed(modeKey, index) {
  return state.seedBase + index * 977 + modeKey.length * 131;
}

function makeEnemy(index, random, isBoss = false) {
  const source = isBoss ? pick(state.config.bosses, random) : pick(state.config.enemies, random);
  const scale = isBoss ? 1 + index * 0.1 : 1 + index * 0.06;
  return {
    ...source,
    hp: Math.round(source.hp * scale),
    atk: Math.round(source.atk * scale),
    def: Math.round(source.def * scale),
    gold: Math.round(source.gold * (1 + index * 0.04)),
  };
}

const MAGIC_TOWER_LAYOUTS = [
  [
    "WWWWWWWWWWW",
    "Wg..E..Y.UW",
    "W.WWW.WWW.W",
    "Wy..E..g..W",
    "W.WWW.WWW.W",
    "W..Np...T.W",
    "W.WWW.WWW.W",
    "W..E..a.d.W",
    "W.WWW.WWW.W",
    "WS..y..p..W",
    "WWWWWWWWWWW",
  ],
  [
    "WWWWWWWWWWW",
    "WU.Y..E.g.W",
    "W.WWW.WWW.W",
    "W..p..B.b.W",
    "WWW.W.WWW.W",
    "W..E..N...W",
    "W.WWW.WWW.W",
    "W.r.R..d..W",
    "W.WWW.WWW.W",
    "WS.y..T.a.W",
    "WWWWWWWWWWW",
  ],
  [
    "WWWWWWWWWWW",
    "W..g.X.R.UW",
    "W.WWW.WWW.W",
    "W.b.B..p..W",
    "WWW.W.WWW.W",
    "W..E..N...W",
    "W.WWW.WWW.W",
    "W..a.Y.E..W",
    "W.WWW.WWW.W",
    "WS.y..T.d.W",
    "WWWWWWWWWWW",
  ],
  [
    "WWWWWWWWWWW",
    "W..E.Y.X.UW",
    "W.WWW.WWW.W",
    "W.r.R..g..W",
    "WWW.W.WWW.W",
    "W..p..N...W",
    "W.WWW.WWW.W",
    "W.b.B..E..W",
    "W.WWW.WWW.W",
    "WS.y.T.ad.W",
    "WWWWWWWWWWW",
  ],
];

function rewardValue(item, index) {
  if (item === "potion") return 160 + index * 18;
  if (item === "gold") return 14 + index * 4;
  return 6 + Math.floor(index / 5) * 2;
}

function tileFromMarker(marker, index, random, floor) {
  if (marker === "W") return { type: TILE_TYPES.WALL };
  if (marker === "U") return { type: TILE_TYPES.STAIRS };
  if (marker === "Y") return { type: TILE_TYPES.DOOR, color: "yellow" };
  if (marker === "B") return { type: TILE_TYPES.DOOR, color: "blue" };
  if (marker === "R") return { type: TILE_TYPES.DOOR, color: "red" };
  if (marker === "y") return { type: TILE_TYPES.ITEM, item: "yellowKey", value: 1 };
  if (marker === "b") return { type: TILE_TYPES.ITEM, item: "blueKey", value: 1 };
  if (marker === "r") return { type: TILE_TYPES.ITEM, item: "redKey", value: 1 };
  if (marker === "p") return { type: TILE_TYPES.ITEM, item: "potion", value: rewardValue("potion", index) };
  if (marker === "a") return { type: TILE_TYPES.ITEM, item: "atkGem", value: rewardValue("atkGem", index) };
  if (marker === "d") return { type: TILE_TYPES.ITEM, item: "defGem", value: rewardValue("defGem", index) };
  if (marker === "g") return { type: TILE_TYPES.ITEM, item: "gold", value: rewardValue("gold", index) };
  if (marker === "E") return { type: TILE_TYPES.ENEMY, enemy: makeEnemy(index + random(), random, false) };
  if (marker === "X") return { type: TILE_TYPES.ENEMY, enemy: makeEnemy(index + 1, random, true) };
  if (marker === "N") {
    const shop = pick(state.config.shops, random);
    return {
      type: TILE_TYPES.NPC,
      npc: {
        kind: "shop",
        title: shop.title,
        greeting: shop.greeting,
        offers: shop.offers,
        bought: false,
      },
    };
  }
  if (marker === "T") return { type: TILE_TYPES.STORY, text: floor.storyBeat };
  return { type: TILE_TYPES.EMPTY };
}

function buildFloor(modeKey, index) {
  const { cols, rows } = gridConfig();
  const random = seeded(floorSeed(modeKey, index));
  const biome = state.config.biomes[index % state.config.biomes.length];
  const template = MAGIC_TOWER_LAYOUTS[index % MAGIC_TOWER_LAYOUTS.length];
  const map = createEmptyFloorMap();

  const floor = {
    index,
    biome,
    map,
    chapter:
      modeKey === "story"
        ? `第 ${index + 1} 夜`
        : modeKey === "adventure"
          ? `冒险 ${index + 1}F`
          : `无尽 ${index + 1}F`,
    title:
      modeKey === "story"
        ? `归兔卷 · ${index + 1}F`
        : modeKey === "adventure"
          ? `月塔长阶 · ${index + 1}F`
          : `夜雾深层 · ${index + 1}F`,
    objective:
      modeKey === "story"
        ? `向上收集月铃碎片，并在这一层找到姐姐留下的线索。`
        : modeKey === "adventure"
          ? `像经典魔塔一样规划资源，安全抵达楼梯。`
          : `持续生存，能上就上。`,
    storyBeat:
      modeKey === "story"
        ? state.config.storyBeats[Math.min(index, state.config.storyBeats.length - 1)]
        : state.config.modes[modeKey].description,
    start: { x: 1, y: rows - 2 },
    exit: { x: cols - 2, y: 1 },
  };

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const marker = template[y]?.[x] || "W";
      if (marker === "S") {
        floor.start = { x, y };
        setTile(floor, x, y, { type: TILE_TYPES.EMPTY });
        continue;
      }
      if (marker === "U") {
        floor.exit = { x, y };
      }
      setTile(floor, x, y, tileFromMarker(marker, index, random, floor));
    }
  }

  return floor;
}

function ensureFloors(modeKey, neededIndex = 0) {
  if (modeKey === "endless") {
    while (state.floors.endless.length <= neededIndex) {
      state.floors.endless.push(buildFloor("endless", state.floors.endless.length));
    }
    return;
  }

  const wanted = state.config.modes[modeKey].floorCount;
  if (state.floors[modeKey].length === wanted) {
    return;
  }
  state.floors[modeKey] = Array.from({ length: wanted }, (_, index) => buildFloor(modeKey, index));
}

function combatPreview(hero, enemy) {
  const heroDamage = hero.atk - enemy.def;
  if (heroDamage <= 0) {
    return { canWin: false, damage: Infinity, rounds: Infinity };
  }
  const rounds = Math.ceil(enemy.hp / heroDamage);
  const enemyDamage = Math.max(0, enemy.atk - hero.def);
  const totalDamage = enemyDamage * Math.max(0, rounds - 1);
  return {
    canWin: hero.hp > totalDamage,
    damage: totalDamage,
    rounds,
  };
}

function doorName(color) {
  return `${color === "yellow" ? "黄" : color === "blue" ? "蓝" : "红"}门`;
}

function itemLabel(item) {
  return ITEM_DEFS[item]?.label || item;
}

function keysText(keys, compact = false) {
  return compact
    ? `黄${keys.yellow} 蓝${keys.blue} 红${keys.red}`
    : `黄钥 ${keys.yellow} / 蓝钥 ${keys.blue} / 红钥 ${keys.red}`;
}

function applyItem(tile) {
  switch (tile.item) {
    case "yellowKey":
      state.hero.keys.yellow += 1;
      break;
    case "blueKey":
      state.hero.keys.blue += 1;
      break;
    case "redKey":
      state.hero.keys.red += 1;
      break;
    case "potion":
      state.hero.hp += tile.value;
      break;
    case "atkGem":
      state.hero.atk += tile.value;
      break;
    case "defGem":
      state.hero.def += tile.value;
      break;
    case "gold":
      state.hero.gold += tile.value;
      break;
    default:
      break;
  }
  addLog(`获得 ${itemLabel(tile.item)}`);
  ui.statusLabel.textContent = `露娜拿到了${itemLabel(tile.item)}。`;
}

function syncUi() {
  const floor = currentFloor();
  const ratio = state.modeKey === "endless" ? 1 : (state.floorIndex + 1) / totalFloors();
  ui.title.textContent = state.config.title;
  ui.hook.textContent = state.config.hook;
  ui.floorLabel.textContent = `${state.floorIndex + 1}F`;
  ui.hpLabel.textContent = String(state.hero.hp);
  ui.atkLabel.textContent = String(state.hero.atk);
  ui.defLabel.textContent = String(state.hero.def);
  ui.goldLabel.textContent = String(state.hero.gold);
  ui.keysLabel.textContent = keysText(state.hero.keys, true);
  ui.mobileHpLabel.textContent = String(state.hero.hp);
  ui.mobileAtkLabel.textContent = String(state.hero.atk);
  ui.mobileDefLabel.textContent = String(state.hero.def);
  ui.mobileGoldLabel.textContent = String(state.hero.gold);
  ui.mobileKeysLabel.textContent = keysText(state.hero.keys, true);
  ui.chapterLabel.textContent = floor.chapter;
  ui.rankLabel.textContent = heroRank();
  ui.objectiveText.textContent = floor.objective;
  ui.storybeatText.textContent = floor.storyBeat;
  ui.progressBar.style.width = `${ratio * 100}%`;
  ui.progressDetail.textContent =
    state.modeKey === "endless"
      ? `已深入 ${state.floorIndex + 1} 层`
      : `${state.config.modes[state.modeKey].label} ${state.floorIndex + 1}/${totalFloors()}`;
  ui.heroDetailList.innerHTML = `
    <div><dt>生命</dt><dd>${state.hero.hp}</dd></div>
    <div><dt>攻击</dt><dd>${state.hero.atk}</dd></div>
    <div><dt>防御</dt><dd>${state.hero.def}</dd></div>
    <div><dt>金币</dt><dd>${state.hero.gold}</dd></div>
    <div><dt>钥匙</dt><dd>${keysText(state.hero.keys, true)}</dd></div>
  `;
  ui.modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === state.modeKey);
  });
  renderHandbook();
  syncShopPanel();
  syncEndingPanel();
}

function renderHandbook() {
  const floor = currentFloor();
  const handbook = new Map();
  floor.map.forEach((row) => {
    row.forEach((tile) => {
      if (tile.type !== TILE_TYPES.ENEMY) {
        return;
      }
      const existing = handbook.get(tile.enemy.name);
      if (!existing) {
        handbook.set(tile.enemy.name, tile.enemy);
      }
    });
  });

  ui.handbookList.innerHTML = "";
  if (handbook.size === 0) {
    const item = document.createElement("li");
    item.className = "handbook-item";
    item.textContent = "这一层的怪物已经清空。";
    ui.handbookList.appendChild(item);
    return;
  }

  Array.from(handbook.values())
    .sort((left, right) => left.hp - right.hp)
    .forEach((enemy) => {
      const preview = combatPreview(state.hero, enemy);
      const item = document.createElement("li");
      item.className = "handbook-item";
      item.classList.toggle("is-danger", !preview.canWin || preview.damage > state.hero.hp * 0.38);
      item.classList.toggle("is-safe", preview.canWin && preview.damage <= state.hero.hp * 0.18);
      item.innerHTML = `
        <strong>${enemy.name}</strong>
        <span>HP ${enemy.hp} / ATK ${enemy.atk} / DEF ${enemy.def}</span>
        <span>预估伤害 ${preview.damage === Infinity ? "无法破防" : preview.damage}，金币 ${enemy.gold}</span>
      `;
      ui.handbookList.appendChild(item);
    });
}

function syncShopPanel() {
  const active = Boolean(state.shopContext);
  ui.shopPanel.classList.toggle("is-open", active);
  ui.shopOffers.innerHTML = "";
  if (!active) {
    return;
  }

  const { npc } = state.shopContext;
  ui.shopTitle.textContent = npc.title;
  ui.shopGreeting.textContent = npc.greeting;
  npc.offers.forEach((offer, index) => {
    const button = document.createElement("button");
    const affordable = state.hero.gold >= offer.cost;
    button.className = "shop-offer";
    button.type = "button";
    button.disabled = !affordable;
    button.dataset.offerIndex = String(index);
    button.innerHTML = `
      <strong>${offer.label}</strong>
      <span>${offer.cost} 金币${affordable ? "" : " · 不够"}</span>
    `;
    ui.shopOffers.appendChild(button);
  });
}

function syncEndingPanel() {
  const active = Boolean(state.ending);
  ui.endingPanel.classList.toggle("is-open", active);
  if (!active) {
    return;
  }
  ui.endingEyebrow.textContent = state.ending.eyebrow;
  ui.endingTitle.textContent = state.ending.title;
  ui.endingSummary.textContent = state.ending.summary;
}

function pushFeedback(text, x, y, tone = "neutral") {
  state.feedbacks.push({
    text,
    x,
    y,
    tone,
    born: performance.now(),
  });
  state.feedbacks = state.feedbacks.slice(-8);
}

function inspectAround() {
  const floor = currentFloor();
  const previews = [];
  Object.values(DIRECTION_MAP)
    .slice(0, 4)
    .forEach(({ x, y }) => {
      const tile = tileAt(floor, state.hero.x + x, state.hero.y + y);
      if (tile.type === TILE_TYPES.ENEMY) {
        const preview = combatPreview(state.hero, tile.enemy);
        previews.push(
          `${tile.enemy.name} 伤害${preview.damage === Infinity ? "∞" : preview.damage} 回合${preview.rounds === Infinity ? "∞" : preview.rounds}`,
        );
      }
      if (tile.type === TILE_TYPES.DOOR) {
        previews.push(`${doorName(tile.color)} 需要钥匙`);
      }
      if (tile.type === TILE_TYPES.ITEM) {
        previews.push(`附近有 ${itemLabel(tile.item)}`);
      }
      if (tile.type === TILE_TYPES.NPC) {
        previews.push(`${tile.npc.title} 可以交易`);
      }
      if (tile.type === TILE_TYPES.STAIRS) {
        previews.push("楼梯就在附近");
      }
    });

  ui.previewText.textContent = previews[0] || "附近暂时没有关键目标。";
}

function openShop(npc, x, y) {
  state.shopContext = { npc, x, y };
  ui.statusLabel.textContent = `${npc.title}：自己选，别被自动花钱。`;
  ui.previewText.textContent = npc.greeting;
  syncUi();
}

function closeShop() {
  state.shopContext = null;
  syncUi();
}

function buyShopOffer(index) {
  if (!state.shopContext) {
    return;
  }

  const offer = state.shopContext.npc.offers[index];
  if (!offer) {
    return;
  }
  if (state.hero.gold < offer.cost) {
    ui.statusLabel.textContent = `金币不够，还差 ${offer.cost - state.hero.gold}。`;
    return;
  }

  state.hero.gold -= offer.cost;
  if (offer.type === "hp") state.hero.hp += offer.value;
  if (offer.type === "atk") state.hero.atk += offer.value;
  if (offer.type === "def") state.hero.def += offer.value;
  state.shopContext.npc.bought = true;
  pushFeedback(`-${offer.cost}G`, state.shopContext.x, state.shopContext.y, "gold");
  addLog(`在 ${state.shopContext.npc.title} 购买了 ${offer.label}`);
  ui.statusLabel.textContent = `${offer.label}，资源面板已更新。`;
  syncUi();
}

function interactStory(tile) {
  ui.storybeatText.textContent = tile.text;
  ui.statusLabel.textContent = "露娜记下了新的剧情线索。";
  addLog("发现了一段姐姐留下的线索");
}

function nextFloor() {
  const nextIndex = state.floorIndex + 1;
  if (state.modeKey !== "endless" && nextIndex >= totalFloors()) {
    openEnding(
      "月塔终章",
      state.modeKey === "story" ? "露娜带着月铃回家了" : "这段月塔远征完成了",
      state.modeKey === "story"
        ? "露娜终于接过姐姐守住的月铃，整座镇子的归路重新亮了起来。"
        : `你走完了 ${state.config.modes[state.modeKey].label} 的全部楼层，资源规划已经很像正统魔塔通关局。`,
    );
    ui.statusLabel.textContent = "本轮已经通关。";
    addLog("本轮通关");
    syncUi();
    return;
  }
  ensureFloors(state.modeKey, nextIndex);
  state.floorIndex = nextIndex;
  const floor = currentFloor();
  state.hero.x = floor.start.x;
  state.hero.y = floor.start.y;
  addLog(`抵达 ${floor.title}`);
  ui.statusLabel.textContent = "新的楼层已经亮起。";
  inspectAround();
  syncUi();
}

function moveHero(dx, dy) {
  if (state.ending) {
    return;
  }
  closeSheetsOnMobile();
  if (state.shopContext) {
    closeShop();
  }
  const floor = currentFloor();
  const nextX = state.hero.x + dx;
  const nextY = state.hero.y + dy;
  const tile = tileAt(floor, nextX, nextY);

  if (tile.type === TILE_TYPES.WALL) {
    ui.statusLabel.textContent = "这里是墙。";
    pushFeedback("墙", state.hero.x, state.hero.y, "blocked");
    return;
  }

  if (tile.type === TILE_TYPES.DOOR) {
    if (state.hero.keys[tile.color] <= 0) {
      ui.statusLabel.textContent = `${doorName(tile.color)} 还打不开。`;
      pushFeedback("缺钥匙", nextX, nextY, "blocked");
      return;
    }
    state.hero.keys[tile.color] -= 1;
    setTile(floor, nextX, nextY, { type: TILE_TYPES.EMPTY });
    addLog(`打开 ${doorName(tile.color)}`);
    ui.statusLabel.textContent = `${doorName(tile.color)} 已打开。`;
    pushFeedback("-1钥匙", nextX, nextY, "gold");
  }

  if (tile.type === TILE_TYPES.ENEMY) {
    const preview = combatPreview(state.hero, tile.enemy);
    if (!preview.canWin) {
      ui.statusLabel.textContent = `${tile.enemy.name} 现在打不过。`;
      ui.previewText.textContent = `${tile.enemy.name} 会造成 ${preview.damage === Infinity ? "致命" : preview.damage} 点伤害。`;
      pushFeedback("危险", nextX, nextY, "danger");
      return;
    }
    state.hero.hp -= preview.damage;
    state.hero.gold += tile.enemy.gold;
    setTile(floor, nextX, nextY, { type: TILE_TYPES.EMPTY });
    addLog(`击败 ${tile.enemy.name}`);
    ui.statusLabel.textContent = `击败 ${tile.enemy.name}，损失 ${preview.damage} 生命。`;
    pushFeedback(`-${preview.damage}HP`, nextX, nextY, preview.damage > state.hero.hp * 0.32 ? "danger" : "neutral");
  }

  if (tile.type === TILE_TYPES.ITEM) {
    applyItem(tile);
    setTile(floor, nextX, nextY, { type: TILE_TYPES.EMPTY });
  }

  if (tile.type === TILE_TYPES.NPC) {
    openShop(tile.npc, nextX, nextY);
    return;
  }

  if (tile.type === TILE_TYPES.STORY) {
    interactStory(tile);
    setTile(floor, nextX, nextY, { type: TILE_TYPES.EMPTY });
  }

  state.hero.x = nextX;
  state.hero.y = nextY;

  if (tile.type === TILE_TYPES.STAIRS) {
    nextFloor();
    return;
  }

  if (state.hero.hp <= 0) {
    ui.statusLabel.textContent = "露娜倒下了，本局结束。";
    addLog("挑战失败");
    openEnding(
      "月塔失守",
      "露娜在夜雾里退了回来",
      `止步于 ${state.floorIndex + 1}F。下次可以先绕开高伤怪，补够攻击或防御再回来清路。`,
    );
    syncUi();
    return;
  }

  inspectAround();
  syncUi();
}

function setMode(modeKey) {
  if (state.modeKey === modeKey) {
    return;
  }
  state.modeKey = modeKey;
  resetRun();
}

function resetRun() {
  state.hero = createHero();
  state.floorIndex = 0;
  state.logs = [];
  state.ending = null;
  state.shopContext = null;
  state.feedbacks = [];
  if (state.modeKey === "endless") {
    state.floors.endless = [];
  }
  ensureFloors(state.modeKey, 0);
  const floor = currentFloor();
  state.hero.x = floor.start.x;
  state.hero.y = floor.start.y;
  addLog(`进入 ${floor.title}`);
  ui.statusLabel.textContent = "规划路线，别浪费钥匙。";
  inspectAround();
  syncUi();
  render();
}

function openEnding(eyebrow, title, summary) {
  state.ending = { eyebrow, title, summary };
}

function closeEnding() {
  state.ending = null;
  syncEndingPanel();
}

function saveRun() {
  const code = currentSaveCode();
  if (!code) {
    ui.statusLabel.textContent = "先输入一个存档码。";
    setSaveCodeStatus("输入任意字符串作为你的存档码，下次输入同一个码就能继续。");
    ui.saveCodeInput.focus();
    return;
  }

  const snapshot = JSON.stringify(createSnapshot());
  localStorage.setItem(saveSlotKey(code), snapshot);
  localStorage.setItem(SAVE_KEY, snapshot);
  rememberSaveCode(code);
  ui.statusLabel.textContent = `已存到“${code}”的 ${state.floorIndex + 1}F。`;
  setSaveCodeStatus(`已记住“${code}”，同一台设备下次可直接继续。`);
  addLog(`已写入存档码 ${code}`);
}

function loadRun() {
  const code = currentSaveCode();
  if (!code) {
    ui.statusLabel.textContent = "先输入一个存档码。";
    setSaveCodeStatus("输入任意字符串作为你的存档码；如果本机保存过这个码，会直接恢复进度。");
    ui.saveCodeInput.focus();
    return;
  }

  const raw = localStorage.getItem(saveSlotKey(code));
  if (!raw) {
    const legacyRaw = code === lastSaveCode() ? localStorage.getItem(SAVE_KEY) : "";
    if (legacyRaw) {
      const legacySnapshot = readSnapshot(legacyRaw);
      if (legacySnapshot) {
        localStorage.setItem(saveSlotKey(code), JSON.stringify(legacySnapshot));
        rememberSaveCode(code);
        applySnapshot(legacySnapshot);
        ui.statusLabel.textContent = `已把旧存档迁移到“${code}”。`;
        setSaveCodeStatus(`已恢复“${code}”的旧存档。`);
        return;
      }
    }
    rememberSaveCode(code);
    ui.statusLabel.textContent = `“${code}”还没有存档。`;
    setSaveCodeStatus("没有找到这个存档码，本局开始后点“存档”就会绑定它。");
    return;
  }

  const snapshot = readSnapshot(raw);
  if (!snapshot) {
    ui.statusLabel.textContent = "存档内容损坏，无法读取。";
    setSaveCodeStatus(`“${code}”的本地存档损坏了。`);
    return;
  }

  rememberSaveCode(code);
  applySnapshot(snapshot);
  ui.statusLabel.textContent = `已读取“${code}”的本地存档。`;
  setSaveCodeStatus(`当前存档码：${code}`);
}

function toggleSheet(targetId) {
  const target = document.querySelector(`#${targetId}`);
  if (!target) {
    return;
  }
  const shouldOpen = !target.classList.contains("is-open");
  Object.values(ui.sheets).forEach((sheet) => sheet.classList.remove("is-open"));
  if (shouldOpen) {
    target.classList.add("is-open");
  }
}

function closeSheetsOnMobile() {
  if (window.innerWidth > 720) {
    return;
  }
  Object.values(ui.sheets).forEach((sheet) => sheet.classList.remove("is-open"));
}

function fitCanvas() {
  const bounds = boardWrap.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(bounds.width * ratio));
  canvas.height = Math.max(1, Math.floor(bounds.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.imageSmoothingEnabled = false;
}

function boardMetrics() {
  const bounds = boardWrap.getBoundingClientRect();
  const cols = gridConfig().cols;
  const rows = gridConfig().rows;
  const usableWidth = Math.max(1, Math.floor(bounds.width));
  const usableHeight = Math.max(1, Math.floor(bounds.height));
  const tileSize = Math.max(24, Math.floor(Math.min(usableWidth / cols, usableHeight / rows)));
  const boardWidth = tileSize * cols;
  const boardHeight = tileSize * rows;

  return {
    tileSize,
    boardWidth,
    boardHeight,
    offsetX: Math.floor((usableWidth - boardWidth) / 2),
    offsetY: Math.floor((usableHeight - boardHeight) / 2),
    canvasWidth: usableWidth,
    canvasHeight: usableHeight,
  };
}

function drawRoundedRect(x, y, width, height, radius, fillStyle) {
  ctx.fillStyle = fillStyle;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  ctx.fill();
}

function strokeRoundedRect(x, y, width, height, radius, strokeStyle, lineWidth = 1) {
  ctx.strokeStyle = strokeStyle;
  ctx.lineWidth = lineWidth;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
  ctx.stroke();
}

function drawSparkle(cx, cy, radius, color, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(cx, cy - radius);
  ctx.lineTo(cx + radius * 0.28, cy - radius * 0.28);
  ctx.lineTo(cx + radius, cy);
  ctx.lineTo(cx + radius * 0.28, cy + radius * 0.28);
  ctx.lineTo(cx, cy + radius);
  ctx.lineTo(cx - radius * 0.28, cy + radius * 0.28);
  ctx.lineTo(cx - radius, cy);
  ctx.lineTo(cx - radius * 0.28, cy - radius * 0.28);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawTileBase(x, y, size, biome, row, col) {
  const gap = Math.max(1, Math.floor(size * 0.03));
  ctx.fillStyle = biome.floor;
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = (row + col) % 2 === 0 ? "rgba(255,236,175,0.08)" : "rgba(0,0,0,0.12)";
  ctx.fillRect(x + gap, y + gap, size - gap * 2, size - gap * 2);
  ctx.fillStyle = "rgba(255,255,255,0.05)";
  ctx.fillRect(x + size * 0.16, y + size * 0.18, size * 0.28, Math.max(1, size * 0.04));
  ctx.fillRect(x + size * 0.56, y + size * 0.66, size * 0.25, Math.max(1, size * 0.04));
  ctx.strokeStyle = "rgba(11,15,16,0.42)";
  ctx.lineWidth = 1;
  ctx.strokeRect(Math.floor(x) + 0.5, Math.floor(y) + 0.5, size - 1, size - 1);
}

function drawWall(x, y, size, biome, row, col) {
  const mortar = Math.max(1, Math.floor(size * 0.04));
  ctx.fillStyle = "#1c2020";
  ctx.fillRect(x, y, size, size);
  const brickHeight = Math.floor((size - mortar * 4) / 3);
  for (let layer = 0; layer < 3; layer += 1) {
    const y0 = y + mortar + layer * (brickHeight + mortar);
    const offset = layer % 2 ? -size * 0.18 : 0;
    for (let brick = 0; brick < 3; brick += 1) {
      const x0 = x + offset + mortar + brick * (size * 0.42);
      const width = size * 0.4 - mortar;
      ctx.fillStyle = brick % 2 ? biome.wall : "#8b8a6a";
      ctx.fillRect(x0, y0, width, brickHeight);
      ctx.fillStyle = "rgba(255,244,205,0.12)";
      ctx.fillRect(x0 + mortar, y0 + mortar, width - mortar * 2, Math.max(1, brickHeight * 0.18));
      ctx.fillStyle = "rgba(0,0,0,0.2)";
      ctx.fillRect(x0, y0 + brickHeight - mortar, width, mortar);
    }
  }
  ctx.strokeStyle = "rgba(0,0,0,0.56)";
  ctx.strokeRect(Math.floor(x) + 0.5, Math.floor(y) + 0.5, size - 1, size - 1);
}

function drawStairs(x, y, size, time) {
  drawRoundedRect(x + 8, y + 7, size - 16, size - 14, 8, "#32233a");
  for (let step = 0; step < 5; step += 1) {
    const width = size * 0.66 - step * size * 0.07;
    const sx = x + size * 0.18 + step * size * 0.07;
    const sy = y + size * 0.72 - step * size * 0.1;
    drawRoundedRect(sx, sy, width, size * 0.08, 3, step % 2 ? "#fff1b8" : "#d9fbef");
    ctx.fillStyle = "rgba(0,0,0,0.16)";
    ctx.fillRect(sx, sy + size * 0.06, width, 2);
  }
  const pulse = 0.45 + Math.sin(time / 320) * 0.18;
  drawSparkle(x + size * 0.68, y + size * 0.2, size * 0.12, "#fff1b8", pulse);
}

function drawDoor(tile, x, y, size) {
  const color = tile.color === "yellow" ? "#ffd36e" : tile.color === "blue" ? "#79d7c2" : "#ff8ba0";
  const dark = tile.color === "yellow" ? "#8c6134" : tile.color === "blue" ? "#2d6861" : "#843848";
  drawRoundedRect(x + size * 0.16, y + size * 0.1, size * 0.68, size * 0.8, 5, "#211c1a");
  drawRoundedRect(x + size * 0.2, y + size * 0.15, size * 0.6, size * 0.72, 4, dark);
  drawRoundedRect(x + size * 0.25, y + size * 0.2, size * 0.5, size * 0.62, 3, color);
  ctx.fillStyle = "rgba(255,247,232,0.28)";
  ctx.fillRect(x + size * 0.3, y + size * 0.28, size * 0.4, Math.max(2, size * 0.04));
  ctx.fillRect(x + size * 0.3, y + size * 0.48, size * 0.4, Math.max(2, size * 0.04));
  ctx.fillRect(x + size * 0.3, y + size * 0.68, size * 0.4, Math.max(2, size * 0.04));
  ctx.fillStyle = "#2a1c1c";
  ctx.beginPath();
  ctx.arc(x + size * 0.62, y + size * 0.52, size * 0.055, 0, TAU);
  ctx.fill();
}

function drawItem(tile, x, y, size, time) {
  const color = ITEM_DEFS[tile.item].color;
  const bob = Math.sin(time / 260 + x * 0.03 + y * 0.05) * size * 0.04;
  const cx = x + size / 2;
  const cy = y + size / 2 + bob;

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = size * 0.16;
  if (tile.item.endsWith("Key")) {
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(3, size * 0.07);
    ctx.beginPath();
    ctx.arc(cx - size * 0.1, cy - size * 0.05, size * 0.13, 0, TAU);
    ctx.moveTo(cx + size * 0.02, cy - size * 0.02);
    ctx.lineTo(cx + size * 0.24, cy + size * 0.2);
    ctx.moveTo(cx + size * 0.15, cy + size * 0.11);
    ctx.lineTo(cx + size * 0.26, cy + size * 0.04);
    ctx.moveTo(cx + size * 0.21, cy + size * 0.17);
    ctx.lineTo(cx + size * 0.32, cy + size * 0.1);
    ctx.stroke();
  } else if (tile.item === "potion") {
    drawRoundedRect(cx - size * 0.13, cy - size * 0.2, size * 0.26, size * 0.38, 6, color);
    ctx.fillStyle = "#fff7e8";
    ctx.fillRect(cx - size * 0.08, cy - size * 0.28, size * 0.16, size * 0.09);
    ctx.fillStyle = "rgba(255,255,255,0.62)";
    ctx.fillRect(cx - size * 0.07, cy - size * 0.12, size * 0.05, size * 0.2);
  } else if (tile.item === "gold") {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(cx, cy, size * 0.22, size * 0.16, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "rgba(92,58,20,0.32)";
    ctx.fillRect(cx - size * 0.14, cy - 1, size * 0.28, 3);
  } else {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(cx, cy - size * 0.24);
    ctx.lineTo(cx + size * 0.22, cy);
    ctx.lineTo(cx, cy + size * 0.24);
    ctx.lineTo(cx - size * 0.22, cy);
    ctx.closePath();
    ctx.fill();
    drawSparkle(cx + size * 0.08, cy - size * 0.06, size * 0.07, "#fff7e8", 0.82);
  }
  ctx.restore();
}

function drawEnemy(tile, x, y, size, time) {
  const cx = x + size / 2;
  const cy = y + size * 0.55 + Math.sin(time / 340 + x * 0.02) * size * 0.025;
  const color = tile.enemy.color;
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.45)";
  ctx.shadowBlur = size * 0.08;
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(cx, y + size * 0.82, size * 0.26, size * 0.08, 0, 0, TAU);
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(cx, cy, size * 0.26, size * 0.22, 0, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx - size * 0.16, cy - size * 0.2, size * 0.12, size * 0.18, -0.35, 0, TAU);
  ctx.ellipse(cx + size * 0.16, cy - size * 0.2, size * 0.12, size * 0.18, 0.35, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#23161d";
  ctx.beginPath();
  ctx.arc(cx - size * 0.09, cy - size * 0.02, size * 0.035, 0, TAU);
  ctx.arc(cx + size * 0.09, cy - size * 0.02, size * 0.035, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#23161d";
  ctx.lineWidth = Math.max(2, size * 0.035);
  ctx.beginPath();
  ctx.moveTo(cx - size * 0.11, cy + size * 0.11);
  ctx.lineTo(cx + size * 0.11, cy + size * 0.11);
  ctx.stroke();
  ctx.fillStyle = "#ffd36e";
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.34);
  ctx.lineTo(cx - size * 0.08, cy - size * 0.45);
  ctx.lineTo(cx + size * 0.08, cy - size * 0.45);
  ctx.closePath();
  ctx.fill();
  const preview = combatPreview(state.hero, tile.enemy);
  drawEnemyStats(tile.enemy, preview, x, y, size);
  ctx.restore();
}

function drawEnemyStats(enemy, preview, x, y, size) {
  const risky = !preview.canWin || preview.damage > state.hero.hp * 0.38;
  const damageLabel = preview.damage === Infinity ? "破防-" : `损${preview.damage}`;
  const fontSize = Math.max(7, Math.floor(size * 0.15));
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `900 ${fontSize}px "Noto Sans SC", sans-serif`;
  ctx.fillStyle = risky ? "rgba(79,18,29,0.92)" : "rgba(18,38,31,0.9)";
  ctx.fillRect(x + size * 0.06, y + size * 0.03, size * 0.88, size * 0.19);
  ctx.fillStyle = risky ? "#ffd1dc" : "#bff8dc";
  ctx.fillText(damageLabel, x + size * 0.5, y + size * 0.125);

  const rows = size >= 40 ? [`H${enemy.hp}`, `A${enemy.atk}`, `D${enemy.def}`] : [`H${enemy.hp}`, `攻${enemy.atk}`];
  ctx.font = `900 ${Math.max(7, Math.floor(size * 0.13))}px "Noto Sans SC", sans-serif`;
  ctx.fillStyle = "rgba(13,15,14,0.82)";
  ctx.fillRect(x + size * 0.08, y + size * 0.64, size * 0.84, size * 0.32);
  ctx.fillStyle = "#fff1b8";
  rows.forEach((line, index) => {
    const lineY = y + size * (rows.length === 3 ? 0.7 + index * 0.105 : 0.74 + index * 0.13);
    ctx.fillText(line, x + size * 0.5, lineY);
  });
}

function drawNpc(x, y, size) {
  const cx = x + size / 2;
  drawRoundedRect(x + size * 0.2, y + size * 0.18, size * 0.6, size * 0.56, 8, "#79d7c2");
  drawRoundedRect(x + size * 0.16, y + size * 0.28, size * 0.68, size * 0.5, 8, "#ffcf78");
  ctx.fillStyle = "#fff7e8";
  ctx.beginPath();
  ctx.arc(cx, y + size * 0.31, size * 0.14, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#2b2023";
  ctx.fillRect(x + size * 0.34, y + size * 0.54, size * 0.32, 3);
  ctx.fillStyle = "#ff8ba0";
  ctx.fillRect(x + size * 0.24, y + size * 0.68, size * 0.52, size * 0.06);
}

function drawStory(x, y, size, time) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  drawRoundedRect(x + size * 0.24, y + size * 0.18, size * 0.52, size * 0.64, 8, "#f6d6ff");
  ctx.fillStyle = "#7a4f78";
  ctx.fillRect(x + size * 0.34, y + size * 0.32, size * 0.32, 3);
  ctx.fillRect(x + size * 0.34, y + size * 0.44, size * 0.26, 3);
  ctx.fillRect(x + size * 0.34, y + size * 0.56, size * 0.3, 3);
  drawSparkle(cx + size * 0.22, cy - size * 0.24, size * 0.09, "#ffd36e", 0.55 + Math.sin(time / 300) * 0.18);
}

function drawTile(tile, x, y, size, biome, row, col, time) {
  drawTileBase(x, y, size, biome, row, col);

  if (tile.type === TILE_TYPES.WALL) {
    drawWall(x, y, size, biome, row, col);
    return;
  }

  if (tile.type === TILE_TYPES.STAIRS) {
    drawStairs(x, y, size, time);
    return;
  }

  if (tile.type === TILE_TYPES.DOOR) {
    drawDoor(tile, x, y, size);
    return;
  }

  if (tile.type === TILE_TYPES.ITEM) {
    drawItem(tile, x, y, size, time);
    return;
  }

  if (tile.type === TILE_TYPES.ENEMY) {
    drawEnemy(tile, x, y, size, time);
    return;
  }

  if (tile.type === TILE_TYPES.NPC) {
    drawNpc(x, y, size);
    return;
  }

  if (tile.type === TILE_TYPES.STORY) {
    drawStory(x, y, size, time);
    return;
  }
}

function drawHero(x, y, size, time) {
  const bob = Math.sin(time / 260) * size * 0.025;
  const cx = x + size / 2;
  const cy = y + size / 2 + bob;
  ctx.save();
  ctx.fillStyle = "rgba(0,0,0,0.22)";
  ctx.beginPath();
  ctx.ellipse(cx, y + size * 0.84, size * 0.22, size * 0.07, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#7ec0a9";
  ctx.beginPath();
  ctx.moveTo(cx, cy - size * 0.02);
  ctx.lineTo(cx - size * 0.28, cy + size * 0.38);
  ctx.lineTo(cx + size * 0.28, cy + size * 0.38);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#5b6bc9";
  ctx.fillRect(cx - size * 0.09, cy + size * 0.1, size * 0.18, size * 0.25);
  ctx.fillStyle = "#f9f7f4";
  ctx.beginPath();
  ctx.arc(cx, cy + size * 0.02, size * 0.2, 0, TAU);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx - size * 0.13, cy - size * 0.22, size * 0.09, size * 0.28, -0.25, 0, TAU);
  ctx.ellipse(cx + size * 0.13, cy - size * 0.22, size * 0.09, size * 0.28, 0.25, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#ffc1cf";
  ctx.beginPath();
  ctx.ellipse(cx - size * 0.13, cy - size * 0.22, size * 0.04, size * 0.2, -0.25, 0, TAU);
  ctx.ellipse(cx + size * 0.13, cy - size * 0.22, size * 0.04, size * 0.2, 0.25, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#23161d";
  ctx.beginPath();
  ctx.arc(cx - size * 0.07, cy, size * 0.025, 0, TAU);
  ctx.arc(cx + size * 0.07, cy, size * 0.025, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = "#23161d";
  ctx.lineWidth = Math.max(1.5, size * 0.02);
  ctx.beginPath();
  ctx.moveTo(cx, cy + size * 0.04);
  ctx.lineTo(cx, cy + size * 0.08);
  ctx.moveTo(cx, cy + size * 0.08);
  ctx.quadraticCurveTo(cx - size * 0.04, cy + size * 0.12, cx - size * 0.09, cy + size * 0.09);
  ctx.moveTo(cx, cy + size * 0.08);
  ctx.quadraticCurveTo(cx + size * 0.04, cy + size * 0.12, cx + size * 0.09, cy + size * 0.09);
  ctx.stroke();
  ctx.fillStyle = "#ff8ba0";
  ctx.beginPath();
  ctx.arc(cx, cy + size * 0.05, size * 0.025, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawFeedbacks(metrics, time) {
  state.feedbacks = state.feedbacks.filter((feedback) => time - feedback.born < 900);
  state.feedbacks.forEach((feedback) => {
    const age = time - feedback.born;
    const progress = Math.min(1, age / 900);
    const x = metrics.offsetX + feedback.x * metrics.tileSize + metrics.tileSize / 2;
    const y = metrics.offsetY + feedback.y * metrics.tileSize + metrics.tileSize * 0.26 - progress * metrics.tileSize * 0.38;
    const color =
      feedback.tone === "danger"
        ? "#ff9aae"
        : feedback.tone === "gold"
          ? "#ffd36e"
          : feedback.tone === "blocked"
            ? "#d1d7d5"
            : "#d9fbef";

    ctx.save();
    ctx.globalAlpha = 1 - progress * 0.82;
    ctx.font = `700 ${Math.max(12, Math.floor(metrics.tileSize * 0.24))}px "Noto Sans SC", sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.lineWidth = 4;
    ctx.strokeStyle = "rgba(10,10,12,0.86)";
    ctx.strokeText(feedback.text, x, y);
    ctx.fillStyle = color;
    ctx.fillText(feedback.text, x, y);
    ctx.restore();
  });
}

function render(time = performance.now()) {
  syncBoardFrame();
  fitCanvas();
  const floor = currentFloor();
  const metrics = boardMetrics();
  const size = metrics.tileSize;

  ctx.clearRect(0, 0, metrics.canvasWidth, metrics.canvasHeight);
  const backdrop = ctx.createLinearGradient(0, 0, 0, metrics.canvasHeight);
  backdrop.addColorStop(0, "rgba(255,211,110,0.11)");
  backdrop.addColorStop(0.48, "rgba(121,215,194,0.07)");
  backdrop.addColorStop(1, "rgba(255,139,160,0.08)");
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, metrics.canvasWidth, metrics.canvasHeight);

  const gradient = ctx.createLinearGradient(0, metrics.offsetY, 0, metrics.offsetY + metrics.boardHeight);
  gradient.addColorStop(0, floor.biome.skyTop);
  gradient.addColorStop(1, floor.biome.skyBottom);
  ctx.fillStyle = gradient;
  drawRoundedRect(metrics.offsetX, metrics.offsetY, metrics.boardWidth, metrics.boardHeight, 8, gradient);
  strokeRoundedRect(metrics.offsetX + 1, metrics.offsetY + 1, metrics.boardWidth - 2, metrics.boardHeight - 2, 8, "rgba(255,247,232,0.2)", 2);

  for (let y = 0; y < gridConfig().rows; y += 1) {
    for (let x = 0; x < gridConfig().cols; x += 1) {
      drawTile(
        floor.map[y][x],
        metrics.offsetX + x * size,
        metrics.offsetY + y * size,
        size,
        floor.biome,
        y,
        x,
        time,
      );
    }
  }

  for (let i = 0; i < 18; i += 1) {
    const sparkleX = metrics.offsetX + ((i * 71 + Math.floor(time / 34)) % metrics.boardWidth);
    const sparkleY = metrics.offsetY + ((i * 43 + Math.floor(time / 48)) % metrics.boardHeight);
    drawSparkle(sparkleX, sparkleY, Math.max(2, size * 0.035), "#fff1b8", 0.12 + ((i % 3) * 0.05));
  }

  drawHero(metrics.offsetX + state.hero.x * size, metrics.offsetY + state.hero.y * size, size, time);
  drawFeedbacks(metrics, time);
}

function startRenderLoop() {
  if (animationFrameId) {
    return;
  }
  const tick = (time) => {
    render(time);
    animationFrameId = requestAnimationFrame(tick);
  };
  animationFrameId = requestAnimationFrame(tick);
}

function bindEvents() {
  window.addEventListener("resize", render);
  window.visualViewport?.addEventListener("resize", render);

  document.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (DIRECTION_MAP[key]) {
      event.preventDefault();
      const move = DIRECTION_MAP[key];
      moveHero(move.x, move.y);
      render();
      return;
    }
    if (key === " " || key === "enter") {
      event.preventDefault();
      inspectAround();
    }
  });

  ui.modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setMode(button.dataset.mode);
      render();
    });
  });

  ui.sheetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      toggleSheet(button.dataset.target);
      syncBoardFrame();
      render();
    });
  });

  ui.restartButton.addEventListener("click", () => {
    resetRun();
    render();
  });

  ui.inspectButton.addEventListener("click", inspectAround);
  ui.saveButton.addEventListener("click", saveRun);
  ui.loadButton.addEventListener("click", loadRun);
  ui.saveCodeInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      loadRun();
    }
  });
  ui.saveCodeInput.addEventListener("change", () => {
    const code = currentSaveCode();
    if (!code) {
      setSaveCodeStatus("输入一个存档码，点“继续”读取；没有存档时会从新局开始。");
      return;
    }
    setSaveCodeStatus(
      localStorage.getItem(saveSlotKey(code))
        ? `找到“${code}”的本地存档，点“继续”恢复。`
        : `“${code}”还没有本地存档，点“存档”会创建。`,
    );
  });
  ui.shopCloseButton.addEventListener("click", closeShop);
  ui.shopOffers.addEventListener("click", (event) => {
    const button = event.target.closest(".shop-offer");
    if (!button || button.disabled) {
      return;
    }
    buyShopOffer(Number(button.dataset.offerIndex));
  });
  ui.endingRestartButton.addEventListener("click", () => {
    resetRun();
    render();
  });
  ui.endingCloseButton.addEventListener("click", closeEnding);

  ui.touchButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const key = button.dataset.key;
      if (key === "inspect") {
        inspectAround();
        return;
      }
      if (key === "restart") {
        resetRun();
        render();
        return;
      }
      const move = DIRECTION_MAP[key];
      if (!move) {
        return;
      }
      moveHero(move.x, move.y);
      render();
    });
  });
}

async function boot() {
  const response = await fetch("./game-config.json");
  state.config = await response.json();
  state.seedBase = state.config.seed;
  bindEvents();
  ensureFloors(state.modeKey, 0);
  resetRun();
  startRenderLoop();
  initSaveCode();
}

boot().catch((error) => {
  ui.statusLabel.textContent = `载入失败：${error.message}`;
});
