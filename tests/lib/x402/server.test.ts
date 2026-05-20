import { describe, it, expect } from "vitest";
import {
  createPaymentRequirements,
  encodePaymentRequirements,
  decodePaymentRequirements,
  isX402PaymentValid,
  x402Config,
  type PaymentRequirements,
} from "@/lib/x402/server";

describe("createPaymentRequirements", () => {
  const resource = "test-resource-123";
  const result = createPaymentRequirements(resource);

  it("returns correct scheme", () => {
    expect(result.scheme).toBe("exact");
  });

  it("returns correct price", () => {
    expect(result.price).toBe(x402Config.consentPriceUsdc);
  });

  it("returns correct network eip155:84532", () => {
    expect(result.network).toBe("eip155:84532");
  });

  it("returns correct asset address", () => {
    expect(result.asset).toBe(x402Config.usdcAddress);
  });

  it("returns correct payTo address", () => {
    expect(result.payTo).toBe(x402Config.resourceWallet);
  });

  it("includes the given resource", () => {
    expect(result.resource).toBe(resource);
  });
});

describe("encodePaymentRequirements / decodePaymentRequirements", () => {
  const requirements: PaymentRequirements = {
    scheme: "exact",
    price: "0.10",
    network: "eip155:84532",
    maxAmountRequired: "100000",
    asset: "0x036CbD5386428872D267c415a6a3F10a6C85B5a",
    payTo: "0xabcdef",
    resource: "consent-123",
    description: "test",
  };

  it("encode produces valid base64", () => {
    const encoded = encodePaymentRequirements(requirements);
    expect(() => Buffer.from(encoded, "base64")).not.toThrow();
    expect(encoded.length).toBeGreaterThan(0);
  });

  it("roundtrips encode -> decode", () => {
    const encoded = encodePaymentRequirements(requirements);
    const decoded = decodePaymentRequirements(encoded);
    expect(decoded).toEqual(requirements);
  });

  it("decodePaymentRequirements(null) returns null", () => {
    expect(decodePaymentRequirements(null)).toBeNull();
  });

  it("decodePaymentRequirements returns null for invalid base64", () => {
    expect(decodePaymentRequirements("not-valid-base64!!")).toBeNull();
  });
});

describe("isX402PaymentValid", () => {
  const requirements: PaymentRequirements = {
    scheme: "exact",
    price: "0.10",
    network: "eip155:84532",
    maxAmountRequired: "100000",
    asset: "0x036CbD5386428872D267c415a6a3F10a6C85B5a",
    payTo: "0xabcdef",
    resource: "test",
    description: "test",
  };

  it("returns true when amount equals required", () => {
    expect(isX402PaymentValid(requirements, "100000")).toBe(true);
  });

  it("returns true when amount exceeds required", () => {
    expect(isX402PaymentValid(requirements, "200000")).toBe(true);
  });

  it("returns false when amount is less than required", () => {
    expect(isX402PaymentValid(requirements, "99999")).toBe(false);
  });
});
