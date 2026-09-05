# Wheel of Fortune

Actions, commands and OBS browser overlay for a wheel of fortune with custom entries. Entries can have different probabilities for being picked and optionally probabilities can be adjusted so that depending on how often they where picked.

## Usage

First add entries to your wheel using the command or dashboard. The multiplier sets the weight of the specific entry relative to all other entries. So a wheel with two entries with a multiplier of `1` have a `50%` chance of being picked each. A wheel with two entries where one has the multiplier `1` and the other has the multiplier `2` leads to a `33%` and `66%` chance of being picked respectively.

For testing purposes you can spin the wheel using the `!spin` command. For triggering the wheel with custom events like Twitch Redeems, Bits or similar add the respective trigger to the `Spin Wheel` Action.

### Trigger Actions from Result

It is possible to trigger custom actions based on the result being picked when spinning the wheel. The code exposes the following custom triggers:

- **Spin the Wheel** (`SpinTheWheel`): Triggers when the wheel starts to spin
- **Wheel of Fortune Result** (`WheelResult`): Triggers when the wheel result is shown

Both events contain the name (`name`) and index (`idx`) of the result. You can use this to trigger custom actions in Streamer.bot.

The action `Wheel Result Action Example` shows an example on how to do this.

### Adjusted Probabilities

With this wheel you can optionally enable adjusted probabilities. When enabled this slightly reduces the probabilities of entries that are picked more often then others. The goal is to reduce the risk of the same entry being picked over and over again.

The decay factor `wofDecayFactor` controls how much the multiplier is modified. It is a number between `0` and `1`, where a high value means less change to the modifier and a low value means more change.

## Streamer.bot Variables

The actions added to Streamer.bot are configurable. The following _Persisted Global_ Variables control their behaviour.

| Option           | Default | Description                                                              |
| ---------------- | ------- | ------------------------------------------------------------------------ |
| `viewerEntries`  | `[]`    | **DON'T MODIFY!** The list of entries                                    |
| `wofAdjustProbs` | `False` | Whether to adjust probabilities depending on how often an item is picked |
| `wofDecayFactor` | `0.8`   | Decay factor for adjusted probabilities                                  |

## Configuration Options

| Option     | Default       | Description                                       |
| ---------- | ------------- | ------------------------------------------------- |
| `host`     | `"127.0.0.1"` | Host address of the Streamer.bot WebSocket server |
| `port`     | `8080`        | Port of the Streamer.bot WebSocket server         |
| `endpoint` | `"/"`         | Endpoint of the Streamer.bot WebSocket server     |
| `password` |               | Password for the Streamer.bot WebSocket server    |

## Commands

The following chat commands are available for queue management:

### Moderators

| Command                                             | Description                                                                                                                                                           |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `!spin`                                             | Spin the wheel                                                                                                                                                        |
| `!addToWheel {name} {multiplier}`                   | Add a new entry to the wheel with the given multiplier. Use quotes for a name with spaces (i.e.`!addToWheel "Long Entry Name" 1`)                                     |
| `!removeFromWheel {index}`                          | Removes entry with the given index (This is the index of the entry in the list so for example the 9th entry has the index `8`)                                        |
| `!wheelDecay ?{'reset' or 'on' or 'off' or number}` | Depending on the argument enables, disables resets or modifies the adjustment of probabilities. If no argument is given the current settings are printed to the chat. |

## Custom CSS

The overlay exposes CSS custom properties for customization:

```css
:root {
  --font: "Segoe UI", Roboto, sans-serif;
  --font-size: 14pt;
  --text-color: #fff;

  /* ---- Result Popup ---- */

  --result-background: #1a1a1a;
  --result-text-color: #ffffff;
  --result-text-font-size: 48px;
  --result-text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);

  /* Duration the result is shown in seconds */
  --show-result-duration: 3s;

  /* --- Wheel --- */

  /* Colors for the different segments of the wheel */
  --color-1: #e74c3c;
  --color-2: #3498db;
  --color-3: #2ecc71;
  --color-4: #f39c12;
  --color-5: #9b59b6;
  --color-6: #1abc9c;
  --color-7: #e91e63;
  --color-8: #00bcd4;
}
```
