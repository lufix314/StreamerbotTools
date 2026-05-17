import type { StreamerbotClient } from "@streamerbot/client";
import { OVERLAY_CONFIG } from "./config.js";

declare global {
  interface Window {
    StreamerbotClient: typeof StreamerbotClient;
  }
}

export function getClient(callback: (client: StreamerbotClient) => void) {
  const fileConfig =
    typeof OVERLAY_CONFIG !== "undefined" ? OVERLAY_CONFIG : {};
  const urlParams = new URLSearchParams(window.location.search);

  const sbHost = urlParams.get("host") || fileConfig.host || "127.0.0.1";
  const sbPort =
    parseInt(urlParams.get("port") ?? "", 10) || fileConfig.port || 8080;
  const sbEndpoint = urlParams.get("endpoint") || fileConfig.endpoint || "/";
  const sbPassword =
    urlParams.get("password") || fileConfig.password || undefined;

  const client = new window.StreamerbotClient({
    host: sbHost,
    port: sbPort,
    endpoint: sbEndpoint,
    password: sbPassword,
    onConnect: () => {
      callback(client);
    },
  });

  return client;
}
