import { deploy } from '@openzeppelin/hardhat-upgrades/dist/utils';
import { ethers, upgrades, run } from "hardhat";
import { Interface } from "ethers";
import { erc20 } from '../typechain-types/@openzeppelin/contracts-upgradeable/token';

const TOKEN_NAME       = "MOCABETAX";
const TOKEN_SYMBOL     = "MOCABETAX";
const MAX_TOTAL_SUPPLY = BigInt(100000000);
const USE_MAX_TOTAL_SUPPLY = false;
const MINT_AMOUNT = BigInt(1000000); // Amount to mint for testing  

// Helper function to decode custom errors
function decodeError(returnData: string, contractInterface: Interface) {
    try {
        const decodedError = contractInterface.parseError(returnData);
        console.error("Decoded Error:", decodedError);
    } catch (err) {
        console.error("Failed to decode error:", err);
    }
}

async function main() {
    const [ deployer ] = await ethers.getSigners();

    console.log("Deployer address:", deployer.address);
    console.log("Deploying ImpressoAC with arguments:");
    console.log("TOKEN_NAME:", TOKEN_NAME);
    console.log("TOKEN_SYMBOL:", TOKEN_SYMBOL);
    console.log("MAX_TOTAL_SUPPLY:", BigInt(MAX_TOTAL_SUPPLY));
    console.log("USE_MAX_TOTAL_SUPPLY:", USE_MAX_TOTAL_SUPPLY);

    // Deploy ImpressoAC
    const erc20base = await ethers.getContractFactory("ImpressoMoca");

    // Ensure the arguments match the `initialize` function in the ImpressoAC contract
   /* const erc20Contract = await upgrades.deployProxy(
        erc20base, 
        [TOKEN_NAME, TOKEN_SYMBOL, MAX_TOTAL_SUPPLY, USE_MAX_TOTAL_SUPPLY, deployer.address], 
        { initializer: 'initialize', kind: 'uups' }
    ); */
    const erc20Contract = await erc20base.deploy();
    await erc20Contract.waitForDeployment();
    console.log("Impresso erc20base deployed to:", await erc20Contract.getAddress());

    // Deploy ImpressoGovernance
    const governanceFactory = await ethers.getContractFactory("ImpressoGovernance");
    /*const governanceContract = await upgrades.deployProxy(
        governanceFactory, 
        [
            await erc20Contract.getAddress(), // _tokenAddress
            1000,                            // _proposalThreshold
            432000,                          // _votingPeriod (5 days in seconds)
            1500,                            // _quorumBps (15%)
            5000                             // _approvalThresholdBps (50%)
        ], 
        { initializer: 'initialize', kind: 'uups' }
    ); */
    const governanceContract = await governanceFactory.deploy();
    await governanceContract.waitForDeployment();
    console.log("ImpressoGovernance deployed to:", await governanceContract.getAddress());

    const params = erc20base.interface.encodeFunctionData('initialize',[TOKEN_NAME, TOKEN_SYMBOL, MAX_TOTAL_SUPPLY, USE_MAX_TOTAL_SUPPLY, deployer.address]);
    // Deploy custom UUPSProxy
    console.log("Deploying custom UUPSProxy...");
    const uupsProxyFactory = await ethers.getContractFactory("UUPSProxy");
    const uupsProxy = await uupsProxyFactory.deploy(
        await erc20Contract.getAddress(), // Logic contract address
        params,
        deployer.address,
        await governanceContract.getAddress(), // Admin address
                     
    );

    await uupsProxy.waitForDeployment();
    console.log("Custom UUPSProxy deployed to:", await uupsProxy.getAddress());


    const tx = await erc20Contract.mint(deployer, MINT_AMOUNT);
    await tx.wait();

   // let dataCallback;
    // const proposal = await governanceContract.createProposal(await erc20Contract.getAddress(), `Propose to mint: {MINT_AMOUNT}`, dataCallback);
    //console.log("Proposal created:", proposal);
    // Debugging logs for UUPSProxy arguments
    const tokenAddress = await erc20Contract.getAddress();
    console.log("Token Address for UUPSProxy:", tokenAddress);
    console.log("Deployer Address for UUPSProxy:", deployer.address);
}

main().catch(console.error);