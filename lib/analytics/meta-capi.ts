// Meta Conversions API (server side). No-ops unless both the pixel id and META_CAPI_TOKEN are set.
// Emails are lowercased, trimmed and SHA-256 hashed before they leave this file. Nothing here logs a customer value.
import { createHash } from 'node:crypto';

export type CapiEventName = 'PageView' | 'ViewContent' | 'InitiateCheckout' | 'Lead' | 'Purchase';

export type CapiInput = {
  name: CapiEventName;
  eventId: string;
  eventTime?: number; // seconds
  sourceUrl?: string | null;
  email?: string | null;
  firstName?: string | null;
  phone?: string | null;
  visitorId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
  value?: number | null;
  currency?: string | null;
  contentIds?: string[];
  contentName?: string | null;
};

export function sha256(value: string) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

const norm = (v: string) => v.trim().toLowerCase();

// Meta wants digits only, with country code. A 10-digit US number gets a leading 1. Returns null if too short.
export function hashPhone(phone: string | null | undefined) {
  if (!phone) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 10) digits = `1${digits}`;
  if (digits.length < 11) return null;
  return sha256(digits);
}


export function pixelId(env: Record<string, string | undefined> = process.env) {
  return (env.META_PIXEL_ID || env.NEXT_PUBLIC_META_PIXEL_ID || '').trim();
}

export function capiConfigured(env: Record<string, string | undefined> = process.env) {
  return Boolean(pixelId(env) && (env.META_CAPI_TOKEN || '').trim());
}

export function buildCapiPayload(input: CapiInput, env: Record<string, string | undefined> = process.env) {
  const userData: Record<string, unknown> = {};
  if (input.email) userData.em = [sha256(norm(input.email))];
  if (input.firstName) userData.fn = [sha256(norm(input.firstName))];
  const phone = hashPhone(input.phone);
  if (phone) userData.ph = [phone];
  if (input.visitorId) userData.external_id = [sha256(input.visitorId)];
  if (input.ip) userData.client_ip_address = input.ip;
  if (input.userAgent) userData.client_user_agent = input.userAgent;
  if (input.fbp) userData.fbp = input.fbp;
  if (input.fbc) userData.fbc = input.fbc;

  const custom: Record<string, unknown> = {};
  if (input.value != null && Number.isFinite(input.value)) {
    custom.value = input.value;
    custom.currency = (input.currency || 'USD').toUpperCase();
  }
  if (input.contentIds?.length) {
    custom.content_ids = input.contentIds;
    custom.content_type = 'product';
  }
  if (input.contentName) custom.content_name = input.contentName;

  const event: Record<string, unknown> = {
    event_name: input.name,
    event_time: input.eventTime ?? Math.floor(Date.now() / 1000),
    event_id: input.eventId,
    action_source: 'website',
    user_data: userData,
    custom_data: custom,
  };
  if (input.sourceUrl) event.event_source_url = input.sourceUrl;

  const body: Record<string, unknown> = { data: [event] };
  const testCode = (env.META_CAPI_TEST_EVENT_CODE || '').trim();
  if (testCode) body.test_event_code = testCode;
  return body;
}

// Returns a short status string for logging. Never throws and never returns the token or a customer value.
export async function sendCapiEvent(input: CapiInput, env: Record<string, string | undefined> = process.env, fetchImpl: typeof fetch = fetch): Promise<string> {
  if (!capiConfigured(env)) return 'skipped_not_configured';
  const version = (env.META_GRAPH_VERSION || 'v23.0').trim();
  try {
    const body = { ...buildCapiPayload(input, env), access_token: (env.META_CAPI_TOKEN || '').trim() };
    const res = await fetchImpl(`https://graph.facebook.com/${version}/${pixelId(env)}/events`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
    });
    return res.ok ? 'ok' : `http_${res.status}`;
  } catch (err) {
    return `error_${(err as Error).name}`;
  }
}
