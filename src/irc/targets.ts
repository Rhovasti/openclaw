/**
 * IRC target resolution
 */

import type { IrcAccountConfig } from "./types.js";

/**
 * IRC target information
 */
export type IrcTarget = {
  type: "channel" | "dm";
  target: string; // Channel name or nick
  network?: string;
  server?: string;
};

/**
 * Build an IRC target peer ID
 */
export function buildIrcTargetKey(params: { accountId?: string; target: string }): string {
  const { accountId = "default", target } = params;
  return `irc:${accountId}:${target.toLowerCase()}`;
}

/**
 * Parse an IRC target key
 */
export function parseIrcTargetKey(key: string): { accountId: string; target: string } | null {
  const match = /^irc:([^:]+):(.+)$/.exec(key);
  if (!match) return null;
  return {
    accountId: match[1],
    target: match[2],
  };
}

/**
 * Resolve IRC target from string
 */
export function resolveIrcTarget(input: string, config: IrcAccountConfig): IrcTarget | null {
  const trimmed = input.trim();

  if (!trimmed) return null;

  // Channel target
  if (trimmed.startsWith("#")) {
    return {
      type: "channel",
      target: trimmed.toLowerCase(),
      server: config.server.host,
    };
  }

  // DM target (nick)
  if (
    !trimmed.includes(" ") &&
    /^[a-zA-Z_\-\[\]\\^{}|`][a-zA-Z0-9_\-\[\]\\^{}|`]*$/.test(trimmed)
  ) {
    return {
      type: "dm",
      target: trimmed,
      server: config.server.host,
    };
  }

  // Network#channel format
  const networkMatch = /^([^#:]+)[#:](.+)$/.exec(trimmed);
  if (networkMatch) {
    const [, network, channel] = networkMatch;
    return {
      type: "channel",
      target: channel.startsWith("#") ? channel.toLowerCase() : `#${channel.toLowerCase()}`,
      network,
    };
  }

  return null;
}

/**
 * Format IRC target for display
 */
export function formatIrcTarget(target: IrcTarget): string {
  if (target.type === "dm") {
    return target.target;
  }
  return target.target;
}

/**
 * Check if target is a channel
 */
export function isIrcChannel(target: string): boolean {
  return target.startsWith("#");
}

/**
 * Check if target is a DM (nick)
 */
export function isIrcDm(target: string): boolean {
  return !target.startsWith("#") && /^[a-zA-Z_\-\[\]\\^{}|`]/.test(target);
}
