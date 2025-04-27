// src/utils/env.ts (or src/utils/index.ts)
/**
 * Checks if the current browser environment is within the Enterprise WeChat (WeCom) mobile client.
 * @returns {boolean} True if in WeCom mobile client, false otherwise.
 */
export function isWeCom(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  // Both micromessenger (WeChat base) and wxwork (WeCom specific) should be present
  return /micromessenger/.test(ua) && /wxwork/.test(ua);
}
