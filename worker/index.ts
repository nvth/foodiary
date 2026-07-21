/** Cloudflare Worker entry point for the vinext-starter template. */
import { createRemoteJWKSet, jwtVerify } from "jose";
import { handleImageOptimization, DEFAULT_DEVICE_SIZES, DEFAULT_IMAGE_SIZES } from "vinext/server/image-optimization";
import handler from "vinext/server/app-router-entry";
import { VERIFIED_ADMIN_EMAIL_HEADER } from "../lib/admin-auth";

interface Env {
  ASSETS: Fetcher;
  DB: D1Database;
  MEDIA: R2Bucket;
  TEAM_DOMAIN?: string;
  POLICY_AUD?: string;
  ADMIN_EMAILS?: string;
  DEV_ADMIN_BYPASS?: string;
  IMAGES: {
    input(stream: ReadableStream): {
      transform(options: Record<string, unknown>): {
        output(options: { format: string; quality: number }): Promise<{ response(): Response }>;
      };
    };
  };
}

interface ExecutionContext {
  waitUntil(promise: Promise<unknown>): void;
  passThroughOnException(): void;
}

const ACCESS_ASSERTION_HEADER = "cf-access-jwt-assertion";
const UNTRUSTED_IDENTITY_HEADERS = [
  ACCESS_ASSERTION_HEADER,
  "cf-access-authenticated-user-email",
  "oai-authenticated-user-email",
  VERIFIED_ADMIN_EMAIL_HEADER,
] as const;
const remoteJwksByIssuer = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

type AccessConfig = {
  issuer: string;
  audience: string;
  allowedEmails: Set<string>;
};

export function isAdminPath(pathname: string): boolean {
  let decodedPathname = pathname;
  try {
    decodedPathname = decodeURIComponent(pathname);
  } catch {
    // Malformed escapes are left untouched and will be rejected by the router.
  }
  return decodedPathname === "/admin"
    || decodedPathname.startsWith("/admin/")
    || decodedPathname === "/api/admin"
    || decodedPathname.startsWith("/api/admin/");
}

export function isLoopbackHostname(hostname: string): boolean {
  const normalized = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (normalized === "localhost" || normalized === "::1") return true;

  const ipv4 = normalized.match(/^127\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  return Boolean(ipv4 && ipv4.slice(1).every((octet) => Number(octet) <= 255));
}

function parseAccessConfig(env: Env): AccessConfig | null {
  const teamDomain = env.TEAM_DOMAIN?.trim();
  const audience = env.POLICY_AUD?.trim();
  const allowedEmails = new Set(
    (env.ADMIN_EMAILS ?? "")
      .split(",")
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean),
  );
  if (!teamDomain || !audience || allowedEmails.size === 0) return null;

  try {
    const teamUrl = new URL(teamDomain.includes("://") ? teamDomain : `https://${teamDomain}`);
    if (
      teamUrl.protocol !== "https:"
      || teamUrl.username
      || teamUrl.password
      || teamUrl.pathname !== "/"
      || teamUrl.search
      || teamUrl.hash
    ) {
      return null;
    }
    return { issuer: teamUrl.origin, audience, allowedEmails };
  } catch {
    return null;
  }
}

function getRemoteJwks(issuer: string): ReturnType<typeof createRemoteJWKSet> {
  let jwks = remoteJwksByIssuer.get(issuer);
  if (!jwks) {
    jwks = createRemoteJWKSet(new URL("/cdn-cgi/access/certs", issuer));
    remoteJwksByIssuer.set(issuer, jwks);
  }
  return jwks;
}

async function verifiedAdminEmail(request: Request, env: Env): Promise<string | null> {
  const url = new URL(request.url);
  if (isLoopbackHostname(url.hostname) && env.DEV_ADMIN_BYPASS?.trim().toLowerCase() === "true") {
    return "local-admin@localhost";
  }

  const config = parseAccessConfig(env);
  const assertion = request.headers.get(ACCESS_ASSERTION_HEADER)?.trim();
  if (!config || !assertion) return null;

  try {
    const { payload } = await jwtVerify(assertion, getRemoteJwks(config.issuer), {
      issuer: config.issuer,
      audience: config.audience,
      algorithms: ["RS256"],
      requiredClaims: ["exp", "iat"],
    });
    if (payload.type !== "app" || typeof payload.email !== "string") return null;

    const email = payload.email.trim().toLowerCase();
    return email && config.allowedEmails.has(email) ? email : null;
  } catch {
    return null;
  }
}

function sanitizedRequest(request: Request, verifiedEmail: string | null): Request {
  const headers = new Headers(request.headers);
  for (const header of UNTRUSTED_IDENTITY_HEADERS) headers.delete(header);
  if (verifiedEmail) headers.set(VERIFIED_ADMIN_EMAIL_HEADER, verifiedEmail);
  return new Request(request, { headers });
}

function unauthorizedResponse(): Response {
  return Response.json(
    { error: "Unauthorized" },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

// Image security config. SVG sources with .svg extension auto-skip the
// optimization endpoint on the client side (served directly, no proxy).
// To route SVGs through the optimizer (with security headers), set
// dangerouslyAllowSVG: true in next.config.js and uncomment below:
// const imageConfig: ImageConfig = { dangerouslyAllowSVG: true };

const worker = {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const protectedAdminPath = isAdminPath(url.pathname);
    const verifiedEmail = protectedAdminPath ? await verifiedAdminEmail(request, env) : null;
    if (protectedAdminPath && !verifiedEmail) return unauthorizedResponse();
    const appRequest = sanitizedRequest(request, verifiedEmail);

    if (url.pathname === "/_vinext/image") {
      const allowedWidths = [...DEFAULT_DEVICE_SIZES, ...DEFAULT_IMAGE_SIZES];
      return handleImageOptimization(appRequest, {
        fetchAsset: (path) => env.ASSETS.fetch(new Request(new URL(path, appRequest.url))),
        transformImage: async (body, { width, format, quality }) => {
          const result = await env.IMAGES.input(body).transform(width > 0 ? { width } : {}).output({ format, quality });
          return result.response();
        },
      }, allowedWidths);
    }

    return handler.fetch(appRequest, env, ctx);
  },
};

export default worker;
