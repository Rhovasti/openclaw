/**
 * IRC channel plugin for OpenClaw
 *
 * Registers IRC as a channel plugin with gateway lifecycle support.
 * IRC implementation is in the core src/irc/ directory.
 */

import type { OpenClawPluginApi } from "openclaw/plugin-sdk";
import { buildChannelConfigSchema } from "openclaw/plugin-sdk";

import { DEFAULT_ACCOUNT_ID, getAccountConfig, listAccountIds, resolveIrcAccount } from "../../irc/accounts.js";
import { isAccountConfigured } from "../../irc/utils/irc.js";
import { normalizeIrcMessagingTarget } from "../../channels/plugins/normalize/irc.js";
import { ircOutbound } from "../../channels/plugins/outbound/irc.js";
import { resolveIrcNetworkConfig } from "../../irc/monitor.js";
import { probeIrc } from "../../irc/probe.js";
import { sendMessageIrc } from "../../irc/send-wrapper.js";
import type {
  ChannelAccountSnapshot,
  ChannelCapabilities,
  ChannelLogSink,
  ChannelMeta,
  ChannelPlugin,
  IrcAccountConfig,
  ResolveKind,
  ChannelResolveResult,
} from "../../channels/plugins/types.js";
import type { IrcServerConfig } from "../../irc/types.js";
import type { OpenClawConfig } from "../../config/config.js";
import type { RuntimeEnv } from "../../runtime.js";

/**
 * IRC channel plugin
 *
 * Implements the ChannelPlugin interface to provide IRC chat integration
 * for OpenClaw. Supports message sending, receiving, access control, and
 * connection lifecycle management.
 */
