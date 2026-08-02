import { Config } from "shared/config";
import { ToolInfo } from "shared/types";
import { populateToolSelect, copyToClipboard } from "shared/utils";

declare const DISCOVERED_TOOLS: string[];

interface GeneratedUrls {
  commands: string;
  dashboard?: string;
  overlay?: string;
  bot: string;
}

interface State {
  info?: ToolInfo;
  botFile?: string;
  urls?: GeneratedUrls;
}

const state: State = {};

async function getToolInfo(tool: string, baseUrl: string): Promise<ToolInfo> {
  try {
    const req = await fetch(`${baseUrl}/${tool}/info.json`);

    if (!req.ok) {
      console.warn(`Failed to fetch tool info for ${tool}: ${req.status}`);
      return { hasDashboard: true, hasOverlay: true, commands: {} };
    }

    return await req.json();
  } catch (error) {
    console.error(`Error fetching tool info for ${tool}:`, error);
    return { hasDashboard: true, hasOverlay: true, commands: {} };
  }
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

  const commandsUrl = new URL(`${baseUrl}/commands`);
  commandsUrl.searchParams.append("tool", tool);

  const paramString = params.toString();
  const suffix = paramString ? `?${paramString}` : "";

  const dashboardPath = `/${tool}/dashboard`;
  const overlayPath = `/${tool}/overlay`;
  const botPath = `/${tool}/bot.sb`;

  return {
    commands: commandsUrl.toString(),
    dashboard: `${baseUrl}${dashboardPath}${suffix}`,
    overlay: `${baseUrl}${overlayPath}${suffix}`,
    bot: `${baseUrl}${botPath}`,
  };
}

async function getStreamerBotConfig(url: string): Promise<string> {
  try {
    const req = await fetch(url);

    if (!req.ok) {
      console.warn(`Failed to fetch bot config from ${url}: ${req.status}`);
      return "Unable to load content";
    }

    return await req.text();
  } catch (error) {
    console.error(`Error fetching bot config from ${url}:`, error);
    return "Unable to load content";
  }
}

async function renderResults() {
  const toolSelect = document.getElementById(
    "tool-select",
  ) as HTMLSelectElement;

  if (!toolSelect || !toolSelect.value) {
    showErrorMessage("Please select a tool first.");
    return;
  }

  const tool = toolSelect.value;
  const baseUrl = `${window.location.origin}${window.location.pathname
    .replace(/\/index.html$/, "")
    .replace(/\/index$/, "")
    .replace(/\/$/, "")}`;

  try {
    state.info = await getToolInfo(tool, baseUrl);

    const hostInput = document.getElementById("host") as HTMLInputElement;
    const portInput = document.getElementById("port") as HTMLInputElement;
    const endpointInput = document.getElementById(
      "endpoint",
    ) as HTMLInputElement;
    const passwordInput = document.getElementById(
      "password",
    ) as HTMLInputElement;

    // Minimal port validation
    const port = parseInt(portInput.value);
    if (isNaN(port) || port < 1 || port > 65535) {
      showErrorMessage("Please enter a valid port number (1-65535).");
      return;
    }

    const config: Config = {
      host: hostInput.value,
      port: port,
      endpoint: endpointInput.value,
      password: passwordInput.value,
    };

    state.urls = generateUrls(tool, config, baseUrl);
    state.botFile = await getStreamerBotConfig(state.urls.bot);

    const commandsPageAnchor = document.getElementById(
      "open-commands",
    ) as HTMLAnchorElement;

    const botContainer = document.getElementById("sb-content")!;
    const botDownloadAnchor = document.getElementById(
      "sb-download",
    ) as HTMLAnchorElement;
    const dashboardUrl = document.getElementById("dashboard-url")!;
    const dashboardUrlContainer = document.getElementById(
      "dashboard-url-container",
    )!;
    const overlayUrl = document.getElementById("overlay-url")!;
    const overlayUrlContainer = document.getElementById(
      "overlay-url-container",
    )!;

    if (commandsPageAnchor && state.urls) {
      commandsPageAnchor.href = state.urls.commands;
    }

    if (botContainer) {
      botContainer.innerText = state.botFile || "Unable to load content";
    }
    if (botDownloadAnchor && state.urls) {
      botDownloadAnchor.href = state.urls.bot;
    }

    if (state.info?.hasDashboard && state.urls?.dashboard) {
      const link = document.createElement("a");
      link.href = state.urls.dashboard;
      link.textContent = state.urls.dashboard;
      dashboardUrl.innerHTML = "";
      dashboardUrl.appendChild(link);
      dashboardUrlContainer.classList.remove("hidden");
    } else {
      dashboardUrlContainer.classList.add("hidden");
    }

    if (state.info?.hasOverlay && state.urls?.overlay) {
      const link = document.createElement("a");
      link.href = state.urls.overlay;
      link.textContent = state.urls.overlay;
      overlayUrl.innerHTML = "";
      overlayUrl.appendChild(link);
      overlayUrlContainer.classList.remove("hidden");
    } else {
      overlayUrlContainer.classList.add("hidden");
    }

    const resultsSection = document.getElementById("results-section")!;
    resultsSection.classList.remove("hidden");

    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  } catch (error) {
    console.error("Error rendering results:", error);
    showErrorMessage(
      "An error occurred while generating the setup. Please check the console for details.",
    );
  }
}

function showErrorMessage(message: string) {
  const resultsSection = document.getElementById("results-section");
  if (resultsSection) {
    resultsSection.classList.add("hidden");
  }

  const existingError = document.getElementById("error-message");
  if (existingError) {
    existingError.remove();
  }

  const errorDiv = document.createElement("div");
  errorDiv.id = "error-message";
  errorDiv.className = "error-message";
  errorDiv.textContent = message;

  const main = document.querySelector("main");
  if (main) {
    main.insertBefore(errorDiv, main.firstChild);
  }

  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
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

document.addEventListener("DOMContentLoaded", () => {
  populateToolSelect("tool-select", DISCOVERED_TOOLS);
  setupEventListeners();
});
