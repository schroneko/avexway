import { readFileSync, writeFileSync } from "node:fs";

const pkgPath = new URL("../node_modules/katex/package.json", import.meta.url);
const mjsPath = new URL("../node_modules/katex/dist/katex.mjs", import.meta.url);

const { version } = JSON.parse(readFileSync(pkgPath, "utf8"));
const code = readFileSync(mjsPath, "utf8");
const patched = code.replace(
  "const version = __VERSION__",
  `const version = ${JSON.stringify(version)}`,
);

if (code !== patched) {
  writeFileSync(mjsPath, patched);
  console.log(`Patched katex ESM: __VERSION__ -> "${version}"`);
} else {
  console.log("katex ESM already patched or pattern not found");
}
