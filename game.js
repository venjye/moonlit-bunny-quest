const canvas = document.querySelector("#game-canvas");
const ctx = canvas.getContext("2d");

const ui = {
  title: document.querySelector("#game-title"),
  hook: document.querySelector("#game-hook"),
  objective: document.querySelector("#objective-text"),
  chapterName: document.querySelector("#chapter-name"),
  levelName: document.querySelector("#level-name"),
  carrotCount: document.querySelector("#carrot-count"),
  energyCount: document.querySelector("#energy-count"),
  dialogue: document.querySelector("#dialogue-text"),
  eventLog: document.querySelector("#event-log"),
  restartButton: document.querySelector("#restart-button"),
  nextButton: document.querySelector("#next-button"),
  progressText: document.querySelector("#progress-text"),
  rankText: document.querySelector("#rank-text"),
  loreStatus: document.querySelector("#lore-status"),
  storybeat: document.querySelector("#storybeat-text"),
  progressBar: document.querySelector("#progress-bar"),
  progressDetail: document.querySelector("#progress-detail"),
};

const world = {
  config: null,
  levels: [],
  levelIndex: 0,
  keys: new Set(),
  logs: [],
  finished: false,
  lastTimestamp: 0,
  particles: [],
  loreCache: new Map(),
  player: {
    x: 0,
    y: 0,
    radius: 18,
    energy: 6,
    collected: 0,
    hitCooldown: 0,
  },
};

const rankNames = [
  "月光学徒",
  "草叶旅人",
  "溪风信使",
  "林境歌者",
  "镜湖逐梦者",
  "星穹守夜人",
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function seeded(seed) {
  let current = seed >>> 0;
  return () => {
    current = (current * 1664525 + 1013904223) >>> 0;
    return current / 4294967296;
  };
}

function addLog(text) {
  world.logs.unshift(text);
  world.logs = world.logs.slice(0, 6);
  ui.eventLog.innerHTML = "";
  world.logs.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    ui.eventLog.appendChild(li);
  });
}

function currentLevel() {
  return world.levels[world.levelIndex];
}

function pick(list, random) {
  return list[Math.floor(random() * list.length)];
}

function makePosition(random, marginX = 110, marginY = 92) {
  return {
    x: Math.round(lerp(marginX, canvas.width - marginX, random())),
    y: Math.round(lerp(marginY, canvas.height - marginY, random())),
  };
}

function createLevel(config, index) {
  const random = seeded(config.seed + index * 97);
  const chapter = config.chapters[Math.floor((index / config.progression.totalLevels) * config.chapters.length)];
  const chapterIndex = config.chapters.indexOf(chapter);
  const requiredCarrots = Math.min(
    config.progression.maxRequiredCarrots,
    config.progression.baseRequiredCarrots + Math.floor(index / 9)
  );
  const hazardCount =
    config.progression.hazardBase + Math.floor(index / config.progression.hazardGrowthEvery);
  const carrotCount = requiredCarrots + 2 + Math.floor(random() * 2);
  const start = { x: 94, y: Math.round(lerp(140, 410, random())) };
  const goal = {
    x: canvas.width - 104,
    y: Math.round(lerp(120, 420, random())),
    radius: 40 + Math.floor(random() * 12),
    name: pick(chapter.goalNames, random),
  };

  const carrots = Array.from({ length: carrotCount }, (_, carrotIndex) => {
    const position = makePosition(random);
    return {
      ...position,
      id: `carrot-${index}-${carrotIndex}`,
      label: `${pick(chapter.landforms, random)}的星火`,
      pulse: random() * Math.PI * 2,
      collected: false,
    };
  });

  const hazards = Array.from({ length: hazardCount }, (_, hazardIndex) => {
    const kind = pick(config.hazards, random);
    const position = makePosition(random, 140, 110);
    return {
      ...position,
      id: `hazard-${index}-${hazardIndex}`,
      type: kind.type,
      label: kind.name,
      color: kind.color,
      radius: 24 + random() * 18,
      wobble: random() * Math.PI * 2,
    };
  });

  const npc = {
    ...makePosition(random, 160, 120),
    name: pick(chapter.npcs, random),
    radius: 28,
    line: pick(chapter.storyBeats, random),
  };

  const name = `${pick(chapter.landforms, random)}·第 ${index + 1} 关`;
  const objective = `替露娜收集 ${requiredCarrots} 颗星火胡萝卜，再穿过${goal.name}。`;
  const storyBeat = pick(chapter.storyBeats, random);

  return {
    index,
    chapterIndex,
    chapter,
    name,
    objective,
    requiredCarrots,
    start,
    goal,
    carrots,
    hazards,
    npcs: [npc],
    storyBeat,
    breeze: random() * 0.6 + 0.2,
    moonOffset: random() * 120,
  };
}

