const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");
const boardWrap = document.querySelector(".board-wrap");
const SAVE_KEY = "bunny_adventure_save_v1";

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
  chapterLabel: document.querySelector("#chapter-label"),
  rankLabel: document.querySelector("#rank-label"),
  statusLabel: document.querySelector("#status-label"),
  objectiveText: document.querySelector("#objective-text"),
  storybeatText: document.querySelector("#storybeat-text"),
  previewText: document.querySelector("#preview-text"),
  handbookList: document.querySelector("#handbook-list"),
  eventLog: document.querySelector("#event-log"),
  progressBar: document.querySelector("#progress-bar"),
  progressDetail: document.querySelector("#progress-detail"),
  restartButton: document.querySelector("#restart-button"),
  inspectButton: document.querySelector("#inspect-button"),
  saveButton: document.querySelector("#save-button"),
  loadButton: document.querySelector("#load-button"),
  endingPanel: document.querySelector("#ending-panel"),
  endingEyebrow: document.querySelector("#ending-eyebrow"),
  endingTitle: document.querySelector("#ending-title"),
  endingSummary: document.querySelector("#ending-summary"),
  endingRestartButton: document.querySelector("#ending-restart-button"),
  endingCloseButton: document.querySelector("#ending-close-button"),
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
};

function syncBoardFrame() {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const topRect = document.querySelector(".floating-top").getBoundingClientRect();
  const quickbarRect = document.querySelector(".mobile-quickbar").getBoundingClientRect();
  const touchRect = document.querySelector(".touch-controls").getBoundingClientRect();
  const statsRect = document.querySelector(".floating-stats").getBoundingClientRect();
  const isMobile = viewportWidth <= 720;

  if (isMobile) {
    const topSpace = Math.max(0, topRect.bottom + 8);
    const bottomAnchor = touchRect.top > 0 ? touchRect.top : viewportHeight;
    const quickbarHeight = quickbarRect.height > 0 ? quickbarRect.height + 12 : 0;
    const bottomSpace = Math.max(topSpace + 120, bottomAnchor - quickbarHeight - 8);
    const availableWidth = Math.max(180, viewportWidth - 20);
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

function randomInt(random, min, max) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function pick(list, random) {
  return list[Math.floor(random() * list.length)];
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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

function buildPathCells(cols, rows) {
  const cells = [];
  for (let y = rows - 2; y >= 1; y -= 1) {
    if ((rows - 2 - y) % 2 === 0) {
      for (let x = 1; x <= cols - 2; x += 1) {
        cells.push({ x, y });
      }
    } else {
      for (let x = cols - 2; x >= 1; x -= 1) {
        cells.push({ x, y });
      }
    }
  }
  return cells;
}

function buildFloor(modeKey, index) {
  const { cols, rows } = gridConfig();
  const random = seeded(floorSeed(modeKey, index));
  const map = createEmptyFloorMap();
  const biome = state.config.biomes[index % state.config.biomes.length];
  const cells = buildPathCells(cols, rows);

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < cols; x += 1) {
      const border = x === 0 || y === 0 || x === cols - 1 || y === rows - 1;
      map[y][x] = { type: border ? TILE_TYPES.WALL : TILE_TYPES.EMPTY };
    }
  }

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
    start: cells[0],
    exit: cells[cells.length - 1],
  };

  setTile(floor, floor.start.x, floor.start.y, { type: TILE_TYPES.EMPTY });
  setTile(floor, floor.exit.x, floor.exit.y, { type: TILE_TYPES.STAIRS });

  const pathSet = new Set(cells.map((cell) => `${cell.x},${cell.y}`));
  for (let y = 1; y < rows - 1; y += 1) {
    for (let x = 1; x < cols - 1; x += 1) {
      if (!pathSet.has(`${x},${y}`)) {
        setTile(floor, x, y, { type: TILE_TYPES.WALL });
      }
    }
  }

  const skipStart = 2;
  const skipEnd = 2;
  const available = cells.slice(skipStart, cells.length - skipEnd);
  const placeAtIndex = (indexOnPath, tile) => {
    if (!available[indexOnPath]) {
      return;
    }
    const spot = available[indexOnPath];
    setTile(floor, spot.x, spot.y, tile);
  };

  const doorColors = ["yellow", "yellow", "blue", "yellow", "red"];
  doorColors.forEach((color, doorIndex) => {
    const slot = 5 + doorIndex * 6 + randomInt(random, 0, 1);
    placeAtIndex(slot, { type: TILE_TYPES.DOOR, color });
    const keySlot = Math.max(0, slot - randomInt(random, 2, 4));
    placeAtIndex(keySlot, { type: TILE_TYPES.ITEM, item: `${color}Key`, value: 1 });
  });

  const enemyCount = clamp(7 + Math.floor(index / 2), 8, 22);
  for (let i = 0; i < enemyCount; i += 1) {
    const slot = randomInt(random, 1, available.length - 4);
    const existing = tileAt(floor, available[slot].x, available[slot].y);
    if (existing.type !== TILE_TYPES.EMPTY) {
      continue;
    }
    setTile(floor, available[slot].x, available[slot].y, {
      type: TILE_TYPES.ENEMY,
      enemy: makeEnemy(index + i * 0.4, random, false),
    });
  }

  const rewardKinds = ["potion", "atkGem", "defGem", "gold"];
  const rewardCount = clamp(8 + Math.floor(index / 3), 8, 18);
  for (let i = 0; i < rewardCount; i += 1) {
    const slot = randomInt(random, 1, available.length - 4);
    const existing = tileAt(floor, available[slot].x, available[slot].y);
    if (existing.type !== TILE_TYPES.EMPTY) {
      continue;
    }
    const kind = pick(rewardKinds, random);
    setTile(floor, available[slot].x, available[slot].y, {
      type: TILE_TYPES.ITEM,
      item: kind,
      value:
        kind === "potion"
          ? 160 + index * 18
          : kind === "gold"
            ? 14 + index * 4
            : 6 + Math.floor(index / 5) * 2,
    });
  }

  if (index % 4 === 2) {
    const slot = clamp(available.length - 9, 1, available.length - 3);
    const shop = pick(state.config.shops, random);
    setTile(floor, available[slot].x, available[slot].y, {
      type: TILE_TYPES.NPC,
      npc: {
        kind: "shop",
        title: shop.title,
        greeting: shop.greeting,
        offers: shop.offers,
        bought: false,
      },
    });
  }

  if (modeKey === "story") {
    const storySlot = clamp(3 + index * 2, 1, available.length - 4);
    setTile(floor, available[storySlot].x, available[storySlot].y, {
      type: TILE_TYPES.STORY,
      text: floor.storyBeat,
    });
  }

  if ((modeKey === "story" && [3, 7, 11].includes(index)) || (modeKey !== "story" && index > 0 && index % 10 === 9)) {
    const slot = clamp(available.length - 3, 2, available.length - 2);
    setTile(floor, available[slot].x, available[slot].y, {
      type: TILE_TYPES.ENEMY,
      enemy: makeEnemy(index + 1, random, true),
    });
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
  ui.keysLabel.textContent = `黄${state.hero.keys.yellow} 蓝${state.hero.keys.blue} 红${state.hero.keys.red}`;
  ui.mobileHpLabel.textContent = String(state.hero.hp);
  ui.mobileAtkLabel.textContent = String(state.hero.atk);
  ui.mobileDefLabel.textContent = String(state.hero.def);
  ui.chapterLabel.textContent = floor.chapter;
  ui.rankLabel.textContent = heroRank();
  ui.objectiveText.textContent = floor.objective;
  ui.storybeatText.textContent = floor.storyBeat;
  ui.progressBar.style.width = `${ratio * 100}%`;
  ui.progressDetail.textContent =
    state.modeKey === "endless"
      ? `已深入 ${state.floorIndex + 1} 层`
      : `${state.config.modes[state.modeKey].label} ${state.floorIndex + 1}/${totalFloors()}`;
  ui.modeButtons.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.mode === state.modeKey);
  });
  renderHandbook();
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
      item.innerHTML = `
        <strong>${enemy.name}</strong>
        <span>HP ${enemy.hp} / ATK ${enemy.atk} / DEF ${enemy.def}</span>
        <span>预估伤害 ${preview.damage === Infinity ? "无法破防" : preview.damage}，金币 ${enemy.gold}</span>
      `;
      ui.handbookList.appendChild(item);
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

