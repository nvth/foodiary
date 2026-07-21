import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import * as jose from "jose";
import ts from "typescript";

const VERIFIED_HEADER = "x-foodblog-verified-admin-email";

async function transpileCommonJs(path) {
  const source = await readFile(new URL(path, import.meta.url), "utf8");
  return ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
}

async function loadAdminAuth() {
  const output = await transpileCommonJs("../lib/admin-auth.ts");
  const loadedModule = { exports: {} };
  Function("exports", "module", output)(loadedModule.exports, loadedModule);
  return loadedModule.exports;
}

async function loadWorker(joseModule = jose) {
  const output = await transpileCommonJs("../worker/index.ts");
  const loadedModule = { exports: {} };
  let forwardedRequest = null;
  let handlerCalls = 0;
  const appHandler = {
    async fetch(request) {
      handlerCalls += 1;
      forwardedRequest = request;
      return new Response("app response");
    },
  };
  const modules = {
    jose: joseModule,
    "vinext/server/image-optimization": {
      DEFAULT_DEVICE_SIZES: [],
      DEFAULT_IMAGE_SIZES: [],
      handleImageOptimization() {
        throw new Error("image optimization is outside these tests");
      },
    },
    "vinext/server/app-router-entry": { __esModule: true, default: appHandler },
    "../lib/admin-auth": { VERIFIED_ADMIN_EMAIL_HEADER: VERIFIED_HEADER },
  };
  const localRequire = (specifier) => {
    if (!(specifier in modules)) throw new Error(`Unexpected import: ${specifier}`);
    return modules[specifier];
  };
  Function("exports", "module", "require", output)(loadedModule.exports, loadedModule, localRequire);

  return {
    exports: loadedModule.exports,
    getForwardedRequest: () => forwardedRequest,
    getHandlerCalls: () => handlerCalls,
  };
}

function context() {
  return {
    waitUntil() {},
    passThroughOnException() {},
  };
}

test("app auth trusts only the Worker-injected identity header", async () => {
  const { getAdminState, VERIFIED_ADMIN_EMAIL_HEADER } = await loadAdminAuth();
  assert.equal(VERIFIED_ADMIN_EMAIL_HEADER, VERIFIED_HEADER);

  const spoofedPublicHeaders = new Request("https://example.com/admin", {
    headers: {
      "cf-access-authenticated-user-email": "owner@example.com",
      "oai-authenticated-user-email": "owner@example.com",
    },
  });
  assert.deepEqual(getAdminState(spoofedPublicHeaders), {
    isAdmin: false,
    email: null,
    configured: false,
  });

  const verified = new Request("https://example.com/admin", {
    headers: { [VERIFIED_HEADER]: " Owner@Example.com " },
  });
  assert.deepEqual(getAdminState(verified), {
    isAdmin: true,
    email: "owner@example.com",
    configured: true,
  });
});

test("admin route matching includes only /admin and /api/admin descendants", async () => {
  const { exports } = await loadWorker({
    createRemoteJWKSet() {
      throw new Error("not called");
    },
    jwtVerify() {
      throw new Error("not called");
    },
  });

  for (const pathname of [
    "/admin",
    "/admin/",
    "/admin/about",
    "/%61dmin",
    "/admin%2Fabout",
    "/api/admin",
    "/api/admin/reviews",
    "/api/admin%2Freviews",
  ]) {
    assert.equal(exports.isAdminPath(pathname), true, pathname);
  }
  for (const pathname of ["/", "/administrator", "/admin-old", "/api/administrator", "/api/admin-old"]) {
    assert.equal(exports.isAdminPath(pathname), false, pathname);
  }
});

test("admin requests fail closed when configuration or assertions are missing", async () => {
  const { exports, getHandlerCalls } = await loadWorker({
    createRemoteJWKSet() {
      throw new Error("not called");
    },
    jwtVerify() {
      throw new Error("not called");
    },
  });
  const request = new Request("https://food.example/admin", {
    headers: { [VERIFIED_HEADER]: "attacker@example.com" },
  });

  const missingConfig = await exports.default.fetch(request, {}, context());
  assert.equal(missingConfig.status, 401);
  assert.equal(getHandlerCalls(), 0);

  const missingJwt = await exports.default.fetch(request, {
    TEAM_DOMAIN: "team.cloudflareaccess.com",
    POLICY_AUD: "policy-audience",
    ADMIN_EMAILS: "owner@example.com",
  }, context());
  assert.equal(missingJwt.status, 401);
  assert.equal(getHandlerCalls(), 0);
});

