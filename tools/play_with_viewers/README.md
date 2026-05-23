# Play with Viewers Queue Overlay

[Streamer.bot](https://streamer.bot) actions and commands for managing a queue to play with viewers and an OBS browser source overlay that connects to Streamer.bot via WebSocket and displays the queue.

## Configuration Options

| Option     | Default       | Description                                       |
| ---------- | ------------- | ------------------------------------------------- |
| `host`     | `"127.0.0.1"` | Host address of the Streamer.bot WebSocket server |
| `port`     | `8080`        | Port of the Streamer.bot WebSocket server         |
| `endpoint` | `"/"`         | Endpoint of the Streamer.bot WebSocket server     |
| `password` |               | Password for the Streamer.bot WebSocket server    |

## Custom CSS

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
