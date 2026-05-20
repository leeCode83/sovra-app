import { publicClient, getWalletClient } from "../client";

export const CONSENT_ENFORCER_ADDRESS = process.env.CONSENT_ENFORCER_ADDRESS || "0x0000000000000000000000000000000000000000";

export const CONSENT_ENFORCER_ABI = [
  {
    type: "function",
    name: "revoked",
    inputs: [{ name: "consentId", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "usageCount",
    inputs: [{ name: "delegationHash", type: "bytes32" }],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "isValid",
    inputs: [{ name: "consentId", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "consentOwners",
    inputs: [{ name: "consentId", type: "bytes32" }],
    outputs: [{ name: "", type: "address" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "authorizedInstitutions",
    inputs: [{ name: "institution", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "authorizedInstitutionsCount",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "revokeConsent",
    inputs: [{ name: "consentId", type: "bytes32" }],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "event",
    name: "ConsentRevoked",
    inputs: [{ name: "consentId", type: "bytes32", indexed: true }],
    anonymous: false,
  },
  {
    type: "event",
    name: "DelegationUsed",
    inputs: [
      { name: "delegationHash", type: "bytes32", indexed: true },
      { name: "remainingUses", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;

export interface ConsentStatus {
  isRevoked: boolean;
  isValid: boolean;
  owner?: `0x${string}`;
}

export interface BlockchainError {
  code: string;
  message: string;
  details?: unknown;
}

export async function getConsentStatus(consentId: `0x${string}`): Promise<ConsentStatus> {
  try {
    const [isRevoked, isValid, owner] = await Promise.all([
      publicClient.readContract({
        address: CONSENT_ENFORCER_ADDRESS as `0x${string}`,
        abi: CONSENT_ENFORCER_ABI,
        functionName: "revoked",
        args: [consentId],
      }),
      publicClient.readContract({
        address: CONSENT_ENFORCER_ADDRESS as `0x${string}`,
        abi: CONSENT_ENFORCER_ABI,
        functionName: "isValid",
        args: [consentId],
      }),
      publicClient.readContract({
        address: CONSENT_ENFORCER_ADDRESS as `0x${string}`,
        abi: CONSENT_ENFORCER_ABI,
        functionName: "consentOwners",
        args: [consentId],
      }),
    ]);
    return { isRevoked, isValid, owner: owner as `0x${string}` };
  } catch (error) {
    throw {
      code: "CONSENT_STATUS_ERROR",
      message: "Failed to fetch consent status from blockchain",
      details: error,
    } as BlockchainError;
  }
}

export async function getDelegationUsage(delegationHash: `0x${string}`): Promise<bigint> {
  try {
    return await publicClient.readContract({
      address: CONSENT_ENFORCER_ADDRESS as `0x${string}`,
      abi: CONSENT_ENFORCER_ABI,
      functionName: "usageCount",
      args: [delegationHash],
    });
  } catch (error) {
    throw {
      code: "DELEGATION_USAGE_ERROR",
      message: "Failed to fetch delegation usage from blockchain",
      details: error,
    } as BlockchainError;
  }
}

export async function isInstitutionAuthorized(institution: `0x${string}`): Promise<boolean> {
  try {
    return await publicClient.readContract({
      address: CONSENT_ENFORCER_ADDRESS as `0x${string}`,
      abi: CONSENT_ENFORCER_ABI,
      functionName: "authorizedInstitutions",
      args: [institution],
    });
  } catch (error) {
    throw {
      code: "INSTITUTION_CHECK_ERROR",
      message: "Failed to check institution authorization",
      details: error,
    } as BlockchainError;
  }
}

export async function getAuthorizedInstitutionsCount(): Promise<bigint> {
  try {
    return await publicClient.readContract({
      address: CONSENT_ENFORCER_ADDRESS as `0x${string}`,
      abi: CONSENT_ENFORCER_ABI,
      functionName: "authorizedInstitutionsCount",
      args: [],
    });
  } catch (error) {
    throw {
      code: "INSTITUTION_COUNT_ERROR",
      message: "Failed to fetch authorized institutions count",
      details: error,
    } as BlockchainError;
  }
}

export async function revokeOnChain(
  consentId: `0x${string}`,
  privateKey: `0x${string}`
): Promise<`0x${string}`> {
  try {
    const walletClient = getWalletClient(privateKey);
    const hash = await walletClient.writeContract({
      address: CONSENT_ENFORCER_ADDRESS as `0x${string}`,
      abi: CONSENT_ENFORCER_ABI,
      functionName: "revokeConsent",
      args: [consentId],
    });
    await publicClient.waitForTransactionReceipt({ hash });
    return hash;
  } catch (error) {
    throw {
      code: "REVOKE_ERROR",
      message: "Failed to revoke consent on blockchain",
      details: error,
    } as BlockchainError;
  }
}