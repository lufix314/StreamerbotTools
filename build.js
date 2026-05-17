import { execSync } from "child_process";
import {
  readdirSync,
  mkdirSync,
  existsSync,
  copyFileSync,
  rmSync,
  writeFileSync,
  statSync,
  readFileSync,
} from "fs";
import { join, basename } from "path";

const toolsName = process.argv[2];
const toolsDir = "tools";

function buildOverlay(name) {
  const overlayPath = join(toolsDir, name);
  const buildPath = join("build", name);

  if (!existsSync(overlayPath)) {
    console.error(`Overlay "${name}" not found at ${overlayPath}`);
    process.exit(1);
  }

  console.log(`Building overlay: ${name}`);

  rmSync(buildPath, { recursive: true, force: true });
  mkdirSync(buildPath, { recursive: true });

  const tsconfig = {
    compilerOptions: {
      target: "ES2020",
      module: "ESNext",
      moduleResolution: "bundler",
      strict: true,
      esModuleInterop: true,
      skipLibCheck: true,
      declaration: true,
      declarationMap: true,
      sourceMap: true,
      rootDir: ".",
      outDir: `build/${name}`,
      composite: true,
    },
    include: ["shared/**/*", `tools/${name}/**/*`],
    exclude: ["node_modules", "build"],
  };

  const tsconfigPath = join(`${name}-tsconfig.json`);
  const tsconfigContent = JSON.stringify(tsconfig, null, 2);
  writeFileSync(tsconfigPath, tsconfigContent);

  execSync(`tsc -p ${tsconfigPath}`, { stdio: "inherit" });

  const tsbuildinfoFiles = readdirSync(buildPath).filter((f) =>
    f.endsWith(".tsbuildinfo"),
  );
  for (const f of tsbuildinfoFiles) {
    rmSync(join(buildPath, f));
  }

  const htmlFiles = readdirSync(overlayPath).filter((f) => f.endsWith(".html"));
  for (const htmlFile of htmlFiles) {
    const srcPath = join(overlayPath, htmlFile);
    const destPath = join(buildPath, htmlFile);

    let htmlContent = readFileSync(srcPath, "utf-8");

    htmlContent = htmlContent.replace(
      /<script\s+src=["']shared\/([^"']+)["']\s*><\/script>/g,
      (match, p1) => `<script src="./shared/${p1}"></script>`,
    );

    const cdnScript = `<script src="https://cdn.jsdelivr.net/npm/@streamerbot/client/dist/streamerbot-client.js"></script>\n    `;
    if (!htmlContent.includes("streamerbot-client.js")) {
      htmlContent = htmlContent.replace(/(<\/head>)/, `${cdnScript}$1`);
    }

    writeFileSync(destPath, htmlContent);
    console.log(`Processed ${htmlFile}`);
  }

  rmSync(tsconfigPath);

  console.log(`Built ${name}`);
}

if (toolsName) {
  buildOverlay(toolsName);
} else {
  console.log("Building all overlays...");
  const overlays = readdirSync(toolsDir).filter((dir) => {
    const fullPath = join(toolsDir, dir);
    return statSync(fullPath).isDirectory();
  });

  if (overlays.length === 0) {
    console.log("No overlays found");
    process.exit(0);
  }

  for (const overlay of overlays) {
    buildOverlay(overlay);
  }

  console.log(`Built ${overlays.length} overlay(s)`);
}
