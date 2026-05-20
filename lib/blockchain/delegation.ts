import {
  createDelegation,
  ScopeType,
  getSmartAccountsEnvironment,
} from "@metamask/smart-accounts-kit";
import { baseSepolia } from "./chains";

export const USDC_ADDRESS_SEPOLIA = "0x036CbD5386428872D267c415a6a3F10a6C85B5a" as const;

export interface DelegationParams {
  to: `0x${string}`;
  from: `0x${string}`;
  maxAmount: bigint;
}

export interface DelegationResult {
  delegation: ReturnType<typeof createDelegation>;
  signature: `0x${string}`;
}

export interface DelegationError {
  code: string;
  message: string;
  details?: unknown;
}

export async function createErc7710Delegation(
  smartAccount: {
    address: `0x${string}`;
    signDelegation: (params: { delegation: unknown }) => Promise<`0x${string}`>;
  },
  params: DelegationParams
): Promise<DelegationResult> {
  try {
    const environment = getSmartAccountsEnvironment(baseSepolia.id);

    const delegation = createDelegation({
      to: params.to,
      from: params.from,
      environment,
      scope: {
        type: ScopeType.Erc20TransferAmount,
        tokenAddress: USDC_ADDRESS_SEPOLIA,
        maxAmount: params.maxAmount,
      },
    });

    const signature = await smartAccount.signDelegation({ delegation });

    return { delegation, signature };
  } catch (error) {
    throw {
      code: "DELEGATION_ERROR",
      message: "Failed to create ERC-7710 delegation",
      details: error,
    } as DelegationError;
  }
}

export function parseUsdcAmount(amount: string): bigint {
  const value = parseFloat(amount);
  if (isNaN(value)) {
    throw new Error("Invalid USDC amount");
  }
  const decimals = 6;
  const [whole, fraction = ""] = amount.split(".");
  const paddedFraction = fraction.padEnd(decimals, "0").slice(0, decimals);
  return BigInt(whole + paddedFraction);
}

export function formatUsdcAmount(amount: bigint): string {
  const decimals = 6;
  const amountStr = amount.toString().padStart(decimals + 1, "0");
  const whole = amountStr.slice(0, -decimals) || "0";
  const fraction = amountStr.slice(-decimals);
  return `${whole}.${fraction}`;
}