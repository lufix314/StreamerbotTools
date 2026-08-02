export interface ToolCommand {
  command: string;
  description: string;
}

export interface ToolCommands {
  everyone?: ToolCommand[];
  moderators?: ToolCommand[];
}

export interface ToolInfo {
  hasDashboard: boolean;
  hasOverlay: boolean;
  commands: ToolCommands;
}
