/**
 * IRC account resolution
 */

import type { OpenClawConfig } from "../config/config.js";
import { DEFAULT_ACCOUNT_ID, normalizeAccountId } from "../routing/session-key.js";
import type { IrcAccountConfig } from "./types.js";

type ResolvedIrcAccount = {
  accountId: string;
  config: IrcAccountConfig;
  serverConfig: IrcAccountConfig["server"];
};

/**
 * List enabled IRC account IDs
 */
export function listIrcAccountIds(cfg: OpenClawConfig): string[] {
  const ircCfg = cfg.channels?.irc as
    | { enabled?: boolean; server?: unknown; accounts?: Record<string, unknown> }
    | undefined;

  if (!ircCfg) return [];

  // Multi-account mode
  if (ircCfg.accounts) {
    return Object.entries(ircCfg.accounts)
      .filter(([, account]) => (account as { enabled?: boolean }).enabled !== false)
      .map(([accountId]) => normalizeAccountId(accountId) ?? accountId);
  }

  // Single account mode
  if (ircCfg.enabled !== false && ircCfg.server) {
    return [DEFAULT_ACCOUNT_ID];
  }

  return [];
}

/**
 * List all IRC account IDs (enabled or not)
 */
export function listEnabledIrcAccounts(cfg: OpenClawConfig): string[] {
  const ircCfg = cfg.channels?.irc as
    | { server?: unknown; accounts?: Record<string, unknown> }
    | undefined;

  if (!ircCfg) return [];

  // Multi-account mode
  if (ircCfg.accounts) {
    return Object.keys(ircCfg.accounts);
  }

  // Single account mode
  if (ircCfg.server) {
    return [DEFAULT_ACCOUNT_ID];
  }

  return [];
}

/**
 * Get the default IRC account ID
 */
export function resolveDefaultIrcAccountId(cfg: OpenClawConfig): string {
  const ids = listIrcAccountIds(cfg);
  if (ids.length === 0) return DEFAULT_ACCOUNT_ID;
  if (ids.length === 1) return ids[0];
  return DEFAULT_ACCOUNT_ID;
}

/**
 * Resolve IRC account configuration
 */
export function resolveIrcAccount(params: {
  cfg: OpenClawConfig;
  accountId?: string;
}): ResolvedIrcAccount {
  const { cfg, accountId: inputAccountId } = params;
  const ircCfg = cfg.channels?.irc as
    | { enabled?: boolean; server?: unknown; accounts?: Record<string, unknown> }
    | undefined;

  if (!ircCfg || !ircCfg.server) {
    throw new Error("IRC is not configured. Set channels.irc.server");
  }

  const accountId = inputAccountId
    ? (normalizeAccountId(inputAccountId) ?? inputAccountId)
    : resolveDefaultIrcAccountId(cfg);

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
