import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(rootDir, "output", "edgeone");
const outFile = path.join(outDir, "index.html");

const [html, css, js, configRaw] = await Promise.all([
  readFile(path.join(rootDir, "index.html"), "utf8"),
  readFile(path.join(rootDir, "styles.css"), "utf8"),
  readFile(path.join(rootDir, "game.js"), "utf8"),
  readFile(path.join(rootDir, "game-config.json"), "utf8"),
]);

const config = JSON.stringify(JSON.parse(configRaw)).replaceAll("</", "<\\/");
const bundledJs = js.replace(
  'const response = await fetch("./game-config.json");\n  state.config = await response.json();',
  "state.config = window.__BUNNY_GAME_CONFIG__;",
);

if (bundledJs === js) {
  throw new Error("Failed to inline game-config.json into game.js");
}

const bundledHtml = html
  .replace(/    <link rel="stylesheet" href="\.\/styles\.css[^"]*" \/>\n/, `    <style>\n${css}\n    </style>\n`)
  .replace(
    /    <script type="module" src="\.\/game\.js[^"]*"><\/script>/,
    `    <script>window.__BUNNY_GAME_CONFIG__ = ${config};</script>\n    <script type="module">\n${bundledJs}\n    </script>`,
  );

if (bundledHtml === html) {
  throw new Error("Failed to inline styles or script into index.html");
}

await mkdir(outDir, { recursive: true });
await writeFile(outFile, bundledHtml);
console.log(outFile);
