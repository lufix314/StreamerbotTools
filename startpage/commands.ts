import { Config } from "shared/config";

declare const DISCOVERED_TOOLS: string[];

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
}

const state: State = {};

function getToolFromUrlParams(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("tool");
}

async function getToolInfo(tool: string, baseUrl: string): Promise<ToolInfo> {
  const req = await fetch(`${baseUrl}/${tool}/info.json`);

  if (!req.ok) {
    return { hasDashboard: true, hasOverlay: true, commands: {} };
  }

  return await req.json();
}

function populateToolSelect(selectedTool?: string) {
  const select = document.getElementById("tool-select") as HTMLSelectElement;
  if (!select) return;

  select.innerHTML = "";
  DISCOVERED_TOOLS.forEach((tool) => {
    const option = document.createElement("option");
    option.value = tool;
    option.textContent = tool
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase());
    if (selectedTool && tool === selectedTool) {
      option.selected = true;
    }
    select.appendChild(option);
  });
}

function renderCommandsTable(
  tbody: HTMLTableSectionElement,
  commands: ToolCommand[]
) {
  tbody.innerHTML = "";
  commands.forEach((cmd) => {
    const row = document.createElement("tr");
    const commandCell = document.createElement("td");
    commandCell.className = "command";
    commandCell.textContent = cmd.command;
    const descriptionCell = document.createElement("td");
    descriptionCell.className = "description";
    descriptionCell.textContent = cmd.description;
    row.appendChild(commandCell);
    row.appendChild(descriptionCell);
    tbody.appendChild(row);
  });
}

async function renderCommands() {
  const toolSelect = document.getElementById("tool-select") as HTMLSelectElement;
  const tool = toolSelect.value;
  const baseUrl = `${window.location.protocol}//${window.location.host}`;

  state.info = await getToolInfo(tool, baseUrl);

  const everyoneSection = document.getElementById(
    "everyone-commands-section"
  )! as HTMLDivElement;
  const moderatorSection = document.getElementById(
    "moderator-commands-section"
  )! as HTMLDivElement;
  const noCommands = document.getElementById("no-commands")! as HTMLDivElement;

  const everyoneTbody = document.querySelector(
    "#everyone-table tbody"
  ) as HTMLTableSectionElement;
  const moderatorTbody = document.querySelector(
    "#moderator-table tbody"
  ) as HTMLTableSectionElement;

  const hasEveryone = state.info?.commands.everyone && state.info.commands.everyone.length > 0;
  const hasModerators = state.info?.commands.moderators && state.info.commands.moderators.length > 0;

  if (hasEveryone) {
    renderCommandsTable(everyoneTbody, state.info.commands.everyone!);
    everyoneSection.classList.remove("hidden");
  } else {
    everyoneSection.classList.add("hidden");
  }

  if (hasModerators) {
    renderCommandsTable(moderatorTbody, state.info.commands.moderators!);
    moderatorSection.classList.remove("hidden");
  } else {
    moderatorSection.classList.add("hidden");
  }

  if (!hasEveryone && !hasModerators) {
    noCommands.classList.remove("hidden");
  } else {
    noCommands.classList.add("hidden");
  }
}

function setupEventListeners() {
  const toolSelect = document.getElementById("tool-select") as HTMLSelectElement;
  if (toolSelect) {
    toolSelect.addEventListener("change", () => {
      renderCommands();
    });
  }

  const hostInput = document.getElementById("host") as HTMLInputElement;
  const portInput = document.getElementById("port") as HTMLInputElement;
  const endpointInput = document.getElementById("endpoint") as HTMLInputElement;
  const passwordInput = document.getElementById("password") as HTMLInputElement;

  [hostInput, portInput, endpointInput, passwordInput].forEach((input) => {
    if (input) {
      input.addEventListener("input", () => {
        const currentTool = toolSelect?.value;
        if (currentTool && state.info) {
          renderCommands();
        }
      });
    }
  });
}

document.addEventListener("DOMContentLoaded", async () => {
  populateToolSelect();

  const urlTool = getToolFromUrlParams();
  const toolSelect = document.getElementById("tool-select") as HTMLSelectElement;

  if (urlTool && DISCOVERED_TOOLS.includes(urlTool)) {
    toolSelect.value = urlTool;
    await renderCommands();
  }

  setupEventListeners();
});
