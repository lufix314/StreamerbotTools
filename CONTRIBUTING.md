# Contributing to Streamer.bot Tools

Thank you for your interest in contributing! This document covers the technical aspects of the project to help you get started.

## Table of Contents

- [Project Overview](#project-overview)
- [Project Structure](#project-structure)
- [Build Process](#build-process)
- [Development Workflow](#development-workflow)
- [Adding a New Tool](#adding-a-new-tool)
- [Shared Code](#shared-code)
- [Streamer.bot Integration](#streamerbot-integration)
- [Coding Standards](#coding-standards)

---

## Project Overview

This project is a collection of standalone tools and overlays for Streamer.bot. Each tool consists of:

1. **Browser-based overlays/dashboards** - TypeScript/JavaScript that connects to Streamer.bot via WebSocket
2. **Streamer.bot actions** - `.sb` import files and the C# source files
3. **Configuration** - URL parameters or local `config.js` files

The architecture follows a modular design where each tool is self-contained but can share common utilities.

## Project Structure

```
streamerbot_tools/
├── build/                  # Compiled output (generated)
├── shared/                 # Shared utilities
├── startpage/              # Tool discovery and setup page
├── tools/                  # Tool source code
│   ├── <tool>/
│   │   ├── overlay.html    # Overlay (optional)
│   │   ├── overlay.ts      # TypeScript logic for overlay (optional)
│   │   ├── dashboard.html  # Dashboard (optional)
│   │   ├── dashboard.ts    # TypeScript logic for dashboard (optional)
│   │   ├── config.ts       # Configuration
│   │   ├── bot.sb          # Streamer.bot import file
│   │   ├── bot/            # C# source code for custom Streamer.bot logic (optional)
│   │   │   └── core.cs
│   │   ├── info.json       # Tool metadata
│   │   └── README.md       # User documentation
```

---

## Build Process

The build system uses esbuild to compile TypeScript and bundle JavaScript for browser use.

### Build Configuration

The `esbuild.config.js` handles:

1. **Tool Discovery** - Automatically finds all tool folders in `/tools`
2. **Shared Aliases** - Creates path aliases for `/shared` modules
3. **HTML Processing** - Copies HTML files and injects CDN script for @streamerbot/client
4. **Asset Copying** - Copies non-code assets (images, CSS, etc.) to build output
5. **Startpage Generation** - Builds the central tool discovery page

### Build Options

```bash
# Build all tools once
pnpm build

# Watch mode - rebuilds on file changes and starts HTTP server
pnpm dev

# Clean build output
pnpm clean
```

### Build Output

For each tool, the build produces:

- `overlay.js` - Bundled overlay JavaScript
- `dashboard.js` - Bundled dashboard JavaScript
- `overlay.html` - HTML with injected CDN script
- `dashboard.html` - HTML with injected CDN script
- Any assets (CSS, images, etc.)

## Development Workflow

```bash
# Install dependencies
pnpm install

# Start development with hot-reload
pnpm dev
```

The dev server starts at `http://localhost:3000` new tools are automatically discovered.

## Adding a New Tool

### Step 1: Create Tool Directory

```bash
mkdir tools/my_new_tool
cd tools/my_new_tool
```

### Step 2: Create Basic Structure

```
my_new_tool/
├── overlay.html      (optional - if you have an overlay)
├── overlay.ts        (optional - if you have an overlay)
├── dashboard.html    (optional - if you have a dashboard)
├── dashboard.ts      (optional - if you have a dashboard)
├── config.ts         (required - for configuration)
├── bot.sb            (required - Streamer.bot actions)
├── bot/              (optional - C# sources for custom Streamer.bot logic)
├── info.json         (required - tool metadata)
└── README.md         (required - user documentation)
```

### Step 3: Create Overlay (Optional)

**overlay.html** - HTML template:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>My Tool Overlay</title>
  </head>
  <body>
    <div id="app">
      <!-- Your content here -->
    </div>

    <script type="module" src="config.js"></script>
    <script type="module" src="overlay.js"></script>
  </body>
</html>
```

**overlay.ts** - TypeScript logic:

```typescript
import { getClient } from "shared/client";

// Your overlay logic here
const client = getClient((client) => {
  console.log("Connected to Streamer.bot");

  // Example: Get a global variable
  client.getGlobal("myVariable").then((resp) => {
    if (resp?.status === "ok" && resp.variable) {
      console.log("Variable value:", resp.variable.value);
    }
  });
});

// Example: Listen for events
client.on("Misc.GlobalVariableUpdated", (eventData) => {
  console.log("Variable updated:", eventData.data);
});
```

### Step 4: Create Dashboard (Optional)

**dashboard.html** - HTML template:

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>My Tool Dashboard</title>
  </head>
  <body>
    <h1>My Tool Dashboard</h1>
    <button id="trigger-btn">Trigger Action</button>
    <div id="status">Status: Disconnected</div>

    <script type="module" src="config.js"></script>
    <script type="module" src="dashboard.js"></script>
  </body>
</html>
```

**dashboard.ts** - TypeScript logic:

```typescript
import { getClient, doAction } from "shared/client";

// Your dashboard logic here
const client = getClient((client) => {
  document.getElementById("status")!.textContent = "Status: Connected";
});

// Example: Button click handler
document.getElementById("trigger-btn")?.addEventListener("click", async () => {
  try {
    await doAction(client, "My Action Name", {
      input0: "argument value",
    });
  } catch (err) {
    console.error("Action failed:", err);
  }
});
```

### Step 5: Create Configuration

**config.ts** - Initializes Configuration:

```typescript
window.overlayConfig = {
  // host: "127.0.0.1",
  // port: 8080,
  // endpoint: "/",
  // password: "your-password"
};
```

### Step 6: Create Streamer.bot Actions

- Create actions and commands in Streamer.bot GUI
- Export as `.sb` file
- Place in tool directory

**bot/core.cs** (Optional): Add the C# sources you created in Streamer.bot for custom logic.

### Step 7: Create Tool Metadata

**info.json**:

```json
{
  "hasOverlay": true,
  "hasDashboard": true,
  "commands": {
    "everyone": [
      {
        "command": "!mycommand",
        "description": "Does something cool"
      }
    ],
    "moderators": [
      {
        "command": "!admincommand",
        "description": "Admin-only action"
      }
    ]
  }
}
```

### Step 8: Create Documentation

**README.md** - See existing tools for examples. Include:

- Tool description
- Streamer.bot variables
- Configuration options
- Chat commands
- Custom CSS variables (for overlays)

## Shared Code

### Using Shared Modules

Import shared utilities using the alias:

```typescript
import { getClient, doAction } from "shared/client";
import { formatToolName, populateToolSelect } from "shared/utils";
import type { ToolInfo } from "shared/types";
import { defaultConfig } from "shared/config";
```

### Creating Shared Utilities

1. Create a new `.ts` file in `/shared/`
2. Export functions/types as needed
3. The build system automatically creates path aliases

**Example - shared/my-utils.ts:**

```typescript
export function myHelperFunction(value: string): string {
  return value.toUpperCase();
}

export interface MyInterface {
  name: string;
  value: number;
}
```

## Streamer.bot Integration

### WebSocket Connection

All tools connect to Streamer.bot via WebSocket. The connection is handled by `@streamerbot/client`.

### Global Variables

Tools communicate with Streamer.bot through global variables:

```typescript
// Read a variable
client.getGlobal("myVariable").then((resp) => {
  const value = resp.variable.value;
});

// Listen for updates
client.on("Misc.GlobalVariableUpdated", (eventData) => {
  if (eventData.data.name === "myVariable") {
    const newValue = eventData.data.newValue;
  }
});
```

### Actions

Trigger actions from the browser:

```typescript
await doAction(client, "Action Name", {
  input0: "value1",
  input1: "value2",
});
```

### Events

Subscribe to Streamer.bot events:

```typescript
client.on("Action.OnExecute", (eventData) => {
  console.log("Action executed:", eventData.data);
});
```

## Coding Standards

### TypeScript

- Use **interfaces** for object shapes
- Use **const enums** for fixed sets of values

### Naming Conventions

- **Files**: `snake_case.ts` (e.g., `overlay.ts`, `dashboard.ts`)
- **Variables**: `camelCase` (e.g., `viewerQueue`, `isConnected`)
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `ACTION_NAMES`, `ELEMENT_IDS`)
- **Interfaces**: `PascalCase` (e.g., `QueueViewer`, `ToolInfo`)

### CSS

- Use **CSS variables** for theming
- Support **dark mode** with `@media (prefers-color-scheme: dark)`
- Keep styles **scoped** to tool components
- Use **transparent backgrounds** for OBS compositing

### Documentation

- **JSDoc** for public functions and complex logic
- **Inline comments** for non-obvious code
- **Section headers** for code organization

## Questions?

If you need help, please open an issue or discussion on GitHub!
