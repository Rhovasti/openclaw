/**
 * IRC account resolution
 */

import type { OpenClawConfig } from "../config/config.js";
import type { IrcAccountConfig } from "./types.js";
import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "../routing/session-key.js";

type ResolvedIrcAccount = {
  accountId: string;
  config: IrcAccountConfig;
  serverConfig: IrcAccountConfig["server"];
};

/**
 * Resolve IRC account configuration
 */
export function resolveIrcAccount(params: {
  cfg: OpenClawConfig;
  accountId?: string | null;
}): ResolvedIrcAccount {
  const { cfg, accountId: inputAccountId } = params;
  const ircCfg = cfg.channels?.irc as
    | {
        enabled?: boolean;
        server?: unknown;
        accounts?: Record<string, unknown>;
      }
    | undefined;

  if (!ircCfg || (!ircCfg.server && !ircCfg.accounts)) {
    throw new Error("IRC is not configured. Set channels.irc.server or channels.irc.accounts");
  }

  const accountId = inputAccountId
    ? (normalizeAccountId(inputAccountId) ?? inputAccountId)
    : DEFAULT_ACCOUNT_ID;

  // Multi-account mode
  if (ircCfg.accounts) {
    const account = ircCfg.accounts[accountId];
    if (!account) {
      const available = Object.keys(ircCfg.accounts).join(", ");
      throw new Error(`IRC account "${accountId}" not found. Available: ${available}`);
    }
    if (!(account as { server?: unknown }).server) {
      throw new Error(`IRC account "${accountId}" missing server configuration`);
    }
    return {
      accountId,
      config: account as IrcAccountConfig,
      serverConfig: (account as IrcAccountConfig).server,
    };
  }

  // Single account mode
  if (accountId !== DEFAULT_ACCOUNT_ID) {
    throw new Error(`IRC account "${accountId}" requested but only default account is configured`);
  }

  return {
    accountId: DEFAULT_ACCOUNT_ID,
    config: ircCfg as IrcAccountConfig,
    serverConfig: (ircCfg as IrcAccountConfig).server,
  };
}