test("local bypass requires both a loopback hostname and an explicit true flag", async () => {
  const noJwtJose = {
    createRemoteJWKSet() {
      throw new Error("JWT verification must not run for the local bypass");
    },
    jwtVerify() {
      throw new Error("JWT verification must not run for the local bypass");
    },
  };

  const local = await loadWorker(noJwtJose);
  const localResponse = await local.exports.default.fetch(
    new Request("http://127.0.0.2/admin"),
    { DEV_ADMIN_BYPASS: "true" },
    context(),
  );
  assert.equal(localResponse.status, 200);
  assert.equal(local.getForwardedRequest().headers.get(VERIFIED_HEADER), "local-admin@localhost");

  for (const [url, flag] of [
    ["https://food.example/admin", "true"],
    ["http://localhost/admin", "false"],
    ["http://localhost/admin", undefined],
  ]) {
    const isolated = await loadWorker(noJwtJose);
    const response = await isolated.exports.default.fetch(
      new Request(url, { headers: { [VERIFIED_HEADER]: "attacker@example.com" } }),
      { DEV_ADMIN_BYPASS: flag },
      context(),
    );
    assert.equal(response.status, 401, `${url} with ${String(flag)}`);
    assert.equal(isolated.getHandlerCalls(), 0);
  }
});

test("valid Cloudflare Access JWT is verified by remote JWKS before identity injection", async (t) => {
  const issuer = "https://team.cloudflareaccess.com";
  const audience = "policy-audience";
  const { publicKey, privateKey } = await jose.generateKeyPair("RS256");
  const publicJwk = await jose.exportJWK(publicKey);
  Object.assign(publicJwk, { alg: "RS256", kid: "access-key", use: "sig" });
  const token = await new jose.SignJWT({ type: "app", email: "Owner@Example.com" })
    .setProtectedHeader({ alg: "RS256", kid: "access-key" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt()
    .setExpirationTime("5m")
    .sign(privateKey);

  const originalFetch = globalThis.fetch;
  let jwksUrl = null;
  globalThis.fetch = async (input) => {
    jwksUrl = String(input);
    return Response.json({ keys: [publicJwk] });
  };
  t.after(() => {
    globalThis.fetch = originalFetch;
  });

  const loaded = await loadWorker();
  const response = await loaded.exports.default.fetch(new Request("https://food.example/api/admin/reviews", {
    headers: {
      "cf-access-jwt-assertion": token,
      "cf-access-authenticated-user-email": "attacker@example.com",
      "oai-authenticated-user-email": "attacker@example.com",
      [VERIFIED_HEADER]: "attacker@example.com",
    },
  }), {
    TEAM_DOMAIN: "team.cloudflareaccess.com",
    POLICY_AUD: audience,
    ADMIN_EMAILS: "other@example.com, owner@example.com",
  }, context());

  assert.equal(response.status, 200);
  assert.equal(jwksUrl, `${issuer}/cdn-cgi/access/certs`);
  assert.equal(loaded.getHandlerCalls(), 1);
  const forwarded = loaded.getForwardedRequest();
  assert.equal(forwarded.headers.get(VERIFIED_HEADER), "owner@example.com");
  assert.equal(forwarded.headers.get("cf-access-jwt-assertion"), null);
  assert.equal(forwarded.headers.get("cf-access-authenticated-user-email"), null);
  assert.equal(forwarded.headers.get("oai-authenticated-user-email"), null);
});

test("wrong Access token type or admin email is rejected", async () => {
  for (const payload of [
    { type: "org", email: "owner@example.com" },
    { type: "app", email: "stranger@example.com" },
  ]) {
    const fakeJose = {
      createRemoteJWKSet(url) {
        return { url: String(url) };
      },
      async jwtVerify(assertion, jwks, options) {
        assert.equal(assertion, "signed-token");
        assert.equal(jwks.url, "https://team.cloudflareaccess.com/cdn-cgi/access/certs");
        assert.equal(options.issuer, "https://team.cloudflareaccess.com");
        assert.equal(options.audience, "policy-audience");
        assert.deepEqual(options.algorithms, ["RS256"]);
        assert.deepEqual(options.requiredClaims, ["exp", "iat"]);
        return { payload };
      },
    };
    const loaded = await loadWorker(fakeJose);
    const response = await loaded.exports.default.fetch(new Request("https://food.example/admin", {
      headers: { "cf-access-jwt-assertion": "signed-token" },
    }), {
      TEAM_DOMAIN: "https://team.cloudflareaccess.com",
      POLICY_AUD: "policy-audience",
      ADMIN_EMAILS: "owner@example.com",
    }, context());
    assert.equal(response.status, 401);
    assert.equal(loaded.getHandlerCalls(), 0);
  }
});

test("public requests cannot smuggle internal or identity headers into the app", async () => {
  const loaded = await loadWorker({
    createRemoteJWKSet() {
      throw new Error("not called");
    },
    jwtVerify() {
      throw new Error("not called");
    },
  });
  const response = await loaded.exports.default.fetch(new Request("https://food.example/administrator", {
    headers: {
      [VERIFIED_HEADER]: "attacker@example.com",
      "cf-access-authenticated-user-email": "attacker@example.com",
      "oai-authenticated-user-email": "attacker@example.com",
    },
  }), {}, context());

  assert.equal(response.status, 200);
  assert.equal(loaded.getHandlerCalls(), 1);
  assert.equal(loaded.getForwardedRequest().headers.get(VERIFIED_HEADER), null);
  assert.equal(loaded.getForwardedRequest().headers.get("cf-access-authenticated-user-email"), null);
  assert.equal(loaded.getForwardedRequest().headers.get("oai-authenticated-user-email"), null);
});
