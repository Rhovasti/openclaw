/**
 * IRC channel exports
 */

export {
  listIrcAccountIds,
  listEnabledIrcAccounts,
  resolveDefaultIrcAccountId,
  resolveIrcAccount,
} from "./accounts.js";

export { IrcClient, createIrcClient } from "./client.js";

export { monitorIrcProvider, resolveIrcNetworkConfig, isUserAllowed } from "./monitor.js";

export {
  sendMessageIrc,
  sendActionIrc,
  sendNoticeIrc,
  reactMessageIrc,
  editMessageIrc,
} from "./send.js";

export {
  buildIrcTargetKey,
  parseIrcTargetKey,
  resolveIrcTarget,
  formatIrcTarget,
  isIrcChannel,
  isIrcDm,
} from "./targets.js";

export type {
  IrcServerConfig,
  IrcChannelConfig,
  IrcNetworkEntry,
  IrcDmConfig,
  IrcAccountConfig,
  IrcMessageEvent,
  IrcNoticeEvent,
  IrcJoinEvent,
  IrcPartEvent,
  IrcQuitEvent,
  IrcKickEvent,
  IrcEvent,
  MonitorIrcOpts,
  IrcTarget,
} from "./types.js";
