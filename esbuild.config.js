import { build, context } from "esbuild";
import alias from "esbuild-plugin-alias";
import { readdir } from "fs/promises";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = __dirname;
const TOOLS_DIR = join(ROOT_DIR, "tools");
const BUILD_DIR = join(ROOT_DIR, "build");

async function getTools() {
  const tools = await readdir(TOOLS_DIR, { withFileTypes: true });
  return tools
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);
}

function getBuildConfig(toolName, watch = false) {
  const toolDir = join(TOOLS_DIR, toolName);
  const outDir = join(BUILD_DIR, toolName);
  const indexPath = join(toolDir, "index.ts");
  const htmlPath = join(toolDir, "overlay.html");
  const configPath = join(ROOT_DIR, "shared", "config.ts");

  const commonOptions = {
    bundle: true,
    outdir: outDir,
    platform: "browser",
    target: "es2020",
    format: "esm",
    plugins: [
      alias({
        "shared/client": join(ROOT_DIR, "shared", "client.ts"),
        "shared/config": join(ROOT_DIR, "shared", "config.ts"),
      }),
    ],
    sourcemap: !watch,
    minify: !watch,
  };

  return { commonOptions, toolName, outDir, htmlPath, configPath };
}

async function copyHtmlWithConfig(toolName, outDir, htmlPath) {
  const fs = await import("fs");
  const cdnScript = `<script src="https://cdn.jsdelivr.net/npm/@streamerbot/client/dist/streamerbot-client.js"></script>\n    `;

  if (fs.existsSync(htmlPath)) {
    let htmlContent = await fs.promises.readFile(htmlPath, "utf-8");
    htmlContent = htmlContent.replace(/(<\/head>)/, `${cdnScript}$1`);

    await fs.promises.writeFile(join(outDir, "overlay.html"), htmlContent);
    console.log(`Copied and updated overlay.html for ${toolName}`);
  }
}

async function buildAll() {
  const tools = await getTools();
  const configs = tools.map((tool) => getBuildConfig(tool, false));

  const promises = configs.map(
    async ({ commonOptions, toolName, outDir, htmlPath, configPath }) => {
      const indexPath = join(TOOLS_DIR, toolName, "index.ts");

      await build({
        ...commonOptions,
        entryPoints: [indexPath],
      });

      const fs = await import("fs");
      await build({
        entryPoints: [configPath],
        outfile: join(outDir, "config.js"),
        bundle: true,
        platform: "browser",
        target: "es2020",
        format: "esm",
        minify: false,
        sourcemap: false,
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
  const configs = tools.map((tool) => getBuildConfig(tool, true));

  const contexts = await Promise.all(
    configs.map(async ({ commonOptions, toolName, outDir, htmlPath }) => {
      const ctx = await context({
        ...commonOptions,
        plugins: [
          alias({
            "shared/client": join(ROOT_DIR, "shared", "client.ts"),
            "shared/config": join(ROOT_DIR, "shared", "config.ts"),
          }),
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
