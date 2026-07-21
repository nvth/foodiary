import type { SuggestionInput } from "@/lib/suggestion-validation";

export const SUGGESTION_RATE_LIMIT_MAX = 3;
export const SUGGESTION_RATE_LIMIT_MINUTES = 15;
export const SUGGESTION_DAILY_LIMIT_MAX = 10;
export const SUGGESTION_DAILY_LIMIT_HOURS = 24;
export const SUGGESTION_DUPLICATE_HOURS = 24;

export type SuggestionAbuseContext = {
  fingerprint: string;
  messageHash: string;
};

export async function buildSuggestionAbuseContext(
  request: Request,
  input: SuggestionInput,
  secret: string | undefined,
): Promise<SuggestionAbuseContext> {
  const clientAddress = request.headers.get("cf-connecting-ip")?.trim()
    || request.headers.get("x-forwarded-for")?.split(",", 1)[0]?.trim()
    || "unknown-client";
  const key = await importHmacKey(secret?.trim() || "foodblog-local-rate-limit");

  return {
    fingerprint: await hmacHex(key, `client:${clientAddress.slice(0, 160)}`),
    messageHash: await hmacHex(key, `message:${canonicalMessage(input.message)}`),
  };
}

function canonicalMessage(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("vi")
    .replace(/\p{Cf}+/gu, "")
    .replace(/[\p{P}\p{S}]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function hmacHex(key: CryptoKey, value: string): Promise<string> {
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
