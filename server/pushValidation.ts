function isPrivateOrLocalHost(hostname: string): boolean {
  const lower = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  const isIpv6 = lower.includes(':');
  if (
    lower === 'localhost' ||
    lower.endsWith('.local') ||
    lower === '::1' ||
    lower === '0.0.0.0' ||
    lower.startsWith('127.') ||
    lower.startsWith('10.') ||
    lower.startsWith('192.168.') ||
    lower.startsWith('169.254.') ||
    (isIpv6 && (lower.startsWith('fc') || lower.startsWith('fd') || lower.startsWith('fe80:')))
  ) {
    return true;
  }
  const match172 = /^172\.(\d{1,3})\./.exec(lower);
  if (match172) {
    const second = Number(match172[1]);
    if (second >= 16 && second <= 31) return true;
  }
  return false;
}

export function validatePushSubscriptionPayload(body: unknown): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { valid: false, error: 'Push subscription payload must be a JSON object.' };
  }
  const sub = body as { endpoint?: unknown; keys?: unknown };
  if (typeof sub.endpoint !== 'string' || sub.endpoint.length < 12 || sub.endpoint.length > 2048) {
    return { valid: false, error: 'Invalid push subscription endpoint.' };
  }
  let parsed: URL;
  try {
    parsed = new URL(sub.endpoint);
  } catch {
    return { valid: false, error: 'Push subscription endpoint must be a valid URL.' };
  }
  if (parsed.protocol !== 'https:' || isPrivateOrLocalHost(parsed.hostname)) {
    return {
      valid: false,
      error: 'Push subscription endpoint must use HTTPS on a public push-service host.',
    };
  }
  if (!sub.keys || typeof sub.keys !== 'object' || Array.isArray(sub.keys)) {
    return { valid: false, error: 'Push subscription must include encryption keys (p256dh and auth).' };
  }
  const keys = sub.keys as { p256dh?: unknown; auth?: unknown };
  const b64UrlPattern = /^[A-Za-z0-9_-]+={0,2}$/;
  if (
    typeof keys.p256dh !== 'string' ||
    keys.p256dh.length < 40 ||
    keys.p256dh.length > 200 ||
    !b64UrlPattern.test(keys.p256dh)
  ) {
    return { valid: false, error: 'Invalid p256dh push encryption key.' };
  }
  if (
    typeof keys.auth !== 'string' ||
    keys.auth.length < 16 ||
    keys.auth.length > 80 ||
    !b64UrlPattern.test(keys.auth)
  ) {
    return { valid: false, error: 'Invalid auth push secret key.' };
  }
  return { valid: true };
}