function resolveShop(npc) {
  const affordable = npc.offers.find((offer) => state.hero.gold >= offer.cost);
  if (!affordable) {
    ui.statusLabel.textContent = `${npc.title}：金币不够。`;
    ui.previewText.textContent = npc.greeting;
    return;
  }

  state.hero.gold -= affordable.cost;
  if (affordable.type === "hp") state.hero.hp += affordable.value;
  if (affordable.type === "atk") state.hero.atk += affordable.value;
  if (affordable.type === "def") state.hero.def += affordable.value;
  npc.bought = true;
  addLog(`在 ${npc.title} 购买了 ${affordable.label}`);
  ui.statusLabel.textContent = `${npc.title}：${affordable.label}`;
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
  const floor = currentFloor();
  const nextX = state.hero.x + dx;
  const nextY = state.hero.y + dy;
  const tile = tileAt(floor, nextX, nextY);

  if (tile.type === TILE_TYPES.WALL) {
    ui.statusLabel.textContent = "这里是墙。";
    return;
  }

  if (tile.type === TILE_TYPES.DOOR) {
    if (state.hero.keys[tile.color] <= 0) {
      ui.statusLabel.textContent = `${doorName(tile.color)} 还打不开。`;
      return;
    }
    state.hero.keys[tile.color] -= 1;
    setTile(floor, nextX, nextY, { type: TILE_TYPES.EMPTY });
    addLog(`打开 ${doorName(tile.color)}`);
    ui.statusLabel.textContent = `${doorName(tile.color)} 已打开。`;
  }

  if (tile.type === TILE_TYPES.ENEMY) {
    const preview = combatPreview(state.hero, tile.enemy);
    if (!preview.canWin) {
      ui.statusLabel.textContent = `${tile.enemy.name} 现在打不过。`;
      ui.previewText.textContent = `${tile.enemy.name} 会造成 ${preview.damage === Infinity ? "致命" : preview.damage} 点伤害。`;
      return;
    }
    state.hero.hp -= preview.damage;
    state.hero.gold += tile.enemy.gold;
    setTile(floor, nextX, nextY, { type: TILE_TYPES.EMPTY });
    addLog(`击败 ${tile.enemy.name}`);
    ui.statusLabel.textContent = `击败 ${tile.enemy.name}，损失 ${preview.damage} 生命。`;
  }

  if (tile.type === TILE_TYPES.ITEM) {
    applyItem(tile);
    setTile(floor, nextX, nextY, { type: TILE_TYPES.EMPTY });
  }

  if (tile.type === TILE_TYPES.NPC) {
    resolveShop(tile.npc);
    if (tile.npc.bought) {
      setTile(floor, nextX, nextY, { type: TILE_TYPES.EMPTY });
    }
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
  const snapshot = {
    modeKey: state.modeKey,
    floorIndex: state.floorIndex,
    hero: state.hero,
    floors: state.floors,
    logs: state.logs,
    seedBase: state.seedBase,
  };

  localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
  ui.statusLabel.textContent = `已存档在 ${state.floorIndex + 1}F。`;
  addLog("已写入本地存档");
}

function loadRun() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) {
    ui.statusLabel.textContent = "还没有可读取的存档。";
    return;
  }

  const snapshot = JSON.parse(raw);
  if (!snapshot || !snapshot.hero || !snapshot.floors || !snapshot.modeKey) {
    ui.statusLabel.textContent = "存档内容损坏，无法读取。";
    return;
  }

  state.modeKey = snapshot.modeKey;
  state.floorIndex = snapshot.floorIndex;
  state.hero = snapshot.hero;
  state.floors = snapshot.floors;
  state.logs = Array.isArray(snapshot.logs) ? snapshot.logs : [];
  state.seedBase = snapshot.seedBase || state.config.seed;
  state.ending = null;
  addLog(`读档回到 ${state.floorIndex + 1}F`);
  ui.statusLabel.textContent = "本地存档已读取。";
  inspectAround();
  syncUi();
  render();
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

