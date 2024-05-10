
import { task } from "hardhat/config";


task("erc20votableDeploy", "Deploys erc20votable with args")
    .addPositionalParam("name")
    .addPositionalParam("symbol")
    .addPositionalParam("maxTotalSupply")
    .addPositionalParam("amountToMint")
    .setAction(async (taskArgs, {ethers, upgrades}) => {

        const [ deployer ] = await ethers.getSigners();

        console.log("Deployer:", deployer.address);

        const erc20votable = await ethers.getContractFactory("ImpressoVotable");

        const contract = await upgrades.deployProxy(erc20votable, [taskArgs.name, taskArgs.symbol, taskArgs.maxTotalSupply], { initializer: 'initialize', kind: 'uups' });

        await contract.waitForDeployment();

        await contract.mint(deployer.address, taskArgs.amountToMint);

        console.log("Contract address:", await contract.getAddress());
    }
);


