import { Config } from "shared/config";

declare const DISCOVERED_TOOLS: string[];

interface GeneratedUrls {
  dashboard?: string;
  overlay?: string;
}

interface State {
  configJs?: string;
  urls: GeneratedUrls;
}

const state: State = {
  urls: {},
};

function generateUrls(
  tool: string,
  config: Config,
  baseUrl: string,
): GeneratedUrls {
  const urls: GeneratedUrls = {};
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

  const paramString = params.toString();
  const suffix = paramString ? `?${paramString}` : "";

  const dashboardPath = `/${tool}/dashboard.html`;
  const overlayPath = `/${tool}/overlay.html`;

  urls.dashboard = `${baseUrl}${dashboardPath}${suffix}`;
  urls.overlay = `${baseUrl}${overlayPath}${suffix}`;

  return urls;
}

function generateConfigJs(config: Config): string {
  return `window.overlayConfig = {
  host: "${config.host}",
  port: ${config.port},
  endpoint: "${config.endpoint}",
  password: "${config.password}",
};`;
}

function downloadConfigJs(content: string) {
  const blob = new Blob([content], {
    type: "text/javascript",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `config.js`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
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

function renderResults() {
  const toolSelect = document.getElementById(
    "tool-select",
  ) as HTMLSelectElement;
  const tool = toolSelect.value;

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

  const baseUrl = `${window.location.protocol}//${window.location.host}`;
  state.urls = generateUrls(tool, config, baseUrl);
  state.configJs = generateConfigJs(config);

  const dashboardUrlContainer = document.getElementById("dashboard-url");
  const overlayUrlContainer = document.getElementById("overlay-url");
  const configContainer = document.getElementById("config-content");

  if (dashboardUrlContainer) {
    dashboardUrlContainer.innerHTML = `<a href="${state.urls.dashboard}">${state.urls.dashboard || ""}</a>`;
  }

  if (overlayUrlContainer) {
    overlayUrlContainer.innerHTML = `<a href="${state.urls.overlay}">${state.urls.overlay || ""}</a>`;
  }

  if (configContainer) {
    configContainer.innerText = state.configJs;
  }

  const resultsSection = document.getElementById("results-section");
  if (resultsSection) {
    resultsSection.classList.remove("hidden");
  }

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

  const codeCopyBtn = document.getElementById("config-copy");
  if (codeCopyBtn) {
    codeCopyBtn.addEventListener("click", (e) => {
      if (!e.target) return;
      const btn = e.target as HTMLElement;

      copyToClipboard(state.configJs || "", btn);
    });
  }

  const codeDownloadBtn = document.getElementById("config-download");
  if (codeDownloadBtn) {
    codeDownloadBtn.addEventListener("click", (e) => {
      downloadConfigJs(state.configJs || "");
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
