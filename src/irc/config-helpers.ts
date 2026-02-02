/**
 * IRC configuration helpers for plugin integration
 */

import type { OpenClawConfig } from "../config/config.js";
import { DEFAULT_ACCOUNT_ID } from "../routing/session-key.js";
import { listIrcAccountIds, resolveIrcAccount, resolveDefaultIrcAccountId } from "./accounts.js";
import type { IrcAccountConfig, IrcServerConfig } from "./types.js";

/**
 * Check if IRC account is configured
 */
export function isAccountConfigured(
  account: IrcAccountConfig,
  serverConfig?: IrcServerConfig,
): boolean {
  const server = serverConfig || account.server;
  return Boolean(
    server &&
    server.host &&
    server.nick &&
    (server.port || (server.tls !== false && 6697) || (!server.tls && 6667)),
  );
}

/**
 * Check if IRC account is enabled
 */
export function isAccountEnabled(account: IrcAccountConfig): boolean {
  return account.enabled !== false;
}

/**
 * Describe IRC account status
 */
export function describeAccount(account: IrcAccountConfig): {
  accountId: string;
  enabled: boolean;
  configured: boolean;
} {
  const serverConfig = account.server;
  return {
    accountId: DEFAULT_ACCOUNT_ID,
    enabled: isAccountEnabled(account),
    configured: isAccountConfigured(account, serverConfig),
  };
}

/**
 * Resolve DM allowlist for IRC account
 */
export function resolveAllowFrom(params: { cfg: OpenClawConfig; accountId?: string }): string[] {
  const account = resolveIrcAccount(params);
  return (account.config.dm?.allowFrom ?? []).map(String);
}

/**
 * Format allowlist entries (normalize to lowercase)
 */
export function formatAllowFrom(params: { allowFrom: string[] }): string[] {
  return params.allowFrom
    .map((entry) => String(entry).trim())
    .filter(Boolean)
    .map((entry) => entry.toLowerCase());
}

/**
 * Collect status issues for IRC accounts
 */
export function collectStatusIssues(
  accounts: Array<{ accountId: string; configured?: boolean }>,
): string[] {
  const issues: string[] = [];
  for (const account of accounts) {
    if (!account.configured) {
      issues.push(`${account.accountId}: IRC not configured (missing server config)`);
    }
  }
  return issues;
}

/**
 * Build account snapshot with runtime status
 */
export function buildAccountSnapshot(params: {
  account: IrcAccountConfig;
  cfg: OpenClawConfig;
  runtime?: {
    running?: boolean;
    lastStartAt?: number | null;
    lastStopAt?: number | null;
    lastError?: string | null;
  };
  probe?: unknown;
}): {
  accountId: string;
  enabled: boolean;
  configured: boolean;
  running: boolean;
  lastStartAt: number | null;
  lastStopAt: number | null;
  lastError: string | null;
  probe?: unknown;
} {
  const { account, cfg, runtime, probe } = params;

  // Find the account ID from config
  const irc = cfg.channels?.irc as { accounts?: Record<string, unknown> } | undefined;
  const accountMap = (irc?.accounts as Record<string, unknown> | undefined) ?? {};
  const resolvedAccountId =
    Object.entries(accountMap).find(([, value]) => value === account)?.[0] ?? DEFAULT_ACCOUNT_ID;

  const serverConfig = account.server;
  return {
    accountId: resolvedAccountId,
    enabled: isAccountEnabled(account),
    configured: isAccountConfigured(account, serverConfig),
    running: runtime?.running ?? false,
    lastStartAt: runtime?.lastStartAt ?? null,
    lastStopAt: runtime?.lastStopAt ?? null,
    lastError: runtime?.lastError ?? null,
    probe,
  };
}
