import { build, context } from "esbuild";
import alias from "esbuild-plugin-alias";
import { readdir, writeFile, readFile } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const ROOT_DIR = dirname(fileURLToPath(import.meta.url));
const TOOLS_DIR = join(ROOT_DIR, "tools");
const BUILD_DIR = join(ROOT_DIR, "build");

const CDN_SCRIPT = `  <script src="https://cdn.jsdelivr.net/npm/@streamerbot/client/dist/streamerbot-client.js"></script>\n`;

async function getTools() {
  const tools = await readdir(TOOLS_DIR, { withFileTypes: true });
  return tools
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}

async function getSharedAliases() {
  const sharedDir = join(ROOT_DIR, "shared");
  const files = await readdir(sharedDir, { withFileTypes: true });
  const aliases = {};
  for (const file of files) {
    if (file.isFile() && file.name.endsWith(".ts")) {
      const name = file.name.replace(/\.ts$/, "");
      aliases[`shared/${name}`] = join(sharedDir, file.name);
    }
  }
  return aliases;
}

async function getBuildConfig(toolName, watch = false) {
  const toolDir = join(TOOLS_DIR, toolName);
  const outDir = join(BUILD_DIR, toolName);

  const htmlPath = join(toolDir, "overlay.html");
  const indexPath = join(toolDir, "index.ts");
  const configPath = join(toolDir, "config.ts");

  const sharedAliases = await getSharedAliases();

  const commonOptions = {
    bundle: true,
    outdir: outDir,
    platform: "browser",
    target: "es2020",
    format: "esm",
    plugins: [alias({ ...sharedAliases })],
    sourcemap: watch,
    minify: false,
  };

  return { commonOptions, toolName, outDir, htmlPath, indexPath, configPath };
}

async function copyHtmlWithConfig(toolName, outDir, htmlPath) {
  if (existsSync(htmlPath)) {
    let htmlContent = await readFile(htmlPath, "utf-8");
    htmlContent = htmlContent.replace(/(<\/head>)/, `${CDN_SCRIPT}$1`);

    await writeFile(join(outDir, "overlay.html"), htmlContent);
    console.log(`Copied and updated overlay.html for ${toolName}`);
  }
}

async function buildAll() {
  const tools = await getTools();
  const configs = await Promise.all(
    tools.map((tool) => getBuildConfig(tool, false)),
  );

  const promises = configs.map(
    async ({
      commonOptions,
      toolName,
      outDir,
      htmlPath,
      indexPath,
      configPath,
    }) => {
      await build({
        ...commonOptions,
        entryPoints: [indexPath, configPath],
      });

      await copyHtmlWithConfig(toolName, outDir, htmlPath);
      console.log(`Built: ${toolName}`);
    },
  );

  await Promise.all(promises);
  console.log("All tools built successfully");
}

async function watchAll() {
  const tools = await getTools();
  const configs = await Promise.all(
    tools.map((tool) => getBuildConfig(tool, true)),
  );

  const contexts = await Promise.all(
    configs.map(async ({ commonOptions, toolName, outDir, htmlPath }) => {
      const ctx = await context({
        ...commonOptions,
        plugins: [
          {
            name: "html-copier",
            setup(build) {
              build.onEnd(async () => {
                await copyHtmlWithConfig(toolName, outDir, htmlPath);
              });
            },
          },
        ],
      });
      console.log(`Watching: ${toolName}`);
      return ctx;
    }),
  );

  await Promise.all(contexts.map((ctx) => ctx.watch()));
  console.log("All tools are now being watched. Press Ctrl+C to stop.");

  process.on("SIGINT", async () => {
    console.log("\nShutting down watchers...");
    await Promise.all(contexts.map((ctx) => ctx.dispose()));
    process.exit(0);
  });
}

const mode = process.argv[2] || "build";

if (mode === "watch") {
  watchAll().catch(console.error);
} else {
  buildAll().catch(console.error);
}
