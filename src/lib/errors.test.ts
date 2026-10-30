import { describe, expect, it } from "vitest";
import { categorizeError, deriveErrorCode, getLastErrorCode, rememberErrorCode } from "./errors";

describe("deriveErrorCode", () => {
  it("keeps the legacy marker when nothing is derivable", () => {
    expect(deriveErrorCode(null)).toBe("0xCRITICAL_FAIL");
    expect(deriveErrorCode(undefined)).toBe("0xCRITICAL_FAIL");
    expect(deriveErrorCode("")).toBe("0xCRITICAL_FAIL");
  });

  it("uses the category as prefix", () => {
    // Network: matches the /fetch|network/i message regex.
    expect(deriveErrorCode(new Error("Failed to fetch"))).toMatch(/^0xNET-/);
    // Auth: Postgrest permission code 42501.
    expect(deriveErrorCode({ code: "42501" })).toMatch(/^0xAUT-/);
    // Validation: Postgrest check-constraint range 22xxx.
    expect(deriveErrorCode({ code: "22P02" })).toMatch(/^0xVAL-/);
    // Server: other Postgrest codes.
    expect(deriveErrorCode({ code: "PGRST116" })).toMatch(/^0xSRV-/);
    // Unknown: plain render error.
    expect(deriveErrorCode(new TypeError("Cannot read properties of undefined"))).toMatch(/^0xUNK-/);
  });

  it("is deterministic for identical errors", () => {
    const a = deriveErrorCode(new Error("boom"));
    const b = deriveErrorCode(new Error("boom"));
    expect(a).toBe(b);
  });

  it("differs for different messages", () => {
    const a = deriveErrorCode(new Error("one"));
    const b = deriveErrorCode(new Error("two"));
    expect(a).not.toBe(b);
  });

  it("produces the documented 0xAAA-XXXXXXXX format", () => {
    expect(deriveErrorCode(new TypeError("bad prop"))).toMatch(/^0x[A-Z]{3}-[0-9a-f]{8}$/);
  });

  it("does not leak the error message into the code", () => {
    const secret = "postgres://admin:hunter2@db.internal/prod";
    const code = deriveErrorCode(new Error(secret));
    expect(code).not.toContain("hunter2");
  });
});

describe("error code persistence", () => {
  it("round-trips through sessionStorage", () => {
    rememberErrorCode("0xNET-deadbeef");
    expect(getLastErrorCode()).toBe("0xNET-deadbeef");

    rememberErrorCode("0xUNK-00000001");
    expect(getLastErrorCode()).toBe("0xUNK-00000001");
  });

  it("returns null when nothing was stored", () => {
    window.sessionStorage.removeItem("yic:lastErrorCode");
    expect(getLastErrorCode()).toBeNull();
  });
});

describe("categorizeError (code prefix contract)", () => {
  it("maps each category the prefixes rely on", () => {
    expect(categorizeError({ code: "42501" })).toBe("auth");
    expect(categorizeError("Failed to fetch resource")).toBe("network");
    expect(categorizeError({ code: "23505" })).toBe("validation");
    expect(categorizeError({ code: "PGRST116" })).toBe("server");
    expect(categorizeError(new Error("unexpected thing"))).toBe("unknown");
  });
});