function fitCanvas() {
  const bounds = boardWrap.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(bounds.width * ratio));
  canvas.height = Math.max(1, Math.floor(bounds.height * ratio));
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.imageSmoothingEnabled = true;
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

function drawTile(tile, x, y, size, biome) {
  drawRoundedRect(x + 2, y + 2, size - 4, size - 4, 12, biome.floor);

  if (tile.type === TILE_TYPES.WALL) {
    drawRoundedRect(x + 2, y + 2, size - 4, size - 4, 12, biome.wall);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(x + 10, y + 12, size - 20, 6);
    ctx.fillRect(x + 12, y + 24, size - 24, 6);
    return;
  }

  if (tile.type === TILE_TYPES.STAIRS) {
    ctx.fillStyle = "#dfe8ff";
    for (let step = 0; step < 4; step += 1) {
      ctx.fillRect(x + 12 + step * 6, y + 36 - step * 6, 26, 5);
    }
    return;
  }

  if (tile.type === TILE_TYPES.DOOR) {
    const color = tile.color === "yellow" ? "#f2c867" : tile.color === "blue" ? "#8cbaff" : "#f28ca6";
    drawRoundedRect(x + 10, y + 8, size - 20, size - 16, 10, color);
    ctx.fillStyle = "rgba(20,20,20,0.18)";
    ctx.fillRect(x + size / 2 + 8, y + size / 2, 6, 6);
    return;
  }

  if (tile.type === TILE_TYPES.ITEM) {
    ctx.fillStyle = ITEM_DEFS[tile.item].color;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, size * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillRect(x + size / 2 - 4, y + size / 2 - 14, 8, 8);
    return;
  }

  if (tile.type === TILE_TYPES.ENEMY) {
    ctx.fillStyle = tile.enemy.color;
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2 + 4, size * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x + size / 2 - 10, y + size / 2 - 10, 10, 0, Math.PI * 2);
    ctx.arc(x + size / 2 + 10, y + size / 2 - 10, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#201a1b";
    ctx.fillRect(x + size / 2 - 12, y + size / 2 + 4, 24, 4);
    return;
  }

  if (tile.type === TILE_TYPES.NPC) {
    drawRoundedRect(x + 10, y + 12, size - 20, size - 24, 12, "#88c6ef");
    ctx.fillStyle = "#fff5d8";
    ctx.fillRect(x + 16, y + 18, size - 32, 10);
    ctx.fillRect(x + 20, y + 34, size - 40, 10);
    return;
  }

  if (tile.type === TILE_TYPES.STORY) {
    drawRoundedRect(x + 14, y + 14, size - 28, size - 28, 14, "#d6a1f1");
    ctx.fillStyle = "#fff7ff";
    ctx.fillRect(x + size / 2 - 3, y + 18, 6, size - 36);
    return;
  }
}

