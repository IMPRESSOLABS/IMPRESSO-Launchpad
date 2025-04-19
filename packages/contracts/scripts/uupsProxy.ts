import { deploy } from "@openzeppelin/hardhat-upgrades/dist/utils";
import { ethers} from "hardhat";

const TOKEN_NAME       = "Token";
const TOKEN_SYMBOL     = "TK";
const MAX_TOTAL_SUPPLY = 1000;

async function main() {
    const [ deployer ] = await ethers.getSigners();
    const MyContract = await ethers.getContractFactory('Impresso');
    const ERC1967Proxy = await ethers.getContractFactory('UUPSProxy');

    const impl = await MyContract.deploy();
    await impl.waitForDeployment();

    const proxy = await ERC1967Proxy.deploy(
        await impl.getAddress(),
        MyContract.interface.encodeFunctionData('initialize', [TOKEN_NAME, TOKEN_SYMBOL, MAX_TOTAL_SUPPLY, false, deployer.address]),
        deployer.address
    );
    await proxy.waitForDeployment();

    console.log("Impresso proxy deployed to:", await proxy.getAddress());
}

main().catch(console.error);