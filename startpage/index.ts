import { Config } from "shared/config";

declare const DISCOVERED_TOOLS: string[];

interface GeneratedUrls {
  commands: string;
  dashboard?: string;
  overlay?: string;
  bot: string;
}

interface ToolCommand {
  command: string;
  description: string;
}

interface ToolCommands {
  everyone?: ToolCommand[];
  moderators?: ToolCommand[];
}

interface ToolInfo {
  hasDashboard: boolean;
  hasOverlay: boolean;
  commands: ToolCommands;
}

interface State {
  info?: ToolInfo;
  botFile?: string;
  urls?: GeneratedUrls;
}

const state: State = {};

async function getToolInfo(tool: string, baseUrl: string): Promise<ToolInfo> {
  const req = await fetch(`${baseUrl}/${tool}/info.json`);

  if (!req.ok) {
    return { hasDashboard: true, hasOverlay: true, commands: {} };
  }

  return await req.json();
}

function generateUrls(
  tool: string,
  config: Config,
  baseUrl: string,
): GeneratedUrls {
  const params = new URLSearchParams();

  if (config.host && config.host !== "127.0.0.1") {
    params.set("host", config.host);
  }
  if (config.port && config.port !== 8080) {
    params.set("port", config.port.toString());
  }
  if (config.endpoint && config.endpoint !== "/") {
    params.set("endpoint", config.endpoint);
  }
  if (config.password) {
    params.set("password", config.password);
  }

  const commandsUrl = new URL(`${baseUrl}/commands.html`);
  commandsUrl.searchParams.append("tool", tool);

  const paramString = params.toString();
  const suffix = paramString ? `?${paramString}` : "";

  const dashboardPath = `/${tool}/dashboard.html`;
  const overlayPath = `/${tool}/overlay.html`;
  const botPath = `/${tool}/bot.sb`;

  return {
    commands: commandsUrl.toString(),
    dashboard: `${baseUrl}${dashboardPath}${suffix}`,
    overlay: `${baseUrl}${overlayPath}${suffix}`,
    bot: `${baseUrl}${botPath}`,
  };
}

async function getStreamerBotConfig(url: string): Promise<string> {
  let req = await fetch(url);

  if (!req.ok) {
    return "Unable to load content";
  }

  return await req.text();
}

function copyToClipboard(content: string, button: HTMLElement) {
  navigator.clipboard.writeText(content).then(() => {
    const originalText = button.textContent;
    button.textContent = "Copied!";
    setTimeout(() => {
      button.textContent = originalText;
    }, 1000);
  });
}

async function renderResults() {
  const toolSelect = document.getElementById(
    "tool-select",
  ) as HTMLSelectElement;
  const tool = toolSelect.value;
  const baseUrl = `${window.location.protocol}//${window.location.host}`;

  state.info = await getToolInfo(tool, baseUrl);

  const hostInput = document.getElementById("host") as HTMLInputElement;
  const portInput = document.getElementById("port") as HTMLInputElement;
  const endpointInput = document.getElementById("endpoint") as HTMLInputElement;
  const passwordInput = document.getElementById("password") as HTMLInputElement;

  const config: Config = {
    host: hostInput.value,
    port: parseInt(portInput.value),
    endpoint: endpointInput.value,
    password: passwordInput.value,
  };

  state.urls = generateUrls(tool, config, baseUrl);
  state.botFile = await getStreamerBotConfig(state.urls.bot);

  const commandsPageAnchor = document.getElementById(
    "open-commands",
  )! as HTMLAnchorElement;

  const botContainer = document.getElementById("sb-content")!;
  const botDownloadAnchor = document.getElementById(
    "sb-download",
  )! as HTMLAnchorElement;
  const dashboardUrl = document.getElementById("dashboard-url")!;
  const dashboardUrlContainer = document.getElementById(
    "dashboard-url-container",
  )!;
  const overlayUrl = document.getElementById("overlay-url")!;
  const overlayUrlContainer = document.getElementById("overlay-url-container")!;

  commandsPageAnchor.href = state.urls.commands;

  botContainer.innerText = state.botFile;
  botDownloadAnchor.href = state.urls.bot;

  if (state.info?.hasDashboard) {
    dashboardUrl.innerHTML = `<a href="${state.urls.dashboard}">${state.urls.dashboard || ""}</a>`;
    dashboardUrlContainer.classList.remove("hidden");
  } else {
    dashboardUrlContainer.classList.add("hidden");
  }

  if (state.info?.hasOverlay) {
    overlayUrl.innerHTML = `<a href="${state.urls.overlay}">${state.urls.overlay || ""}</a>`;
    overlayUrlContainer.classList.remove("hidden");
  } else {
    overlayUrlContainer.classList.add("hidden");
  }

  const resultsSection = document.getElementById("results-section")!;
  resultsSection.classList.remove("hidden");

  window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
}

function setupEventListeners() {
  const generateBtn = document.getElementById("generate-btn");
  if (generateBtn) {
    generateBtn.addEventListener("click", (e) => {
      e.preventDefault();
      renderResults();
    });
  }

  ["dashboard-url", "overlay-url"].forEach((id) => {
    const urlCopyBtn = document.querySelector(`#${id} + button`);
    if (urlCopyBtn) {
      urlCopyBtn.addEventListener("click", (e) => {
        if (!e.target) return;
        const btn = e.target as HTMLElement;

        const contentContainer = document.getElementById(id);
        if (!contentContainer) return;

        copyToClipboard(contentContainer.innerText, btn);
      });
    }
  });

  const codeCopyBtn = document.getElementById("sb-copy");
  if (codeCopyBtn) {
    codeCopyBtn.addEventListener("click", (e) => {
      if (!e.target) return;
      const btn = e.target as HTMLElement;

      if (state.botFile) {
        copyToClipboard(state.botFile, btn);
      }
    });
  }
}

function populateToolSelect() {
  const select = document.getElementById("tool-select") as HTMLSelectElement;
  if (!select) return;

  select.innerHTML = "";
  DISCOVERED_TOOLS.forEach((tool) => {
    const option = document.createElement("option");
    option.value = tool;
    option.textContent = tool
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
    select.appendChild(option);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  populateToolSelect();
  setupEventListeners();
});
