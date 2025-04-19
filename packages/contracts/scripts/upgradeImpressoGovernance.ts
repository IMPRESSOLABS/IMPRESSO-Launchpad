// Usage:
// npx hardhat run scripts/upgradeImpressoGovernance.ts --network <network> --proxy <PROXY_ADDRESS>

import { ethers, upgrades } from "hardhat";

async function main() {

  const proxyAddress = "0x3B13BFA8bDdc20549428b9cd9EBEc6907aFc1D95";

  // Get the contract factory for the new implementation
  const ImpressoGovernance = await ethers.getContractFactory("ImpressoGovernance");

  console.log("Upgrading ImpressoGovernance...");

  // Upgrade the proxy to the new implementation
  await upgrades.upgradeProxy(proxyAddress, ImpressoGovernance);

  console.log("ImpressoGovernance upgraded at proxy address:", proxyAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
