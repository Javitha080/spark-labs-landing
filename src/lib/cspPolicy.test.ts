import { describe, expect, it } from "vitest";
import { buildCSPPolicy, CSP_DIRECTIVES } from "./cspPolicy";

describe("buildCSPPolicy", () => {
  it("serializes production directives from the single source of truth", () => {
    const policy = buildCSPPolicy();

    expect(policy).toBe(CSP_DIRECTIVES.join("; "));

    for (const directive of CSP_DIRECTIVES) {
      expect(policy).toContain(directive);
    }
  });

  it("never allows unsafe-eval", () => {
    const prod = buildCSPPolicy();
    const dev = buildCSPPolicy({ dev: true });

    for (const policy of [prod, dev]) {
      expect(policy).not.toMatch(/'unsafe-eval'/);
    }
  });

  it("keeps the narrow wasm-unsafe-eval allowance for WebGL decoders", () => {
    expect(buildCSPPolicy()).toMatch(/script-src [^;]*'wasm-unsafe-eval'/);
  });

  it("blocks object, base, form and framing hardening directives", () => {
    const policy = buildCSPPolicy();

    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("base-uri 'self'");
    expect(policy).toContain("form-action 'self'");
    expect(policy).toContain("frame-ancestors 'self'");
    expect(policy).toContain("upgrade-insecure-requests");
  });

  it("dev adds localhost HMR allowances to connect-src only", () => {
    const dev = buildCSPPolicy({ dev: true });

    expect(dev).toMatch(/connect-src [^;]*wss:\/\/localhost:\*/);
    expect(dev).not.toMatch(/script-src [^;]*localhost/);
  });

  it("dev adds the Lovable AI gateway to script-src", () => {
    expect(buildCSPPolicy({ dev: true })).toMatch(
      /script-src [^;]*https:\/\/ai\.gateway\.lovable\.dev/,
    );
  });
});
