export { baseSepolia, baseMainnet, SUPPORTED_CHAINS, type SupportedChainId } from "./chains";
export { publicClient, getWalletClient, waitForTransaction } from "./client";
export {
  CONSENT_ENFORCER_ADDRESS,
  CONSENT_ENFORCER_ABI,
  type ConsentStatus,
  type BlockchainError,
  getConsentStatus,
  getDelegationUsage,
  isInstitutionAuthorized,
  getAuthorizedInstitutionsCount,
  revokeOnChain,
} from "./contracts/consent-enforcer";
export {
  type SmartAccountConfig,
  type SmartAccount,
  createSmartAccount,
  getSmartAccountAddress,
  isSmartAccountDeployed,
  deploySmartAccount,
} from "./smart-account";
export {
  USDC_ADDRESS_SEPOLIA,
  type DelegationParams,
  type DelegationResult,
  type DelegationError,
  createErc7710Delegation,
  parseUsdcAmount,
  formatUsdcAmount,
} from "./delegation";