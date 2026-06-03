// Generates the icon map + copies Material Icon Theme SVGs into public/icons.
// Runs before dev/build (see package.json). material-icon-theme is a
// devDependency used only here — none of it ends up in the runtime bundle.

import { cp, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateManifest } from "material-icon-theme";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(import.meta.url);
const pkgDir = dirname(require.resolve("material-icon-theme/package.json"));

const m = generateManifest();
const map = {
  languageIds: m.languageIds,
  fileExtensions: m.fileExtensions,
  fileNames: m.fileNames,
  file: m.file, // default fallback icon name
};

await mkdir(join(root, "src/lib"), { recursive: true });
await writeFile(
  join(root, "src/lib/icon-map.json"),
  `${JSON.stringify(map)}\n`,
);

await mkdir(join(root, "public/icons"), { recursive: true });
await cp(join(pkgDir, "icons"), join(root, "public/icons"), {
  recursive: true,
});

console.log(
  `synced icons: ${Object.keys(map.languageIds).length} languages, ` +
    `${Object.keys(map.fileExtensions).length} extensions`,
);
