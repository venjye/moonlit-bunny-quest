import { readFileSync } from "node:fs";

const config = JSON.parse(readFileSync(new URL("../game-config.json", import.meta.url), "utf8"));
const source = readFileSync(new URL("../game.js", import.meta.url), "utf8");
const layoutsMatch = source.match(/const MAGIC_TOWER_LAYOUTS = ([\s\S]*?\n\];)/);

if (!layoutsMatch) {
  throw new Error("MAGIC_TOWER_LAYOUTS not found in game.js");
}

const layouts = Function(`return ${layoutsMatch[1]}`)();
const { cols, rows } = config.grid;
const keyItems = { y: "yellow", b: "blue", r: "red" };
const doors = { Y: "yellow", B: "blue", R: "red" };

function assertLayoutShape(layout, index) {
  if (layout.length !== rows) {
    throw new Error(`layout ${index} has ${layout.length} rows, expected ${rows}`);
  }
  layout.forEach((row, y) => {
    if (row.length !== cols) {
      throw new Error(`layout ${index} row ${y} has ${row.length} cols, expected ${cols}`);
    }
  });
}

function findMarker(layout, marker) {
  const found = [];
  layout.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (cell === marker) {
        found.push({ x, y });
      }
    });
  });
  return found;
}

function validateReachable(layout, index) {
  const starts = findMarker(layout, "S");
  const exits = findMarker(layout, "U");
  if (starts.length !== 1 || exits.length !== 1) {
    throw new Error(`layout ${index} expected exactly one S and one U`);
  }

  const keySpots = [];
  layout.forEach((row, y) => {
    [...row].forEach((cell, x) => {
      if (keyItems[cell]) {
        keySpots.push({ x, y, color: keyItems[cell] });
      }
    });
  });

  const initialKeys = config.player.keys;
  const queue = [
    {
      x: starts[0].x,
      y: starts[0].y,
      keys: { yellow: initialKeys.yellow, blue: initialKeys.blue, red: initialKeys.red },
      collected: 0,
    },
  ];
  const seen = new Set();

  while (queue.length) {
    const current = queue.shift();
    const stateKey = `${current.x},${current.y},${current.keys.yellow},${current.keys.blue},${current.keys.red},${current.collected}`;
    if (seen.has(stateKey)) {
      continue;
    }
    seen.add(stateKey);

    if (layout[current.y][current.x] === "U") {
      return;
    }

    for (const [dx, dy] of [
      [0, -1],
      [1, 0],
      [0, 1],
      [-1, 0],
    ]) {
      const x = current.x + dx;
      const y = current.y + dy;
      if (x < 0 || y < 0 || x >= cols || y >= rows) {
        continue;
      }
      const marker = layout[y][x];
      if (marker === "W" || marker === "N") {
        continue;
      }

      const next = {
        x,
        y,
        keys: { ...current.keys },
        collected: current.collected,
      };

      if (doors[marker]) {
        const color = doors[marker];
        if (next.keys[color] <= 0) {
          continue;
        }
        next.keys[color] -= 1;
      }

      const keyIndex = keySpots.findIndex((spot) => spot.x === x && spot.y === y);
      if (keyIndex >= 0 && (next.collected & (1 << keyIndex)) === 0) {
        next.keys[keySpots[keyIndex].color] += 1;
        next.collected |= 1 << keyIndex;
      }

      queue.push(next);
    }
  }

  throw new Error(`layout ${index} has no valid path from S to U with available keys`);
}

layouts.forEach((layout, index) => {
  assertLayoutShape(layout, index);
  validateReachable(layout, index);
});

console.log(`validated ${layouts.length} magic tower layouts`);
