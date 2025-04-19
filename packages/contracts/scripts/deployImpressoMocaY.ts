import { Contract } from 'ethers';
import { Initializable } from '../typechain-types/@openzeppelin/contracts-upgradeable/proxy/utils/Initializable';
import { ethers } from "hardhat";

const TOKEN_NAME = "MOCABETX";
const TOKEN_SYMBOL = "MOCABETX";
const DECIMALS = 18; // Assuming 18 decimals for the token
const INITIAL_MINT_AMOUNT = BigInt(1000000000) * BigInt(10 ** DECIMALS);
const MAX_TOTAL_SUPPLY = BigInt(1000000000000) * BigInt(10 ** DECIMALS);
const PROPOSAL_THRESHOLD = 100; // Example threshold
const VOTING_PERIOD = 432000; // 5 days in seconds
const QUORUM_BPS = 1500; // 15%
const APPROVAL_THRESHOLD_BPS = 5000; // 50%

async function main() {
    const [deployer] = await ethers.getSigners();
    console.info("Deploying contracts with the account:", deployer.address);

    // Deploy ImpressoMoca implementation
    const ImpressoMoca = await ethers.getContractFactory("ImpressoMoca");
    const UUPSProxy = await ethers.getContractFactory("UUPSProxy");

    const mocaImplementation = await ImpressoMoca.deploy();
    await mocaImplementation.waitForDeployment();
       
   
    // Deploy ImpressoGovernance
    const ImpressoGovernance = await ethers.getContractFactory("ImpressoGovernance");
    const governance = await ImpressoGovernance.deploy();
    await governance.waitForDeployment();

    const data = mocaImplementation.interface.encodeFunctionData('initialize', [TOKEN_NAME, TOKEN_SYMBOL, MAX_TOTAL_SUPPLY, false, deployer.address]);
    const mocaProxy = await UUPSProxy.deploy(
        await mocaImplementation.getAddress(),
        data,
        deployer.address,
        await governance.getAddress()
    );

    await mocaProxy.waitForDeployment();
 
    // Initialize governance contract
    await governance.initialize(
        await mocaProxy.getAddress(),
        PROPOSAL_THRESHOLD,
        VOTING_PERIOD,
        QUORUM_BPS,
        APPROVAL_THRESHOLD_BPS
    );
    const tokenContract = ImpressoMoca.attach(await mocaProxy.getAddress());

    const DeployerIsAdmin = await tokenContract.hasRole(ethers.ZeroHash, deployer.address);

   if(!DeployerIsAdmin) console.error("Deployer does not have DEFAULT_ADMIN_ROLE in the implementation contract.");
    
    // Grant DEFAULT_ADMIN_ROLE to the deployer explicitly
    await tokenContract.setGovernanceContract(await governance.getAddress());

    // Mint initial tokens
    await tokenContract.mint(deployer.address, INITIAL_MINT_AMOUNT);

    console.log("ImpressoMoca contract deployed to:", await mocaImplementation.getAddress());
    console.log("ImpressoMoca proxy deployed to:", await mocaProxy.getAddress());
    console.log("ImpressoGovernance deployed to:", await governance.getAddress());
    console.log("Initial tokens minted to deployer:", INITIAL_MINT_AMOUNT);
    console.log("Deployer address:", deployer.address);
    console.log("Initial tokens minted to deployer:", INITIAL_MINT_AMOUNT);
    console.log("Initial function encoded:", data);
}

main().catch(console.error);