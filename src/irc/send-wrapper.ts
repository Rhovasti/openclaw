/**
 * Send messages to IRC (high-level API matching Discord pattern)
 */

import { loadConfig } from "../config/config.js";
import { resolveIrcAccount } from "./accounts-resolver.js";
import type { IrcClient } from "./client.js";
import { monitorIrcProvider } from "./monitor.js";

// Track active IRC clients by account
const activeClients = new Map<string, IrcClient>();

type IrcSendOpts = {
  accountId?: string;
  action?: boolean;
  notice?: boolean;
  verbose?: boolean;
};

/**
 * Get or create an IRC client for the given account
 */
async function getIrcClient(accountId?: string): Promise<IrcClient> {
  const cfg = loadConfig();
  const account = resolveIrcAccount({ cfg, accountId });

  // Check if we have an active client for this account
  const key = account.accountId;
  let client = activeClients.get(key);

  if (!client) {
    // Start monitoring for this account (will create a client)
    const handle = await monitorIrcProvider({ accountId });
    client = handle.client;
    activeClients.set(key, client);
  }

  return client;
}

/**
 * Send a message to IRC (matches Discord's sendMessageDiscord pattern)
 */
export async function sendMessageIrc(
  to: string,
  text: string,
  opts: IrcSendOpts = {},
): Promise<{ target: string; text: string }> {
  const client = await getIrcClient(opts.accountId);

  const target = to.startsWith("#") ? to.toLowerCase() : to;

  if (opts.action) {
    client.action(target, text);
  } else if (opts.notice) {
    client.notice(target, text);
  } else {
    client.say(target, text);
  }

  return { target, text };
}

/**
 * Send an action message (/me)
 */
export async function sendActionIrc(
  to: string,
  text: string,
  opts?: Omit<IrcSendOpts, "action">,
): Promise<{ target: string; text: string }> {
  return sendMessageIrc(to, text, { ...opts, action: true });
}

/**
 * Send a notice message
 */
export async function sendNoticeIrc(
  to: string,
  text: string,
  opts?: Omit<IrcSendOpts, "notice">,
): Promise<{ target: string; text: string }> {
  return sendMessageIrc(to, text, { ...opts, notice: true });
}
