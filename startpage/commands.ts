import { ToolCommand, ToolCommands, ToolInfo } from "shared/types";
import { populateToolSelect } from "shared/utils";

declare const DISCOVERED_TOOLS: string[];

interface State {
  info?: ToolInfo;
}

const state: State = {};

function getToolFromUrlParams(): string | null {
  const params = new URLSearchParams(window.location.search);
  return params.get("tool");
}

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

function renderCommandsTable(
  tbody: HTMLTableSectionElement,
  commands: ToolCommand[],
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
  const toolSelect = document.getElementById(
    "tool-select",
  ) as HTMLSelectElement;
  if (!toolSelect || !toolSelect.value) {
    return;
  }

  const tool = toolSelect.value;
  const baseUrl = `${window.location.protocol}//${window.location.host}`;

  try {
    state.info = await getToolInfo(tool, baseUrl);

    const everyoneSection = document.getElementById(
      "everyone-commands-section",
    ) as HTMLDivElement;
    const moderatorSection = document.getElementById(
      "moderator-commands-section",
    ) as HTMLDivElement;
    const noCommands = document.getElementById("no-commands") as HTMLDivElement;

    const everyoneTbody = document.querySelector(
      "#everyone-table tbody",
    ) as HTMLTableSectionElement;
    const moderatorTbody = document.querySelector(
      "#moderator-table tbody",
    ) as HTMLTableSectionElement;

    const hasEveryone =
      state.info?.commands.everyone && state.info.commands.everyone.length > 0;
    const hasModerators =
      state.info?.commands.moderators &&
      state.info.commands.moderators.length > 0;

    if (hasEveryone && everyoneTbody && everyoneSection) {
      renderCommandsTable(everyoneTbody, state.info.commands.everyone!);
      everyoneSection.classList.remove("hidden");
    } else {
      if (everyoneSection) {
        everyoneSection.classList.add("hidden");
      }
    }

    if (hasModerators && moderatorTbody && moderatorSection) {
      renderCommandsTable(moderatorTbody, state.info.commands.moderators!);
      moderatorSection.classList.remove("hidden");
    } else {
      if (moderatorSection) {
        moderatorSection.classList.add("hidden");
      }
    }

    if (!hasEveryone && !hasModerators && noCommands) {
      noCommands.classList.remove("hidden");
    } else {
      if (noCommands) {
        noCommands.classList.add("hidden");
      }
    }
  } catch (error) {
    console.error("Error rendering commands:", error);
  }
}

function updateUrlTool(tool: string) {
  const params = new URLSearchParams(window.location.search);
  params.set("tool", tool);
  const newUrl = `${window.location.pathname}?${params.toString()}`;
  history.pushState({}, "", newUrl);
}

function setupEventListeners() {
  const toolSelect = document.getElementById(
    "tool-select",
  ) as HTMLSelectElement;
  if (toolSelect) {
    toolSelect.addEventListener("change", () => {
      if (toolSelect.value) {
        updateUrlTool(toolSelect.value);
      }
      renderCommands();
    });
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const urlTool = getToolFromUrlParams();
  const selectedTool =
    urlTool && DISCOVERED_TOOLS.includes(urlTool)
      ? urlTool
      : DISCOVERED_TOOLS[0];

  populateToolSelect("tool-select", DISCOVERED_TOOLS, selectedTool);

  const toolSelect = document.getElementById(
    "tool-select",
  ) as HTMLSelectElement;
  if (toolSelect && selectedTool) {
    toolSelect.value = selectedTool;
    await renderCommands();

    if (!urlTool) {
      updateUrlTool(selectedTool);
    }
  }

  setupEventListeners();
});