function drawHero(x, y, size) {
  ctx.fillStyle = "#f9f7f4";
  ctx.beginPath();
  ctx.arc(x + size / 2, y + size / 2 + 6, size * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + size / 2 - 10, y + size / 2 - 10, 8, 18, -0.3, 0, Math.PI * 2);
  ctx.ellipse(x + size / 2 + 10, y + size / 2 - 10, 8, 18, 0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#7ca6ef";
  ctx.beginPath();
  ctx.moveTo(x + size / 2, y + size / 2 - 6);
  ctx.lineTo(x + size / 2 - 18, y + size / 2 + 24);
  ctx.lineTo(x + size / 2 + 18, y + size / 2 + 24);
  ctx.closePath();
  ctx.fill();
}

function render() {
  syncBoardFrame();
  fitCanvas();
  const floor = currentFloor();
  const metrics = boardMetrics();
  const size = metrics.tileSize;

  ctx.clearRect(0, 0, metrics.canvasWidth, metrics.canvasHeight);
  const backdrop = ctx.createLinearGradient(0, 0, 0, metrics.canvasHeight);
  backdrop.addColorStop(0, "rgba(255,255,255,0.05)");
  backdrop.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = backdrop;
  ctx.fillRect(0, 0, metrics.canvasWidth, metrics.canvasHeight);

  const gradient = ctx.createLinearGradient(0, metrics.offsetY, 0, metrics.offsetY + metrics.boardHeight);
  gradient.addColorStop(0, floor.biome.skyTop);
  gradient.addColorStop(1, floor.biome.skyBottom);
  ctx.fillStyle = gradient;
  ctx.fillRect(metrics.offsetX, metrics.offsetY, metrics.boardWidth, metrics.boardHeight);

  for (let y = 0; y < gridConfig().rows; y += 1) {
    for (let x = 0; x < gridConfig().cols; x += 1) {
      drawTile(
        floor.map[y][x],
        metrics.offsetX + x * size,
        metrics.offsetY + y * size,
        size,
        floor.biome,
      );
    }
  }

  drawHero(metrics.offsetX + state.hero.x * size, metrics.offsetY + state.hero.y * size, size);
}

function bindEvents() {
  window.addEventListener("resize", render);

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
  if (localStorage.getItem(SAVE_KEY)) {
    ui.previewText.textContent = "本地有存档，想续关可以直接点“读档”。";
  }
}

boot().catch((error) => {
  ui.statusLabel.textContent = `载入失败：${error.message}`;
});
