
import { task } from "hardhat/config";


task("erc20baseDeploy", "Deploys erc20base with args")
    .addPositionalParam("name")
    .addPositionalParam("symbol")
    .addPositionalParam("maxTotalSupply")
    .addPositionalParam("amountToMint")
    .setAction(async (taskArgs, {ethers, upgrades}) => {
        const [ deployer ] = await ethers.getSigners();

        console.log("Deployer:", deployer.address);

        const erc20base = await ethers.getContractFactory("Impresso");

        const contract = await upgrades.deployProxy(erc20base, [taskArgs.name, taskArgs.symbol, taskArgs.maxTotalSupply], { initializer: 'initialize', kind: 'uups' });

        await contract.waitForDeployment();

        await contract.mint(deployer.address, taskArgs.amountToMint);

        console.log("Contract address:", await contract.getAddress());
    }
);


