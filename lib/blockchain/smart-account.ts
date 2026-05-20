import {
  toMetaMaskSmartAccount,
  Implementation,
} from "@metamask/smart-accounts-kit";
import { createPublicClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "./chains";

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(process.env.BASE_SEPOLIA_RPC_URL),
});

export interface SmartAccountConfig {
  eoaPrivateKey: `0x${string}`;
}

export async function createSmartAccount(config: SmartAccountConfig) {
  const account = privateKeyToAccount(config.eoaPrivateKey);

  const smartAccount = await toMetaMaskSmartAccount({
    client: publicClient,
    implementation: Implementation.Hybrid,
    deployParams: [account.address, [], [], []],
    deploySalt: "0x",
    signer: { account },
  });

  return smartAccount;
}

export type SmartAccount = Awaited<ReturnType<typeof createSmartAccount>>;

export async function getSmartAccountAddress(config: SmartAccountConfig) {
  const smartAccount = await createSmartAccount(config);
  return smartAccount.address;
}

export async function isSmartAccountDeployed(config: SmartAccountConfig) {
  const smartAccount = await createSmartAccount(config);
  return smartAccount.isDeployed();
}

export async function deploySmartAccount(config: SmartAccountConfig) {
  const account = privateKeyToAccount(config.eoaPrivateKey);

  const smartAccount = await toMetaMaskSmartAccount({
    client: publicClient,
    implementation: Implementation.Hybrid,
    deployParams: [account.address, [], [], []],
    deploySalt: "0x",
    signer: { account },
  });

  return smartAccount;
}