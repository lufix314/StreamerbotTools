# Streamer.bot Tools

A collection of standalone tools and overlays for Streamer.bot.

Each tool is available as a standalone ZIP in the [Releases](https://github.com/lufix314/StreamerbotTools/releases) page!

## Quick Start

1. **Download** a tool from the [Releases](https://github.com/lufix314/StreamerbotTools/releases) page
2. **Extract** the ZIP file to a folder on your computer
3. **Import** the `.sb` file into Streamer.bot

_If an overlay exists:_

1. **Enable** the WebSocket server of your Streamer.bot
2. **Add** the `overlay.html` as a Browser Source in OBS (either as local file or with URL)
3. **Configure** the overlay as needed using `config.js` (for local file) or URL parameters (for remote)

## Available Tools

### [Play with Viewers Queue](/tools/play_with_viewers/README.md)

Display a live queue of viewers waiting to play with you. Perfect for gaming streams where you interact with viewers one-on-one.

### [Points System](/tools/points/README.md)

Basic points system, that awards present viewers.

## Prerequisites

Before using any tool, make sure you have:

- [Streamer.bot](https://streamer.bot) installed and running
- OBS Studio or any streaming software with support for browser sources (This documentation expects you to use OBS)

## Setup

### Step 1: Enable WebSocket Server in Streamer.bot

All overlays communicate with Streamer.bot through its WebSocket server. You only need to set this up once.

1. Open Streamer.bot
2. Go to **Servers/Clients** → **WebSocket Server**
3. The default settings are usually fine (Host: `127.0.0.1`, Port: `8080`)
4. Enable **Authentication** and set a password (Optional but recommended)
5. Click **Start Server**

**Optional:** Enable **Auto Start** so the server starts automatically with Streamer.bot

### Step 2: Import Streamer.bot Setup

Each tool comes with a `.sb` file containing the Streamer.bot actions and commands.

1. Open the extracted tool folder
2. In Streamer.bot click **Import**
3. Drag the `.sb` file into the Import Window
4. Confirm the Import

This adds all the necessary commands and actions to your Streamer.bot installation. Sometimes the actions can be configured using Global Variables in Streamer.bot. See the tool's `README.md` for the available options.

### Step 3: Add Overlay to OBS

#### Option A: URL Parameters (Quick, Automatic updates)

1. In OBS, add a new **Browser Source**
2. Set the URL to `lufix314.github.io/StreamerbotTools/<tool>/overlay.html`
3. Click **OK**

You can configure the Overlay using URL search parameters:

```
lufix314.github.io/StreamerbotTools/<tool>/overlay.html?port=8090&password=secret
```

> [!NOTE]
> `<tool>` is the name of the tool in the `tools/` directory. Play with Viewers for example would be `play_with_viewers`.

The available options are listed in the tool's `README.md`.

> [!WARNING]
> When you use URL parameters, they are included in the HTTP request to the GitHub server, even though all page processing happens locally in the browser/OBS. This means your WebSocket password (if set) might be visible to third parties (GitHub).

#### Option B: Local File (Recommended)

1. In OBS, add a new **Browser Source**
2. Set the Source to **Local file**
3. Select the `overlay.html` from the extracted tool folder
4. Click **OK**

You can configure the Overlay using the separate `config.js` in the tool folder. Simply uncomment the settings you want to change, save the file and refresh the source:

```javascript
window.overlayConfig = {
  // host: "127.0.0.1",
  port: 8090,
  // endpoint: "/",
  password: "your-password",
};
```

#### Customizing the Overlay

Each overlay can be styled to match your stream's aesthetic.

In OBS, open your Browser Source properties and find the **Custom CSS** field. Paste in CSS variables to customize colors, fonts, and spacing.

**Example:**

```css
:root {
  --queue-color: #ffffff;
  --queue-font: "Segoe UI", Roboto, sans-serif;
  --live-dot-color: #ff0000;
}
```

See the individual tool's `README.md` for available CSS variables.

## Using Multiple Tools

You can use multiple tools simultaneously. Simply set up each tool separately and display the overlays as needed.
