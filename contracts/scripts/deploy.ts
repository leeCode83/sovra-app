import {ethers} from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  console.log("Balance:", (await deployer.provider.getBalance(deployer.address)).toString());

  const SovraConsentEnforcer = await ethers.getContractFactory("SovraConsentEnforcer");
  const enforcer = await SovraConsentEnforcer.deploy(deployer.address);

  await enforcer.waitForDeployment();
  const address = await enforcer.getAddress();

  console.log("SovraConsentEnforcer deployed to:", address);
  console.log("Owner:", await enforcer.owner());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
