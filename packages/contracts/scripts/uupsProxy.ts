import { ethers} from "hardhat";

const TOKEN_NAME       = "Token";
const TOKEN_SYMBOL     = "TK";
const MAX_TOTAL_SUPPLY = 1000;

async function main() {
    const MyContract = await ethers.getContractFactory('Impresso');
    const ERC1967Proxy = await ethers.getContractFactory('UUPSProxy');

    const impl = await MyContract.deploy();
    await impl.waitForDeployment();

    const proxy = await ERC1967Proxy.deploy(
        await impl.getAddress(),
        MyContract.interface.encodeFunctionData('initialize', [TOKEN_NAME, TOKEN_SYMBOL, MAX_TOTAL_SUPPLY]),
    );
    await proxy.waitForDeployment();

    console.log("Impresso proxy deployed to:", await proxy.getAddress());
}

main().catch(console.error);