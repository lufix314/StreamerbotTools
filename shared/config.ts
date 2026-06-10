declare global {
  interface Window {
    overlayConfig: Config;
  }
}

export interface Config {
  host?: string;
  port?: number;
  endpoint?: string;
  password?: string;
}
