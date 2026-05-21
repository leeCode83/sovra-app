export const USDC_DECIMALS = 6;
export const DEFAULT_CONSENT_PRICE_USDC = process.env.DEFAULT_CONSENT_PRICE_USDC || "0.10";

export const USDC_ADDRESS_SEPOLIA = (process.env.USDC_ADDRESS_SEPOLIA || "0x036CbD5386428872D267c415a6a3F10a6C85B5a") as `0x${string}`;
export const USDC_ADDRESS_MAINNET = (process.env.USDC_ADDRESS_MAINNET || "0x833589fCD6eDb6E08f4c7C32D4FaA7cBbFe9C7a0") as `0x${string}`;

export function usdcToWei(amount: string): bigint {
  const [whole, fraction = ""] = amount.split(".");
  const padded = fraction.padEnd(USDC_DECIMALS, "0").slice(0, USDC_DECIMALS);
  return BigInt(whole + padded);
}

export function weiToUsdc(amount: bigint): string {
  const str = amount.toString().padStart(USDC_DECIMALS + 1, "0");
  const whole = str.slice(0, -USDC_DECIMALS) || "0";
  const fraction = str.slice(-USDC_DECIMALS);
  return `${whole}.${fraction}`.replace(/\.?0+$/, "");
}

export const USDC_ADDRESSES = {
  baseSepolia: (process.env.USDC_ADDRESS_SEPOLIA || "0x036CbD5386428872D267c415a6a3F10a6C85B5a") as `0x${string}`,
  baseMainnet: (process.env.USDC_ADDRESS_MAINNET || "0x833589fCD6eDb6E08f4c7C32D4FaA7cBbFe9C7a0") as `0x${string}`,
};