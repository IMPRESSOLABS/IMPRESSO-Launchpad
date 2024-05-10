import { ethers, upgrades } from "hardhat";


const TOKEN_NAME       = "Token";
const TOKEN_SYMBOL     = "TK";
const MAX_TOTAL_SUPPLY = 1000;
const USE_MAX_TOTAL_SUPPLY = false;


async function main() {
    const erc20votable = await ethers.getContractFactory("ImpressoVotable");
    //address initialOwner, string memory name, string memory symbol
    const contract = await upgrades.deployProxy(erc20votable, [TOKEN_NAME, TOKEN_SYMBOL, MAX_TOTAL_SUPPLY, USE_MAX_TOTAL_SUPPLY], { initializer: 'initialize', kind: 'uups' });

    await contract.waitForDeployment();

    console.log("Impresso erc20votable deployed to:", await contract.getAddress());
}

main().catch(console.error);