type CooldownMessage = {
  id: string;
  cooldownMs?: number;
};

type CooldownMap = Record<string, number>;

type ApplyCooldownOptions = {
  now?: number;
  updateMap?: boolean; // whether to update lastShownMap
  debug?: boolean;
};

export function applyCooldown<T extends CooldownMessage>(
  messages: T[],
  lastShownMap: CooldownMap,
  options: ApplyCooldownOptions = {}
): T[] {
  if (!Array.isArray(messages)) return [];

  const now = options.now ?? Date.now();
  const debug = options.debug ?? false;

  const result: T[] = [];

  for (const message of messages) {
    if (!message || typeof message.id !== "string") continue;

    const cooldownMs = message.cooldownMs;

    // ✅ No cooldown → always include
    if (!cooldownMs || cooldownMs <= 0) {
      result.push(message);

      if (options.updateMap) {
        lastShownMap[message.id] = now;
      }

      continue;
    }

    const lastShown = lastShownMap[message.id];

    // ✅ Never shown before → allow
    if (!lastShown || typeof lastShown !== "number") {
      result.push(message);

      if (options.updateMap) {
        lastShownMap[message.id] = now;
      }

      continue;
    }

    const elapsed = now - lastShown;

    // ✅ Cooldown expired → allow
    if (elapsed > cooldownMs) {
      result.push(message);

      if (options.updateMap) {
        lastShownMap[message.id] = now;
      }

      continue;
    }

    // ❌ Still in cooldown → skip
    if (debug) {
      console.log("[Cooldown] Skipped:", {
        id: message.id,
        remainingMs: cooldownMs - elapsed,
      });
    }
  }

  return result;
}

export default applyCooldown;
