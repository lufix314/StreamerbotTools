# Points System

[Streamer.bot](https://streamer.bot) actions and commands for a viewer points system.

## Prerequisites

Enable _Present Viewers_ in Streamer.bot at Platforms > Twitch > Settings and turn on _Live Update_ in the advanced menu that opens when clicking the _Present Viewers_ setting. This will get the present viewers from twitch once every minute.

## Streamer.bot Variables

The actions added to Streamer.bot are configurable. Add the following to your _Persisted Global_ Variables to change their behaviour.

| Option          | Default | Description                                      |
| --------------- | ------- | ------------------------------------------------ |
| `pointsPerTick` | `50`    | Number of points a viewer recieves every minute. |

## Commands

The following chat commands are available:

### Everyone

| Command                       | Description                                  |
| ----------------------------- | -------------------------------------------- |
| `!addPointsa {points} {user}` | Add the given number of points to this user. |

### Moderators

| Command                       | Description                                       |
| ----------------------------- | ------------------------------------------------- |
| `!points ?{user}`             | Show your points or the points of the given user. |
| `!givePoints {points} {user}` | Gift the given number of points to this user.     |
