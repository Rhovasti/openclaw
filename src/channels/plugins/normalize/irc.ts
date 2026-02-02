import { buildIrcTargetKey } from "../../../irc/targets.js";

export function normalizeIrcMessagingTarget(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  // If it's already in irc:account:target format, return as-is
  if (/^irc:[^:]+:.+/.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  // IRC channel
  if (trimmed.startsWith("#")) {
    return buildIrcTargetKey({ target: trimmed });
  }

  // IRC nick (DM)
  if (/^[a-zA-Z_\-\[\]\\^{}|`][a-zA-Z0-9_\-\[\]\\^{}|`]*$/.test(trimmed)) {
    return buildIrcTargetKey({ target: trimmed });
  }

  return undefined;
}

export function looksLikeIrcTarget(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed) return false;
  // IRC channels start with #
  if (trimmed.startsWith("#")) return true;
  // IRC users look like nick!user@host or just nick
  if (/^[a-zA-Z_][a-zA-Z0-9_]{0,8}(![^@]+@[^@]+)?$/.test(trimmed)) return true;
  // irc: prefix
  if (/^irc:/i.test(trimmed)) return true;
  return false;
}