function generateLevels(config) {
  return Array.from({ length: config.progression.totalLevels }, (_, index) =>
    createLevel(config, index)
  );
}

function resetPlayer(level) {
  world.player.x = level.start.x;
  world.player.y = level.start.y;
  world.player.energy = world.config.player.maxEnergy;
  world.player.collected = 0;
  world.player.hitCooldown = 0;
  level.carrots.forEach((item) => {
    item.collected = false;
  });
}

function spawnParticles(level) {
  const random = seeded(world.config.seed + level.index * 331);
  world.particles = Array.from({ length: 36 }, () => ({
    x: random() * canvas.width,
    y: random() * canvas.height,
    radius: random() * 2.4 + 1,
    speed: random() * 0.45 + 0.2,
    drift: random() * 0.7 + 0.15,
    alpha: random() * 0.5 + 0.18,
  }));
}

function rankName(levelIndex) {
  return rankNames[Math.min(rankNames.length - 1, Math.floor(levelIndex / 18))];
}

async function maybeHydrateLore(level) {
  const cacheKey = `level-${level.index}`;
  if (world.loreCache.has(cacheKey)) {
    ui.storybeat.textContent = world.loreCache.get(cacheKey);
    return;
  }

  ui.storybeat.textContent = level.storyBeat;
  world.loreCache.set(cacheKey, level.storyBeat);

  const loreConfig = world.config.lore;
  if (!loreConfig.endpoint) {
    ui.loreStatus.textContent = "世界织梦器：本地生成";
    return;
  }

  ui.loreStatus.textContent = `世界织梦器：${loreConfig.model}`;
  try {
    const response = await fetch(loreConfig.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: loreConfig.model,
        messages: [
          { role: "system", content: loreConfig.systemPrompt },
          {
            role: "user",
            content: `章节：${level.chapter.name}；关卡：${level.name}；目标：${level.objective}；请写一句新的关卡旁白。`,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const payload = await response.json();
    const text =
      payload.choices?.[0]?.message?.content?.trim() ||
      payload.output_text?.trim() ||
      level.storyBeat;
    world.loreCache.set(cacheKey, text);
    ui.storybeat.textContent = text;
  } catch (error) {
    ui.loreStatus.textContent = `世界织梦器：本地生成（${error.message}）`;
  }
}

function loadLevel(index) {
  world.levelIndex = index;
  world.finished = false;
  const level = currentLevel();
  resetPlayer(level);
  spawnParticles(level);
  ui.dialogue.textContent = "靠近旅伴时，会听见新的提醒。";
  addLog(`进入 ${level.name}`);
  syncUi();
  maybeHydrateLore(level);
}

function syncUi() {
  const level = currentLevel();
  const progressRatio = (world.levelIndex + 1) / world.levels.length;
  ui.title.textContent = world.config.title;
  ui.hook.textContent = world.config.hook;
  ui.objective.textContent = level.objective;
  ui.chapterName.textContent = level.chapter.name;
  ui.levelName.textContent = `${world.levelIndex + 1} / ${world.levels.length}`;
  ui.carrotCount.textContent = `${world.player.collected} / ${level.requiredCarrots}`;
  ui.energyCount.textContent = `${world.player.energy}`;
  ui.progressText.textContent = `旅程 ${world.levelIndex + 1} / ${world.levels.length}`;
  ui.rankText.textContent = rankName(world.levelIndex);
  ui.progressBar.style.width = `${progressRatio * 100}%`;
  ui.progressDetail.textContent = `第 ${world.levelIndex + 1} 关：${level.name}，${level.chapter.name}仍在发光。`;
  ui.nextButton.disabled = !world.finished;
}

function drawMist(level) {
  const time = performance.now() * 0.0002;
  ctx.fillStyle = level.chapter.mist;
  ctx.globalAlpha = 0.16;
  for (let i = 0; i < 5; i += 1) {
    const x = ((i * 220 + time * 160 * (i % 2 === 0 ? 1 : -1)) % (canvas.width + 200)) - 100;
    ctx.beginPath();
    ctx.ellipse(x, 110 + i * 54, 120, 28, 0, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawBackground(level) {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, level.chapter.skyTop);
  gradient.addColorStop(0.65, level.chapter.skyBottom);
  gradient.addColorStop(1, level.chapter.ground);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const moonX = canvas.width - 160 + Math.sin(performance.now() * 0.00015 + level.moonOffset) * 18;
  const moonGradient = ctx.createRadialGradient(moonX, 94, 10, moonX, 94, 76);
  moonGradient.addColorStop(0, "rgba(255, 247, 209, 0.95)");
  moonGradient.addColorStop(1, "rgba(255, 247, 209, 0)");
  ctx.fillStyle = moonGradient;
  ctx.beginPath();
  ctx.arc(moonX, 94, 76, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255,255,255,0.92)";
  ctx.beginPath();
  ctx.arc(moonX, 94, 34, 0, Math.PI * 2);
  ctx.fill();

  drawMist(level);

  const ridgeColors = [
    `${level.chapter.leaf}33`,
    `${level.chapter.leaf}66`,
    `${level.chapter.leaf}aa`,
  ];

  ridgeColors.forEach((color, ridgeIndex) => {
    ctx.beginPath();
    ctx.moveTo(0, canvas.height);
    for (let x = 0; x <= canvas.width + 40; x += 40) {
      const y =
        330 +
        ridgeIndex * 58 +
        Math.sin((x + level.index * 16) / (90 - ridgeIndex * 8)) * (30 - ridgeIndex * 4);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(canvas.width, canvas.height);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
  });

  ctx.fillStyle = level.chapter.water;
  ctx.globalAlpha = 0.22;
  ctx.fillRect(0, canvas.height - 98, canvas.width, 60);
  ctx.globalAlpha = 1;

  ctx.strokeStyle = "rgba(255,255,255,0.24)";
  ctx.lineWidth = 2;
  ctx.strokeRect(18, 18, canvas.width - 36, canvas.height - 36);

  const goalReady = world.player.collected >= level.requiredCarrots;
  const goalGradient = ctx.createRadialGradient(
    level.goal.x,
    level.goal.y,
    8,
    level.goal.x,
    level.goal.y,
    level.goal.radius + 12
  );
  goalGradient.addColorStop(0, goalReady ? "rgba(255,246,202,1)" : "rgba(255,255,255,0.64)");
  goalGradient.addColorStop(1, goalReady ? "rgba(255,205,110,0.18)" : "rgba(255,255,255,0.08)");
  ctx.fillStyle = goalGradient;
  ctx.beginPath();
  ctx.arc(level.goal.x, level.goal.y, level.goal.radius + 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = goalReady ? "#ffe39c" : "rgba(255,255,255,0.58)";
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(level.goal.x, level.goal.y, level.goal.radius, 0, Math.PI * 2);
  ctx.stroke();
}

function drawParticles(level, deltaSeconds) {
  world.particles.forEach((particle) => {
    particle.y -= particle.speed * 22 * deltaSeconds;
    particle.x += Math.sin((particle.y + level.index * 12) * 0.01) * particle.drift;
    if (particle.y < -10) {
      particle.y = canvas.height + 10;
      particle.x = Math.random() * canvas.width;
    }
    ctx.fillStyle = `rgba(255, 249, 222, ${particle.alpha})`;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  });
}

function drawCarrot(carrot) {
  const lift = Math.sin(performance.now() * 0.003 + carrot.pulse) * 4;
  const glow = ctx.createRadialGradient(carrot.x, carrot.y + lift, 4, carrot.x, carrot.y + lift, 24);
  glow.addColorStop(0, "rgba(255,244,210,0.88)");
  glow.addColorStop(1, "rgba(255,244,210,0)");
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(carrot.x, carrot.y + lift, 24, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#f39832";
  ctx.beginPath();
  ctx.moveTo(carrot.x, carrot.y - 16 + lift);
  ctx.bezierCurveTo(
    carrot.x + 16,
    carrot.y - 6 + lift,
    carrot.x + 10,
    carrot.y + 18 + lift,
    carrot.x,
    carrot.y + 18 + lift
  );
  ctx.bezierCurveTo(
    carrot.x - 10,
    carrot.y + 18 + lift,
    carrot.x - 16,
    carrot.y - 6 + lift,
    carrot.x,
    carrot.y - 16 + lift
  );
  ctx.fill();

  ctx.strokeStyle = "#ffd7b6";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(carrot.x, carrot.y - 8 + lift);
  ctx.lineTo(carrot.x, carrot.y + 12 + lift);
  ctx.stroke();

  ctx.fillStyle = "#5ca06b";
  ctx.beginPath();
  ctx.ellipse(carrot.x - 5, carrot.y - 22 + lift, 6, 12, -0.5, 0, Math.PI * 2);
  ctx.ellipse(carrot.x + 5, carrot.y - 22 + lift, 6, 12, 0.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawHazard(hazard) {
  const wobble = Math.sin(performance.now() * 0.0025 + hazard.wobble) * 3;
  ctx.fillStyle = `${hazard.color}88`;
  ctx.beginPath();
  ctx.arc(hazard.x, hazard.y + wobble, hazard.radius + 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = hazard.color;
  ctx.beginPath();
  ctx.arc(hazard.x, hazard.y, hazard.radius, 0, Math.PI * 2);
  ctx.fill();

  if (hazard.type === "bramble") {
    ctx.strokeStyle = "rgba(255,255,255,0.34)";
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.moveTo(hazard.x - hazard.radius * 0.6, hazard.y - 8 + i * 6);
      ctx.lineTo(hazard.x + hazard.radius * 0.6, hazard.y + 4 - i * 6);
      ctx.stroke();
    }
  }
}

function drawNpc(npc, chapter) {
  ctx.fillStyle = "rgba(255, 241, 214, 0.9)";
  ctx.beginPath();
  ctx.arc(npc.x, npc.y, npc.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = chapter.leaf;
  ctx.beginPath();
  ctx.arc(npc.x, npc.y - npc.radius - 10, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#473225";
  ctx.beginPath();
  ctx.arc(npc.x - 6, npc.y - 2, 2.4, 0, Math.PI * 2);
  ctx.arc(npc.x + 6, npc.y - 2, 2.4, 0, Math.PI * 2);
  ctx.fill();
}

function drawPlayer(level) {
  const { x, y, radius } = world.player;
  ctx.fillStyle = "rgba(91, 68, 51, 0.15)";
  ctx.beginPath();
  ctx.ellipse(x, y + radius + 10, radius + 8, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#fff8f0";
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffd7d7";
  ctx.beginPath();
  ctx.ellipse(x - 8, y - 22, 6, 21, -0.2, 0, Math.PI * 2);
  ctx.ellipse(x + 8, y - 22, 6, 21, 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = level.chapter.accent;
  ctx.beginPath();
  ctx.moveTo(x - 14, y + 6);
  ctx.quadraticCurveTo(x, y + 12, x + 12, y + 6);
  ctx.lineTo(x + 6, y + 18);
  ctx.lineTo(x - 10, y + 18);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "#2c251b";
  ctx.beginPath();
  ctx.arc(x - 5, y - 3, 2.5, 0, Math.PI * 2);
  ctx.arc(x + 5, y - 3, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#d86f2d";
  ctx.beginPath();
  ctx.arc(x, y + 3, 3.5, 0, Math.PI * 2);
  ctx.fill();

  if (world.player.hitCooldown > 0) {
    ctx.strokeStyle = "rgba(255, 110, 110, 0.85)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, radius + 10, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawEntities(level) {
  level.carrots.forEach((carrot) => {
    if (!carrot.collected) {
      drawCarrot(carrot);
    }
  });

  level.hazards.forEach((hazard) => {
    drawHazard(hazard);
  });

  level.npcs.forEach((npc) => {
    drawNpc(npc, level.chapter);
  });
}

function step(deltaSeconds) {
  if (!world.config) {
    return;
  }

  const level = currentLevel();
  const speed =
    world.config.player.baseSpeed *
    (world.keys.has("shift") ? world.config.player.dashMultiplier : 1);

  let moveX = 0;
  let moveY = 0;
  if (world.keys.has("arrowup") || world.keys.has("w")) moveY -= 1;
  if (world.keys.has("arrowdown") || world.keys.has("s")) moveY += 1;
  if (world.keys.has("arrowleft") || world.keys.has("a")) moveX -= 1;
  if (world.keys.has("arrowright") || world.keys.has("d")) moveX += 1;

  const length = Math.hypot(moveX, moveY) || 1;
  world.player.x = clamp(
    world.player.x + (moveX / length) * speed * deltaSeconds,
    32,
    canvas.width - 32
  );
  world.player.y = clamp(
    world.player.y + (moveY / length) * speed * deltaSeconds,
    32,
    canvas.height - 32
  );

  world.player.hitCooldown = Math.max(0, world.player.hitCooldown - deltaSeconds);
  ui.dialogue.textContent = "靠近旅伴时，会听见新的提醒。";

  level.carrots.forEach((carrot) => {
    if (!carrot.collected && distance(world.player, carrot) < world.player.radius + 18) {
      carrot.collected = true;
      world.player.collected += 1;
      addLog(`获得 ${carrot.label}`);
      syncUi();
    }
  });

  level.hazards.forEach((hazard) => {
    if (
      world.player.hitCooldown <= 0 &&
      distance(world.player, hazard) < world.player.radius + hazard.radius
    ) {
      world.player.energy = Math.max(0, world.player.energy - 1);
      world.player.hitCooldown = 1.2;
      world.player.x = clamp(world.player.x - 34, 32, canvas.width - 32);
      world.player.y = clamp(world.player.y + 24, 32, canvas.height - 32);
      addLog(`撞上了 ${hazard.label}`);
      syncUi();
      if (world.player.energy <= 0) {
        addLog("体力耗尽，回到关卡起点");
        resetPlayer(level);
        syncUi();
      }
    }
  });

  level.npcs.forEach((npc) => {
    if (distance(world.player, npc) < world.player.radius + npc.radius + 10) {
      ui.dialogue.textContent = `${npc.name}：${npc.line}`;
    }
  });

  if (
    world.player.collected >= level.requiredCarrots &&
    distance(world.player, level.goal) < world.player.radius + level.goal.radius
  ) {
    if (world.levelIndex === world.levels.length - 1) {
      addLog("露娜点亮了第一百道月门，整片森林都亮了。");
      ui.dialogue.textContent = "终章：露娜把一百段月色都带回了家。";
    } else {
      addLog(`${level.name} 完成，月门已经开启。`);
      ui.dialogue.textContent = "月门开启，继续往下一片林地前进。";
    }
    world.finished = true;
    ui.nextButton.disabled = false;
  }
}

function render(deltaSeconds) {
  const level = currentLevel();
  drawBackground(level);
  drawParticles(level, deltaSeconds);
  drawEntities(level);
  drawPlayer(level);

  ctx.fillStyle = "rgba(26, 24, 20, 0.78)";
  ctx.font = '700 18px "Outfit", sans-serif';
  ctx.fillText(level.name, 34, 48);
  ctx.fillText(level.chapter.name, 34, 76);
  ctx.fillText(`体力 ${world.player.energy}`, 34, 104);
}

function loop(timestamp) {
  if (!world.lastTimestamp) {
    world.lastTimestamp = timestamp;
  }
  const deltaSeconds = Math.min((timestamp - world.lastTimestamp) / 1000, 0.033);
  world.lastTimestamp = timestamp;
  step(deltaSeconds);
  render(deltaSeconds);
  requestAnimationFrame(loop);
}

async function bootstrap() {
  const response = await fetch("./game-config.json");
  world.config = await response.json();
  world.levels = generateLevels(world.config);
  loadLevel(0);
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  world.keys.add(event.key.toLowerCase());
});

window.addEventListener("keyup", (event) => {
  world.keys.delete(event.key.toLowerCase());
});

ui.restartButton.addEventListener("click", () => {
  loadLevel(world.levelIndex);
});

ui.nextButton.addEventListener("click", () => {
  if (!world.finished) {
    return;
  }
  const nextIndex = (world.levelIndex + 1) % world.levels.length;
  loadLevel(nextIndex);
});

bootstrap().catch((error) => {
  ui.objective.textContent = "冒险档案读取失败";
  ui.dialogue.textContent = String(error);
});
