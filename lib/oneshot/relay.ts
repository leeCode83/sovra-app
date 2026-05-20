import { createPublicClient, http } from "viem";
import { baseSepolia } from "@/lib/blockchain/chains";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.BASE_SEPOLIA_RPC_URL),
});

const RELAYER_URL = "https://relayer.1shotapi.com";

export interface RelayerCapabilities {
  supportedChains: string[];
  acceptedTokens: string[];
  feeCollector: `0x${string}`;
  targetAddress: `0x${string}`;
}

export interface FeeData {
  gasPrice: string;
  rate: string;
  minFee: string;
  expiry: number;
  context: string;
}

export async function getRelayerCapabilities(chainId: string = "84532"): Promise<RelayerCapabilities> {
  const response = await fetch(`${RELAYER_URL}/relayers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "relayer_getCapabilities",
      params: { chainId },
    }),
  });

  const data = await response.json();
  return data.result as RelayerCapabilities;
}

export async function getFeeData(chainId: string = "84532", targetAddress: `0x${string}`): Promise<FeeData> {
  const response = await fetch(`${RELAYER_URL}/relayers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "relayer_getFeeData",
      params: {
        chainId,
        to: targetAddress,
        token: "0x036CbD5386428872D267c415a6a3F10a6C85B5a",
      },
    }),
  });

  const data = await response.json();
  return data.result as FeeData;
}

export interface RelayResult {
  txHash: string;
  delegationHash: `0x${string}`;
  status: "submitted" | "confirmed" | "failed";
  error?: string;
}

export async function relayDelegation(params: {
  chainId: string;
  delegation: unknown;
  signature: `0x${string}`;
  context: string;
  executions: Array<{ target: `0x${string}`; value: string; data: string }>;
  authorizationList?: Array<{ chainId: number; contractAddress: `0x${string}`; nonce: number }>;
  destinationUrl?: string;
}): Promise<RelayResult> {
  const response = await fetch(`${RELAYER_URL}/relayers`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "relayer_send7710Transaction",
      params: {
        chainId: params.chainId,
        context: params.context,
        destinationUrl: params.destinationUrl || "",
        authorizationList: params.authorizationList || [],
        transactions: [{
          permissionContext: [params.delegation as Record<string, unknown>, { signature: params.signature }],
          executions: params.executions,
        }],
      },
    }),
  });

  const data = await response.json();

  if (data.error) {
    return {
      txHash: "",
      delegationHash: "" as `0x${string}`,
      status: "failed",
      error: data.error.message || "Relay failed",
    };
  }

  return {
    txHash: data.result?.txHash || "",
    delegationHash: (params.delegation as { hash?: string })?.hash as `0x${string}` || "" as `0x${string}`,
    status: "submitted",
  };
}

export { publicClient };