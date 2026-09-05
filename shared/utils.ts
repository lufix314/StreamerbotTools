import { ToolInfo } from "shared/types";

export function formatToolName(tool: string): string {
  return tool
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

export async function getToolInfo(tool: string, baseUrl: string): Promise<ToolInfo> {
  try {
    const req = await fetch(`${baseUrl}/${tool}/info.json`);

    if (!req.ok) {
      console.warn(`Failed to fetch tool info for ${tool}: ${req.status}`);
      return { hasDashboard: false, hasOverlay: false, commands: {} };
    }

    return await req.json();
  } catch (error) {
    console.error(`Error fetching tool info for ${tool}:`, error);
    return { hasDashboard: false, hasOverlay: false, commands: {} };
  }
}


export function populateToolSelect(
  selectId: string,
  tools: string[],
  selectedTool?: string
): void {
  const select = document.getElementById(selectId) as HTMLSelectElement;
  if (!select) return;

  select.innerHTML = "";
  tools.forEach((tool) => {
    const option = document.createElement("option");
    option.value = tool;
    option.textContent = formatToolName(tool);
    if (selectedTool && tool === selectedTool) {
      option.selected = true;
    }
    select.appendChild(option);
  });
}

export function copyToClipboard(content: string, button: HTMLElement) {
  navigator.clipboard.writeText(content).then(() => {
    const originalText = button.textContent;
    button.textContent = "Copied!";
    setTimeout(() => {
      button.textContent = originalText;
    }, 1000);
  });
}
