# Play with Viewers Queue Overlay

[Streamer.bot](https://streamer.bot) actions and commands for managing a queue to play with viewers and an OBS browser source overlay that connects to Streamer.bot via WebSocket and displays the queue.

The project consists of a single self-contained HTML file (`overlay.html`), an optional local configuration file (`config.js`), and the Streamer.bot configuration that provides all the commands and actions needed to run the queue.

---

## Streamer.bot Setup

### 1. Enable the WebSocket Server

The overlay communicates with Streamer.bot through its built-in WebSocket server. To enable it:

2. Go to **Servers/Clients > WebSocket Server** in Streamer.bot.
3. Set the **Host**, **Port**, and **Endpoint** values if needed (the defaults are fine for most setups).
4. If you want to protect the connection, enable **Authentication** and set a **Password**.
5. Click **Start Server**.

If you plan on using the overlay more often consider enabling **Auto Start** of the WebSocket.

### 2. Import the Actions and Commands

Import the provided `.sb` file into Streamer.bot to get everything you need:

1. Open the file [here](https://raw.githubusercontent.com/lufix314/PlayWithViewersOverlay/refs/heads/main/bot.sb).
2. Click **Import** in Streamer.bot
3. Copy and Paste the contents of the `.sb` file into the text field
4. Confirm the import

This will add all necessary commands and actions to your setup.

The imported actions manage a Streamer.bot **global variable** called `viewerQueue`. If you want to clear the queue manually you can delete it. For configuring how many players are _LIVE_ at the same time, create a global variable `viewerLive` with a corresponding value (defaults to `0`).

## Adding the Overlay to OBS

There are two ways to set up the overlay as a Browser Source in OBS.

### Method 1 - Remote URL

You can point OBS directly at the raw GitHub URL of `overlay.html` and pass configuration through URL search parameters. This is useful for testing, but comes with caveats.

1. In OBS, add a new **Browser Source**.
2. In the **URL** field, enter the following URL with your settings as query parameters. For example:

   ```
   https://lufix314.github.io/PlayWithViewersOverlay/overlay.html?host=127.0.0.1&port=8080&endpoint=/&password=secret
   ```

3. Set the width and height and click **OK**.

> [!WARNING]
> When you use URL parameters, they are included in the HTTP request to the GitHub server, even though all page processing happens locally in the browser. This means your WebSocket password (if set) might be visible to third parties.

### Method 2 - Local File

This method keeps your configuration on disk and avoids sending any credentials over the network.

1. Download the `play_with_viewers.zip` from the latest [release](https://github.com/lufix314/PlayWithViewersOverlay/releases) and unzip it.
2. Edit `config.js` to match your Streamer.bot WebSocket settings:

   ```js
   var OVERLAY_CONFIG = {
     host: "127.0.0.1",
     port: 8080,
     endpoint: "/",
     password: "your-password",
   };
   ```

3. In OBS, add a new **Browser Source**.
4. Check **Local file** and browse to the `overlay.html` in the downloaded directory.
5. Set the width and height to your liking and click **OK**.

## Configuration Options

All WebSocket connection settings can be configured. If a setting is not provided the overlay will automatically use the default. If no password is given the overlay will try to connect without authentication.

## Custom CSS

OBS Browser Sources have a **Custom CSS** field in their properties dialog. You can use this to restyle the overlay without editing any source files.

The overlay exposes a set of CSS custom properties (variables). Paste the following into the OBS Custom CSS field and adjust the values to match your stream aesthetic.

```css
:root {
  /* ---- General ---- */

  /* Font family used throughout the overlay. */
  --queue-font: "Segoe UI", Roboto, sans-serif;

  /* Base text color. */
  --queue-color: #ffffff;

  /* Padding around the entire overlay body. */
  --queue-padding: 20px;

  /* Maximum width of the queue container. */
  --queue-max-width: 400px;

  /* ---- Queue Header ---- */

  /* Font size of the "Queue" title text. */
  --header-font-size: 24px;

  /* Font weight of the header (e.g. 400, 700, bold). */
  --header-font-weight: 700;

  /* Spacing below the header before the viewer list starts. */
  --header-margin-bottom: 12px;

  /* Padding between the header text and its bottom border. */
  --header-padding-bottom: 8px;

  /* Style of the separating line beneath the header. */
  --header-border-bottom: 2px solid rgba(255, 255, 255, 0.2);

  /* Text shadow on the header for readability over gameplay. */
  --header-text-shadow: 0 2px 8px rgba(0, 0, 0, 0.8);

  /* ---- Viewer Entries ---- */

  /* Font size of each viewer name. */
  --viewer-font-size: 20px;

  /* Vertical and horizontal padding around each viewer entry. */
  --viewer-padding: 6px 0;

  /* Text shadow on viewer names. */
  --viewer-text-shadow: 0 1px 4px rgba(0, 0, 0, 0.7);

  /* ---- Live Indicator Dot ---- */

  /* Color of the dot shown next to viewers who are currently live. */
  --live-dot-color: #9147ff;

  /* Diameter of the live indicator dot. */
  --live-dot-size: 10px;

  /* Space between the live dot and the viewer name. */
  --live-dot-margin-right: 8px;

  /* ---- Animations ---- */

  /* Duration of the slide-in animation for each viewer entry. */
  --slide-duration: 0.3s;

  /* Stagger delay between each viewer entry animating in.
     Increase for a more pronounced cascade effect. */
  --slide-stagger: 0.05s;
}
```

### Tips

- The overlay background is fully transparent by default, so it composites cleanly over any OBS scene.
- To hide the header entirely, add `#queue-header { display: none; }` below the `:root` block.
- You can override any class directly (`.viewer-entry`, `.live-dot`, etc.) by adding rules after the `:root` block.
