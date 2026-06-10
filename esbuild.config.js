import { build, context } from "esbuild";
import alias from "esbuild-plugin-alias";
import { readdir, writeFile, readFile, copyFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import { join, dirname, basename } from "path";
import { fileURLToPath } from "url";

const ROOT_DIR = dirname(fileURLToPath(import.meta.url));
const TOOLS_DIR = join(ROOT_DIR, "tools");
const BUILD_DIR = join(ROOT_DIR, "build");

const CDN_SCRIPT = `  <script src="https://cdn.jsdelivr.net/npm/@streamerbot/client/dist/streamerbot-client.js"></script>\n`;

const IGNORED_ASSETS = ["ts", "html", "cs"];

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

function getCommonOptions(outDir, shared, watch) {
  return {
    bundle: true,
    outdir: outDir,
    platform: "browser",
    target: "es2020",
    format: "esm",
    plugins: [alias({ ...shared })],
    sourcemap: watch,
    minify: false,
  };
}

async function getStartpageBuildConfig(shared, watch = false) {
  const startpageDir = join(ROOT_DIR, "startpage");
  const indexPath = join(startpageDir, "index.ts");
  const htmlPath = join(startpageDir, "index.html");

  const commonOptions = getCommonOptions(BUILD_DIR, shared, watch);

  return { commonOptions, indexPath, htmlPath };
}

async function copyStartpageHtml(tools, outDir, htmlPath) {
  const toolsJson = JSON.stringify(tools);
  const toolsScript = `<script>const DISCOVERED_TOOLS = ${toolsJson};</script>\n`;

  let htmlContent = await readFile(htmlPath, "utf-8");
  htmlContent = htmlContent.replace(/(<\/head>)/, `${toolsScript}$1`);

  await writeFile(join(outDir, "index.html"), htmlContent);
  console.log(`Copied and updated html for startpage`);
}

async function getBuildConfig(toolName, shared, watch = false) {
  const toolDir = join(TOOLS_DIR, toolName);
  const outDir = join(BUILD_DIR, toolName);

  const htmlPaths = [
    join(toolDir, "overlay.html"),
    join(toolDir, "dashboard.html"),
  ].filter((p) => existsSync(p));
  const indexPaths = [
    join(toolDir, "overlay.ts"),
    join(toolDir, "dashboard.ts"),
  ].filter((p) => existsSync(p));
  const configPath = join(toolDir, "config.ts");

  const commonOptions = getCommonOptions(outDir, shared, watch);
  return { commonOptions, toolName, outDir, htmlPaths, indexPaths, configPath };
}

async function copyHtmlWithConfig(toolName, outDir, htmlPaths) {
  htmlPaths.forEach(async (htmlPath) => {
    let fileName = basename(htmlPath);

    let htmlContent = await readFile(htmlPath, "utf-8");
    htmlContent = htmlContent.replace(/(<\/head>)/, `${CDN_SCRIPT}$1`);

    await writeFile(join(outDir, fileName), htmlContent);
    console.log(`Copied and updated ${fileName} for ${toolName}`);
  });
}

async function copyAssets(toolDir, outDir) {
  const entries = await readdir(toolDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = join(toolDir, entry.name);
    const destPath = join(outDir, entry.name);

    if (entry.isFile()) {
      const ext = basename(entry.name).split(".").pop();
      if (!IGNORED_ASSETS.includes(ext) && !entry.name.startsWith(".")) {
        await mkdir(dirname(destPath), { recursive: true });
        await copyFile(sourcePath, destPath);
        console.log(`Copied asset: ${entry.name} for ${basename(toolDir)}`);
      }
    }
  }
}

async function buildAll() {
  const tools = await getTools();
  const shared = await getSharedAliases();

  const configs = await Promise.all(
    tools.map((tool) => getBuildConfig(tool, shared, false)),
  );

  const promises = configs.map(
    async ({
      commonOptions,
      toolName,
      outDir,
      htmlPaths,
      indexPaths,
      configPath,
    }) => {
      const toolDir = join(TOOLS_DIR, toolName);

      await build({
        ...commonOptions,
        entryPoints: [
          ...indexPaths,
          ...(existsSync(configPath) ? [configPath] : []),
        ],
      });

      await copyHtmlWithConfig(toolName, outDir, htmlPaths);
      await copyAssets(toolDir, outDir);
      console.log(`Built: ${toolName}`);
      console.log();
    },
  );

  await Promise.all(promises);

  console.log("All tools built successfully");
  console.log();

  const {
    commonOptions: startpageOptions,
    indexPath: startpageIndex,
    htmlPath: startpageHtml,
  } = await getStartpageBuildConfig(shared, false);
  await build({
    ...startpageOptions,
    entryPoints: [startpageIndex],
  });
  await copyStartpageHtml(tools, BUILD_DIR, startpageHtml);

  console.log("Built: Startpage");
}

async function watchAll() {
  const tools = await getTools();
  const shared = await getSharedAliases();

  const configs = await Promise.all(
    tools.map((tool) => getBuildConfig(tool, shared, true)),
  );

  const contexts = await Promise.all(
    configs.map(
      async ({
        commonOptions,
        toolName,
        outDir,
        htmlPaths,
        indexPaths,
        configPath,
      }) => {
        const toolDir = join(TOOLS_DIR, toolName);
        const ctx = await context({
          ...commonOptions,
          entryPoints: [
            ...indexPaths,
            ...(existsSync(configPath) ? [configPath] : []),
          ],
          plugins: [
            {
              name: "assets-copier",
              setup(build) {
                build.onEnd(async () => {
                  await copyHtmlWithConfig(toolName, outDir, htmlPaths);
                  await copyAssets(toolDir, outDir);
                });
              },
            },
          ],
        });
        console.log(`Watching: ${toolName}`);
        return ctx;
      },
    ),
  );

  const {
    commonOptions: startpageOptions,
    indexPath: startpageIndex,
    htmlPath: startpageHtml,
  } = await getStartpageBuildConfig(shared, true);
  contexts.push(
    await context({
      ...startpageOptions,
      entryPoints: [startpageIndex],
      plugins: [
        {
          name: "assets-copier",
          setup(build) {
            build.onEnd(async () => {
              await copyStartpageHtml(tools, BUILD_DIR, startpageHtml);
            });
          },
        },
      ],
    }),
  );
  console.log(`Watching: Startpage`);

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