export const ircPlugin: ChannelPlugin<IrcAccountConfig> = {
  /** Plugin identifier */
  id: "irc",

  /** Plugin metadata */
  meta: {
    id: "irc",
    label: "IRC",
    selectionLabel: "IRC (Internet Relay Chat)",
    detailLabel: "IRC",
    docsPath: "/channels/irc",
    blurb: "text-based chat protocol with channel and direct message support.",
    systemImage: "bubble.left",
  },

  /** Supported chat capabilities */
  capabilities: {
    chatTypes: ["direct", "group"],
    nativeCommands: true,
    blockStreaming: true,
  } satisfies ChannelCapabilities,

  /** Configuration schema for IRC channel */
  configSchema: buildChannelConfigSchema({
    // IRC uses the main channels.irc config, no additional schema needed
    type: "object",
    properties: {},
  }),

  /** Account configuration management */
  config: {
    /** List all configured account IDs */
    listAccountIds: (cfg: OpenClawConfig): string[] => listAccountIds(cfg),

    /** Resolve an account config by ID */
    resolveAccount: (cfg: OpenClawConfig, accountId?: string | null): IrcAccountConfig => {
      const account = resolveIrcAccount({ cfg, accountId });
      return account.config as IrcAccountConfig;
    },

    /** Get the default account ID */
    defaultAccountId: (): string => DEFAULT_ACCOUNT_ID,

    /** Check if an account is configured */
    isConfigured: (account: IrcAccountConfig): boolean => {
      const serverConfig = account.server || (account as unknown as { server?: IrcServerConfig }).server;
      return isAccountConfigured(account, serverConfig);
    },

    /** Check if an account is enabled */
    isEnabled: (account: IrcAccountConfig): boolean => account.enabled !== false,

    /** Describe account status */
    describeAccount: (account: IrcAccountConfig): ChannelAccountSnapshot => {
      const serverConfig = account.server || (account as unknown as { server?: IrcServerConfig }).server;
      return {
        accountId: DEFAULT_ACCOUNT_ID,
        enabled: account.enabled !== false,
        configured: isAccountConfigured(account, serverConfig),
      };
    },

    /** Resolve allowlist for DMs */
    resolveAllowFrom: ({ cfg, accountId }) =>
      (resolveIrcAccount({ cfg, accountId }).config.dm?.allowFrom ?? []).map((entry) =>
        String(entry),
      ),

    /** Format allowlist entries */
    formatAllowFrom: ({ allowFrom }) =>
      allowFrom
        .map((entry) => String(entry).trim())
        .filter(Boolean)
        .map((entry) => entry.toLowerCase()),
  },

  /** Outbound message adapter */
  outbound: ircOutbound,

  /** Normalize messaging targets */
  resolver: {
    resolveTargets: async ({
      cfg,
      accountId,
      inputs,
      kind,
      runtime,
    }: {
      cfg: OpenClawConfig;
      accountId?: string | null;
      inputs: string[];
      kind: ResolveKind;
      runtime: RuntimeEnv;
    }): Promise<ChannelResolveResult[]> => {
      const results: ChannelResolveResult[] = [];
      for (const input of inputs) {
        const normalized = normalizeIrcMessagingTarget(input);
        if (normalized) {
          results.push({
            input,
            resolved: true,
            id: normalized,
          });
        } else {
          results.push({
            input,
            resolved: false,
            note: "Invalid IRC target (use #channel or nick)",
          });
        }
      }
      return results;
    },
  },

  /** Status monitoring adapter */
  status: {
    /** Default runtime state */
    defaultRuntime: {
      accountId: DEFAULT_ACCOUNT_ID,
      running: false,
      lastStartAt: null,
      lastStopAt: null,
      lastError: null,
    },

    /** Build channel summary from snapshot */
    buildChannelSummary: ({ snapshot }: { snapshot: ChannelAccountSnapshot }) => ({
      configured: snapshot.configured ?? false,
      running: snapshot.running ?? false,
      lastStartAt: snapshot.lastStartAt ?? null,
      lastStopAt: snapshot.lastStopAt ?? null,
      lastError: snapshot.lastError ?? null,
      probe: snapshot.probe,
      lastProbeAt: snapshot.lastProbeAt ?? null,
    }),

    /** Probe account connection */
    probeAccount: async ({
      account,
      timeoutMs,
    }: {
      account: IrcAccountConfig;
      timeoutMs: number;
    }): Promise<unknown> => {
      const serverConfig = account.server || (account as unknown as { server?: IrcServerConfig }).server;
      return await probeIrc(serverConfig as IrcServerConfig, timeoutMs);
    },

    /** Build account snapshot with current status */
    buildAccountSnapshot: ({
      account,
      cfg,
      runtime,
      probe,
    }: {
      account: IrcAccountConfig;
      cfg: OpenClawConfig;
      runtime?: ChannelAccountSnapshot;
      probe?: unknown;
    }): ChannelAccountSnapshot => {
      const irc = (cfg.channels as Record<string, unknown> | undefined)?.irc as
        | { accounts?: Record<string, unknown> }
        | undefined;
      const accountMap = (irc?.accounts as Record<string, unknown> | undefined) ?? {};
      const resolvedAccountId =
        Object.entries(accountMap).find(([, value]) => value === account)?.[0] ??
        DEFAULT_ACCOUNT_ID;
      const serverConfig = account.server || (account as unknown as { server?: IrcServerConfig }).server;
      return {
        accountId: resolvedAccountId,
        enabled: account.enabled !== false,
        configured: isAccountConfigured(account, serverConfig),
        running: runtime?.running ?? false,
        lastStartAt: runtime?.lastStartAt ?? null,
        lastStopAt: runtime?.lastStopAt ?? null,
        lastError: runtime?.lastError ?? null,
        probe,
      };
    },

    /** Collect status issues for all accounts */
    collectStatusIssues: (accounts: ChannelAccountSnapshot[]) => {
      const issues: string[] = [];
      for (const account of accounts) {
        if (!account.configured) {
          issues.push(`${account.accountId}: IRC not configured (missing server config)`);
        }
      }
      return issues;
    },
  },

  /** Gateway adapter for connection lifecycle */
  gateway: {
    /** Start an account connection */
    startAccount: async (ctx): Promise<void> => {
      const account = ctx.account as IrcAccountConfig;
      const accountId = ctx.accountId;

      ctx.setStatus?.({
        accountId,
        running: true,
        lastStartAt: Date.now(),
        lastError: null,
      });

      const log: ChannelLogSink = ctx.log ?? {
        info: (msg) => console.log(`[irc:${accountId}] ${msg}`),
        error: (msg) => console.error(`[irc:${accountId}] ${msg}`),
        debug: (msg) => console.log(`[irc:${accountId}] ${msg}`),
        warn: (msg) => console.log(`[irc:${accountId}] ${msg}`),
      };

      log.info?.(`Starting IRC connection for ${accountId}`);

      // Lazy import: the monitor pulls the reply pipeline; avoid ESM init cycles.
      const { monitorIrcProvider } = await import("../../irc/monitor.js");

      // Get server config from account
      const serverConfig = account.server || (account as unknown as { server?: IrcServerConfig }).server;

      await monitorIrcProvider({
        account,
        accountId,
        serverConfig,
        config: ctx.cfg,
        runtime: ctx.runtime,
        abortSignal: ctx.abortSignal,
        log: log as unknown as Console,
      });
    },

    /** Stop an account connection */
    stopAccount: async (ctx): Promise<void> => {
      const accountId = ctx.accountId;

      ctx.setStatus?.({
        accountId,
        running: false,
        lastStopAt: Date.now(),
      });

      ctx.log?.info(`Stopped IRC connection for ${accountId}`);
    },
  },
};

const plugin = {
  id: "irc",
  name: "IRC",
  description: "IRC channel plugin",
  version: "1.0.0",
  configSchema: buildChannelConfigSchema({
    type: "object",
    properties: {},
  }),
  register(api: OpenClawPluginApi) {
    // Register IRC as a channel plugin
    api.registerChannel({ plugin: ircPlugin });
  },
};

export default plugin;
