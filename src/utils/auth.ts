import type { AuthSession } from '../types';
import { readStorage, STORAGE_KEYS, writeStorage } from './storage';
import { sanitizePlainText } from './validation';

/**
 * Browser-local demo authentication helper.
 * Clearly labelled as local demo authentication — never stores plain-text passwords
 * (hashes with per-account random salt via Web Crypto SHA-256).
 */
interface DemoAccountRecord {
  email: string;
  displayName: string;
  saltHex: string;
  passwordHashHex: string;
  createdAt: string;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateEmailAddress(raw: string): { valid: boolean; email: string; error?: string } {
  const email = raw.trim().toLowerCase();
  if (!email) {
    return { valid: false, email: '', error: 'Please enter your email address.' };
  }
  if (email.length > 120 || !EMAIL_PATTERN.test(email)) {
    return { valid: false, email, error: 'Please enter a valid email address (e.g. name@example.com).' };
  }
  return { valid: true, email };
}

export function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (!password) {
    return { valid: false, error: 'Please enter a password.' };
  }
  if (!password.trim()) {
    return { valid: false, error: 'Password cannot consist only of spaces.' };
  }
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long.' };
  }
  if (password.length > 128) {
    return { valid: false, error: 'Password must be 128 characters or fewer.' };
  }
  return { valid: true };
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function generateSaltHex(): string {
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto !== 'undefined' && typeof globalThis.crypto.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }
  return bytesToHex(bytes);
}

export async function hashPasswordWithSalt(password: string, saltHex: string): Promise<string> {
  const payload = new TextEncoder().encode(`vayumitra-demo-v1:${saltHex}:${password}`);
  if (typeof globalThis.crypto !== 'undefined' && globalThis.crypto.subtle) {
    const digest = await globalThis.crypto.subtle.digest('SHA-256', payload);
    return bytesToHex(new Uint8Array(digest));
  }
  // Fallback deterministic mixing only if Web Crypto subtle is unavailable in a restricted runtime
  let h1 = 0x811c9dc5;
  for (let i = 0; i < payload.length; i++) {
    h1 ^= payload[i];
    h1 = Math.imul(h1, 0x01000193);
  }
  return `fallback-${(h1 >>> 0).toString(16).padStart(8, '0')}`;
}

export async function registerDemoAccount(input: {
  displayName: string;
  email: string;
  password: string;
  confirmPassword: string;
}): Promise<{ ok: true; session: AuthSession } | { ok: false; error: string }> {
  const cleanName = sanitizePlainText(input.displayName, 60);
  if (cleanName.length < 2) {
    return { ok: false, error: 'Please enter your name (at least 2 characters).' };
  }

  const emailCheck = validateEmailAddress(input.email);
  if (!emailCheck.valid) {
    return { ok: false, error: emailCheck.error ?? 'Invalid email address.' };
  }

  const passCheck = validatePasswordStrength(input.password);
  if (!passCheck.valid) {
    return { ok: false, error: passCheck.error ?? 'Invalid password.' };
  }

  if (input.password !== input.confirmPassword) {
    return { ok: false, error: 'Passwords do not match. Please re-enter to confirm.' };
  }

  const accounts = readStorage<DemoAccountRecord[]>(STORAGE_KEYS.DEMO_ACCOUNTS, []);
  if (accounts.some((acc) => acc.email === emailCheck.email)) {
    return {
      ok: false,
      error: 'A local demo account with this email already exists on this browser. Please sign in instead.',
    };
  }

  const saltHex = generateSaltHex();
  const passwordHashHex = await hashPasswordWithSalt(input.password, saltHex);

  const record: DemoAccountRecord = {
    email: emailCheck.email,
    displayName: cleanName,
    saltHex,
    passwordHashHex,
    createdAt: new Date().toISOString(),
  };

  writeStorage(STORAGE_KEYS.DEMO_ACCOUNTS, [...accounts, record]);

  const session: AuthSession = {
    mode: 'demo_account',
    email: record.email,
    displayName: record.displayName,
    signedInAt: new Date().toISOString(),
  };
  writeStorage(STORAGE_KEYS.AUTH_SESSION, session);
  return { ok: true, session };
}

export async function signInDemoAccount(input: {
  email: string;
  password: string;
}): Promise<{ ok: true; session: AuthSession } | { ok: false; error: string }> {
  const emailCheck = validateEmailAddress(input.email);
  if (!emailCheck.valid) {
    return { ok: false, error: emailCheck.error ?? 'Invalid email address.' };
  }

  if (!input.password) {
    return { ok: false, error: 'Please enter your password.' };
  }

  const accounts = readStorage<DemoAccountRecord[]>(STORAGE_KEYS.DEMO_ACCOUNTS, []);
  const found = accounts.find((acc) => acc.email === emailCheck.email);
  if (!found) {
    return {
      ok: false,
      error: 'No local demo account found for this email on this browser. Create a demo account or continue as Guest.',
    };
  }

  const computedHash = await hashPasswordWithSalt(input.password, found.saltHex);
  if (computedHash !== found.passwordHashHex) {
    return { ok: false, error: 'Incorrect password for this local demo account.' };
  }

  const session: AuthSession = {
    mode: 'demo_account',
    email: found.email,
    displayName: found.displayName,
    signedInAt: new Date().toISOString(),
  };
  writeStorage(STORAGE_KEYS.AUTH_SESSION, session);
  return { ok: true, session };
}
