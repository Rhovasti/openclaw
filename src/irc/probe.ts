/**
 * IRC connection probe (tests if IRC server is reachable)
 */

import type { IrcServerConfig } from "./types.js";
import { createIrcClient } from "./client.js";

type IrcProbeResult = {
  ok: boolean;
  connected?: boolean;
  error?: string;
  host?: string;
  port?: number;
  nick?: string;
};

/**
 * Probe IRC server to check if connection works
 */
export async function probeIrc(
  serverConfig: IrcServerConfig,
  timeoutMs: number = 5000,
): Promise<IrcProbeResult> {
  const { host = "localhost", port = 6697, tls = true, nick = "probe" } = serverConfig;

  const result: IrcProbeResult = {
    ok: false,
    host,
    port,
    nick,
  };

  // Create a temporary client for probing
  const client = createIrcClient({
    enabled: true,
    server: serverConfig,
    networks: {},
  });

  // Set up timeout
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error(`IRC probe timeout after ${timeoutMs}ms`)), timeoutMs);
  });

  // Set up connection promise
  const connection = new Promise<void>((resolve, reject) => {
    const internalClient = (client as any).client;

    const cleanup = () => {
      internalClient.removeAllListeners();
      client.disconnect("Probe complete");
    };

    internalClient.on("registered", () => {
      result.ok = true;
      result.connected = true;
      result.nick = internalClient.nick || serverConfig.nick;
      cleanup();
      resolve();
    });

    internalClient.on("error", (err: Error) => {
      result.error = err.message;
      cleanup();
      reject(err);
    });

    internalClient.on("close", () => {
      if (!result.ok) {
        result.error = "Connection closed";
      }
      cleanup();
      reject(new Error(result.error || "Connection closed"));
    });

    // Start connection
    client.connect().catch((err) => {
      result.error = err.message;
      cleanup();
      reject(err);
    });
  });

  try {
    await Promise.race([connection, timeout]);
  } catch (err) {
    result.error = (err as Error).message;
  }

  return result;
}
