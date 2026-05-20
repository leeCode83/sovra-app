import { describe, it, expect } from "vitest";
import { usdcToWei, weiToUsdc, USDC_DECIMALS, DEFAULT_CONSENT_PRICE_USDC, USDC_ADDRESS_SEPOLIA, USDC_ADDRESSES } from "@/lib/payment/usdc";

describe("usdcToWei", () => {
  it("converts 0.10 USDC to 100000 wei", () => {
    expect(usdcToWei("0.10")).toBe(100000n);
  });

  it("converts 1 USDC to 1000000 wei", () => {
    expect(usdcToWei("1")).toBe(1000000n);
  });

  it("converts smallest unit 0.000001 to 1 wei", () => {
    expect(usdcToWei("0.000001")).toBe(1n);
  });

  it("converts 1234.567891 to 1234567891 wei", () => {
    expect(usdcToWei("1234.567891")).toBe(1234567891n);
  });

  it("converts 0 to 0n", () => {
    expect(usdcToWei("0")).toBe(0n);
  });
});

describe("weiToUsdc", () => {
  it("converts 100000 wei to 0.1 USDC", () => {
    expect(weiToUsdc(100000n)).toBe("0.1");
  });

  it("converts 1000000 wei to 1 USDC", () => {
    expect(weiToUsdc(1000000n)).toBe("1");
  });

  it("converts 1 wei to 0.000001 USDC", () => {
    expect(weiToUsdc(1n)).toBe("0.000001");
  });

  it("roundtrips 42.123456 USDC", () => {
    const amount = "42.123456";
    expect(weiToUsdc(usdcToWei(amount))).toBe(amount);
  });
});

describe("constants", () => {
  it("has correct USDC_DECIMALS", () => {
    expect(USDC_DECIMALS).toBe(6);
  });

  it("has correct default price", () => {
    expect(DEFAULT_CONSENT_PRICE_USDC).toBe("0.10");
  });

  it("has correct USDC address for Sepolia", () => {
    expect(USDC_ADDRESS_SEPOLIA).toBe("0x036CbD5386428872D267c415a6a3F10a6C85B5a");
  });

  it("has correct USDC address for Base Mainnet", () => {
    expect(USDC_ADDRESSES.baseMainnet).toBe("0x833589fCD6eDb6E08f4c7C32D4FaA7cBbFe9C7a0");
  });
});
