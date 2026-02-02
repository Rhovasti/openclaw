import {
  buildChannelConfigSchema,
  getChatChannelMeta,
  IrcConfigSchema,
  type ChannelPlugin,
} from "openclaw/plugin-sdk";

import { getIrcRuntime } from "./runtime.js";

const meta = getChatChannelMeta("irc");

export const ircPlugin: ChannelPlugin<unknown> = {
  id: "irc",
  meta: {
    ...meta,
  },
  capabilities: {
    chatTypes: ["direct", "group"],
    nativeCommands: true,
    blockStreaming: true,
  },
  configSchema: buildChannelConfigSchema(IrcConfigSchema),
  config: {
    listAccountIds: (cfg) => getIrcRuntime().channel.irc.listAccountIds(cfg),
    resolveAccount: (cfg, accountId) =>
      getIrcRuntime().channel.irc.resolveIrcAccount({ cfg, accountId }),
    defaultAccountId: () => getIrcRuntime().channel.irc.defaultAccountId(),
    isConfigured: (account) => getIrcRuntime().channel.irc.isAccountConfigured(account),
    isEnabled: (account) => getIrcRuntime().channel.irc.isAccountEnabled(account),
    describeAccount: (account) => getIrcRuntime().channel.irc.describeAccount(account),
    resolveAllowFrom: ({ cfg, accountId }) =>
      getIrcRuntime().channel.irc.resolveAllowFrom({ cfg, accountId }),
    formatAllowFrom: ({ allowFrom }) =>
      getIrcRuntime().channel.irc.formatAllowFrom({ allowFrom }),
  },
  outbound: {
    deliveryMode: "direct",
    chunker: null,
    sendText: async ({ to, text, accountId, deps }) => {
      const send =
        deps?.sendIrc ?? getIrcRuntime().channel.irc.sendMessageIrc;
      const result = await send(to, text, { accountId: accountId ?? undefined });
      return { channel: "irc", ...result };
    },
  },
  resolver: {
    resolveTargets: async ({ cfg, accountId, inputs, kind }) => {
      const results: { input: string; resolved: boolean; id?: string; note?: string }[] = [];
      for (const input of inputs) {
        const normalized = getIrcRuntime().channel.irc.normalizeIrcMessagingTarget(input);
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
  status: {
    defaultRuntime: {
      accountId: "default",
      running: false,
      lastStartAt: null,
      lastStopAt: null,
      lastError: null,
    },
    buildChannelSummary: ({ snapshot }) => ({
      configured: snapshot.configured ?? false,
      running: snapshot.running ?? false,
      lastStartAt: snapshot.lastStartAt ?? null,
      lastStopAt: snapshot.lastStopAt ?? null,
      lastError: snapshot.lastError ?? null,
      probe: snapshot.probe,
      lastProbeAt: snapshot.lastProbeAt ?? null,
    }),
    probeAccount: async ({ account, timeoutMs }) =>
      await getIrcRuntime().channel.irc.probeIrc(account, timeoutMs),
    buildAccountSnapshot: ({ account, cfg, runtime, probe }) =>
      getIrcRuntime().channel.irc.buildAccountSnapshot({ account, cfg, runtime, probe }),
    collectStatusIssues: (accounts) =>
      getIrcRuntime().channel.irc.collectStatusIssues(accounts),
  },
  gateway: {
    startAccount: async (ctx) => {
      const account = ctx.account;
      const accountId = ctx.accountId;

      ctx.setStatus?.({
        accountId,
        running: true,
        lastStartAt: Date.now(),
        lastError: null,
      });

      const log = ctx.log ?? {
        info: (msg) => console.log(`[irc:${accountId}] ${msg}`),
        error: (msg) => console.error(`[irc:${accountId}] ${msg}`),
        debug: (msg) => console.log(`[irc:${accountId}] ${msg}`),
        warn: (msg) => console.log(`[irc:${accountId}] ${msg}`),
      };

      log.info?.(`Starting IRC connection for ${accountId}`);

      return getIrcRuntime().channel.irc.monitorIrcProvider({
        account,
        accountId,
        serverConfig: account.server,
        config: ctx.cfg,
        runtime: ctx.runtime,
        abortSignal: ctx.abortSignal,
        log: log as unknown as Console,
      });
    },
    stopAccount: async (ctx) => {
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
