import { usdcToWei, USDC_ADDRESS_SEPOLIA } from "@/lib/payment/usdc";

export const x402Config = {
  facilitatorUrl: process.env.X402_FACILITATOR_URL || "https://facilitator.x402.org",
  resourceWallet: (process.env.RESOURCE_WALLET_ADDRESS || "") as `0x${string}`,
  network: "eip155:84532" as const,
  consentPriceWei: usdcToWei("0.10"),
  consentPriceUsdc: "0.10",
  usdcAddress: USDC_ADDRESS_SEPOLIA,
};

export interface PaymentRequirements {
  scheme: "exact";
  price: string;
  network: string;
  maxAmountRequired: string;
  asset: `0x${string}`;
  payTo: `0x${string}`;
  resource: string;
  description: string;
}

export function createPaymentRequirements(resource: string): PaymentRequirements {
  return {
    scheme: "exact",
    price: x402Config.consentPriceUsdc,
    network: x402Config.network,
    maxAmountRequired: x402Config.consentPriceWei.toString(),
    asset: x402Config.usdcAddress,
    payTo: x402Config.resourceWallet,
    resource,
    description: "Consent request payment for medical data access",
  };
}

export function encodePaymentRequirements(requirements: PaymentRequirements): string {
  return Buffer.from(JSON.stringify(requirements)).toString("base64");
}

export function decodePaymentRequirements(header: string | null): PaymentRequirements | null {
  if (!header) return null;
  try {
    return JSON.parse(Buffer.from(header, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

export function isX402PaymentValid(requirements: PaymentRequirements, amount: string): boolean {
  const paidWei = BigInt(amount);
  return paidWei >= BigInt(requirements.maxAmountRequired);
}