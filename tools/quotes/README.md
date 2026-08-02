# Random Quotes Overlay

Streamer.bot actions and an OBS browser source overlay for managing and displaying quotes with optional Twitch clip playback.

## Streamer.bot Variables

The actions added to Streamer.bot are configurable. The following _Persisted Global_ Variables control their behaviour.

| Option   | Default | Description                              |
| -------- | ------- | ---------------------------------------- |
| `quotes` | `[]`    | **DON'T MODIFY!** The list of all quotes |

## Configuration Options

| Option     | Default       | Description                                       |
| ---------- | ------------- | ------------------------------------------------- |
| `host`     | `"127.0.0.1"` | Host address of the Streamer.bot WebSocket server |
| `port`     | `8080`        | Port of the Streamer.bot WebSocket server         |
| `endpoint` | `"/"`         | Endpoint of the Streamer.bot WebSocket server     |
| `password` |               | Password for the Streamer.bot WebSocket server    |

## Commands

The following chat commands are available for quotes management:

### Everyone

| Command  | Description                                          |
| -------- | ---------------------------------------------------- |
| `!quote` | Display a random quote (And show the clip on stream) |

### Moderators

| Command                                             | Description                                                                                                                    |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `!addQuote "{quote}" {author} ?{clip id/clip link}` | Adds the given quote. If a clip ID or link is given this clip is linked to the quote                                           |
| `!removeQuote {index}`                              | Removes quote with the given index (This is the index of the quote in the list so for example the 9th quote has the index `8`) |

## Custom CSS

The overlay exposes CSS custom properties for customization:

```css
:root {
  /* Duration of the clip fading in and out. */
  --fade-duration: 1s;
}
```
