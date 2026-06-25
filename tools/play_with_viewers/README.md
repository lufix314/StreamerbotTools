# Play with Viewers Queue Overlay

[Streamer.bot](https://streamer.bot) actions and commands for managing a queue to play with viewers and an OBS browser source overlay that connects to Streamer.bot via WebSocket and displays the queue.

## Streamer.bot Variables

The actions added to Streamer.bot are configurable. Add the following to your _Persisted Global_ Variables to change their behaviour.

| Option       | Default | Description                                                      |
| ------------ | ------- | ---------------------------------------------------------------- |
| `viewerLive` | `0`     | Number of viewers in the queue that can be live at the same time |

## Configuration Options

| Option     | Default       | Description                                       |
| ---------- | ------------- | ------------------------------------------------- |
| `host`     | `"127.0.0.1"` | Host address of the Streamer.bot WebSocket server |
| `port`     | `8080`        | Port of the Streamer.bot WebSocket server         |
| `endpoint` | `"/"`         | Endpoint of the Streamer.bot WebSocket server     |
| `password` |               | Password for the Streamer.bot WebSocket server    |

## Commands

The following chat commands are available for queue management:

### Everyone

| Command                      | Description                                                                                                |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `!join`                      | Add yourself to the queue. If you are already in the queue this shows your position.                       |
| `!leave`                     | Remove yourself from the queue                                                                             |
| `!queue ?{"live" or number}` | Show the first _x_ entries of the queue in the chat. If "_live_" is given only live viewers will be shown. |
|                              | If no number is given the full queue is shown.                                                             |

### Moderators

| Command                  | Description                                                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| `!add {user}`            | Add a user to the queue                                                                                                         |
| `!remove {user}`         | Remove a user from the queue                                                                                                    |
| `!close`                 | Closes the queue. Viewers can't join or leave anymore. The queue can still be rotated and players can be added/removed by mods. |
| `!open`                  | Opens the Queue                                                                                                                 |
| `!rotate ?{number}`      | Rotate the queue by the specified number of viewers. Rotate by **one** if no number is specified.                               |
| `!next ?{number}`        | Move the queue by the specified number of viewers. Move by **one** if no number is specified                                    |
| `!livePlayers ?{number}` | Change the number of live players. Shows current number of live players if no number is given                                   |

## Custom CSS

The overlay exposes a set of CSS custom properties (variables). Paste the following into the OBS Custom CSS field and adjust the values to match your stream aesthetic.

```css
:root {
  /* ---- General ---- */

  /* Font family used throughout the overlay. */
  --font: "Segoe UI", Roboto, sans-serif;

  /* Base text color. */
  --text-color: #ffffff;

  /* Background color of the queue container. */
  --background-color: #00000080;

  /* Padding around the entire overlay body. */
  --queue-padding: 8px;

  /* Minimum width of the queue container. */
  --queue-min-width: 120px;

  /* Border radius of the queue container. */
  --border-radius: 4px;

  /* ---- Queue Header ---- */

  /* Font size of the "Queue" title text. */
  --header-font-size: 24px;

  /* Font weight of the header (e.g. 400, 700, bold). */
  --header-font-weight: 700;

  /* Space above the separator line beneath the header. */
  --separator-space-above: 8px;

  /* Space below the separator line before the viewer list starts. */
  --separator-space-below: 8px;

  /* Style of the separating line beneath the header. */
  --separator: 2px solid rgba(255, 255, 255, 0.2);

  /* ---- Viewer Entries ---- */

  /* Font size of each viewer name. */
  --viewer-font-size: 20px;

  /* Vertical and horizontal padding around each viewer entry. */
  --viewer-padding: 6px 0;

  /* Duration of the slide-in animation for each viewer entry. */
  --slide-duration: 0.3s;

  /* Stagger delay between each viewer entry animating in. */
  --slide-stagger: 0.05s;

  /* ---- Live Indicator Dot ---- */

  /* Color of the dot shown next to viewers who are currently live. */
  --live-dot-color: #9147ff;

  /* Diameter of the live indicator dot. */
  --live-dot-size: 10px;

  /* Space between the live dot and the viewer name. */
  --live-dot-padding: 8px;
}
```

### Tips

- The overlay background is fully transparent by default, so it composites cleanly over any OBS scene.
- To hide the header entirely, add `#queue-header { display: none; }` below the `:root` block.
- You can override any class directly (`.viewer-entry`, `.live-dot`, etc.) by adding rules after the `:root` block.
