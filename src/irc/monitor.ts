/**
 * IRC message monitoring provider
 */

import type { OpenClawConfig } from "../config/config.js";
import { loadConfig } from "../config/config.js";
import { getChildLogger } from "../logging.js";
import type { RuntimeEnv } from "../runtime.js";
import type { IrcAccountConfig, IrcNetworkEntry, IrcChannelConfig } from "./types.js";
import type { IrcClient } from "./client.js";
import { createIrcClient } from "./client.js";
import { resolveIrcAccount as resolveIrcAccountConfig } from "./accounts.js";

const logger = getChildLogger({ subsystem: "irc" });

type IrcMonitorHandle = {
  client: IrcClient;
  accountId: string;
  config: IrcAccountConfig;
  stop: () => void;
};

/**
 * Monitor IRC provider for incoming messages
 */
export async function monitorIrcProvider(
  opts: {
    config?: OpenClawConfig;
    accountId?: string;
    runtime?: RuntimeEnv;
  } = {},
): Promise<IrcMonitorHandle> {
  const cfg = opts.config ?? loadConfig();
  const account = resolveIrcAccountConfig({
    cfg,
    accountId: opts.accountId,
  });

  const runtime: RuntimeEnv = opts.runtime ?? {
    log: console.log,
    error: console.error,
    exit: (code: number): never => {
      throw new Error(`exit ${code}`);
    },
  };

  const client = createIrcClient(account.config);

  // Setup event handlers
  let stopped = false;

  // Hook into internal event handling
  const originalOn = (client as any).on.bind(client);
  const internalHandlers = new Map<string, (...args: any[]) => void>();

  // Wrap the on method to capture our handlers
  (client as any).on = function (event: string, handler: (...args: any[]) => void) {
    internalHandlers.set(event, handler);
  };

  // Register our own handlers with the internal client
  const internalClient = (client as any).client;

  internalClient.on("registered", () => {
    runtime.log?.(
      `[irc] Connected to ${account.serverConfig.host}:${account.serverConfig.port || 6697} as ${account.serverConfig.nick}`,
    );

    // Auto-join channels
    const networks = account.config.networks || {};
    for (const [networkName, networkConfig] of Object.entries(networks)) {
      const channels = networkConfig.channels || {};
      for (const channelName of Object.keys(channels)) {
        // Skip if channel is disabled
        if ((channels[channelName] as IrcChannelConfig)?.enabled === false) continue;
        client.join(channelName.startsWith("#") ? channelName : `#${channelName}`);
      }
    }

    // Call external handler if registered
    const handler = internalHandlers.get("registered");
    if (handler) handler();
  });

  internalClient.on("message", (event: { nick: string; target: string; message: string }) => {
    if (stopped) return;

    const isDm = !event.target.startsWith("#");
    const target = isDm ? event.nick : event.target;

    // TODO: Route message to OpenClaw handler
    logger.debug({ subsystem: "irc/monitor" }, `[irc] <${event.nick}> ${event.message}`);

    // Call external handler if registered
    const handler = internalHandlers.get("message");
    if (handler) handler(event);
  });

  internalClient.on("notice", (event: { nick: string; message: string }) => {
    if (stopped) return;
    logger.debug({ subsystem: "irc/monitor" }, `[irc] Notice from ${event.nick}: ${event.message}`);

    // Call external handler if registered
    const handler = internalHandlers.get("notice");
    if (handler) handler(event);
  });

  internalClient.on("error", (err: Error) => {
    runtime.error?.(`[irc] Error: ${err.message}`);

    // Call external handler if registered
    const handler = internalHandlers.get("error");
    if (handler) handler(err);
  });

  internalClient.on("close", () => {
    if (!stopped) {
      runtime.log?.("[irc] Connection closed, reconnecting...");
    }

    // Call external handler if registered
    const handler = internalHandlers.get("close");
    if (handler) handler();
  });

  // Connect to IRC server
  await client.connect();

  return {
    client,
    accountId: account.accountId,
    config: account.config,
    stop: () => {
      stopped = true;
      client.disconnect("Monitoring stopped");
    },
  };
}

/**
 * Resolve IRC network and channel configuration
 */
export function resolveIrcNetworkConfig(
  config: IrcAccountConfig,
  target: string,
): IrcNetworkEntry | IrcChannelConfig | null {
  const isChannel = target.startsWith("#");

  if (!isChannel) {
    // DM - check DM allowlist
    return null;
  }

  const networks = config.networks || {};
  for (const [networkName, networkConfig] of Object.entries(networks)) {
    const channels = networkConfig.channels || {};
    if (channels[target]) {
      return channels[target];
    }
  }

  return null;
}

/**
 * Check if a user is allowed in a channel
 */
export function isUserAllowed(
  nick: string,
  hostname: string,
  config: IrcNetworkEntry | IrcChannelConfig,
): boolean {
  const users = config?.users || [];
  if (users.length === 0) return true;

  // Check nick (case-insensitive)
  if (users.some((u) => u.toLowerCase() === nick.toLowerCase())) {
    return true;
  }

  // Check hostname patterns
  if (hostname) {
    const hostLower = hostname.toLowerCase();
    if (
      users.some((u) => {
        const pattern = u.toLowerCase();
        // Support wildcards (*)
        if (pattern.includes("*")) {
          const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
          return regex.test(hostLower);
        }
        return hostLower === pattern;
      })
    ) {
      return true;
    }
  }

  return false;
}
