export function formatToolName(tool: string): string {
  return tool
    .replace(/_/g, " ")
    .replace(/\b\w/g, (l) => l.toUpperCase());
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
