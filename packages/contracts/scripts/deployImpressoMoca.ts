import { Contract } from 'ethers';
import { Initializable } from './../typechain-types/@openzeppelin/contracts-upgradeable/proxy/utils/Initializable';
import { ethers, upgrades } from "hardhat";

const TOKEN_NAME = "MOCABETA";
const TOKEN_SYMBOL = "MOCABETA";
const DECIMALS = 18; // Assuming 18 decimals for the token
const INITIAL_MINT_AMOUNT = BigInt(10000000000) * BigInt(10 ** DECIMALS);
const MAX_TOTAL_SUPPLY = BigInt(1000000000000) * BigInt(10 ** DECIMALS);
const PROPOSAL_THRESHOLD = 100; // Example threshold
const VOTING_PERIOD = 432000; // 5 days in seconds
const QUORUM_BPS = 1500; // 15%
const APPROVAL_THRESHOLD_BPS = 5000; // 50%

async function main() {
    const [deployer] = await ethers.getSigners();
    console.info("Deploying contracts with the account:", deployer.address);
    console.info("Account balance:", (await deployer.provider.getBalance(deployer.address)).toString());

    // Deploy ImpressoMoca implementation
    const ImpressoMoca = await ethers.getContractFactory("ImpressoMoca");

    const mocaImplementation = await ImpressoMoca.deploy();
    await mocaImplementation.waitForDeployment();
       
    // Deploy ImpressoGovernance
    const ImpressoGovernance = await ethers.getContractFactory("ImpressoGovernance");
    const governance = await ImpressoGovernance.deploy();
    await governance.waitForDeployment();

    const mocaProxy = await upgrades.deployProxy(
        ImpressoMoca, 
        [TOKEN_NAME, TOKEN_SYMBOL, MAX_TOTAL_SUPPLY, false, deployer.address], 
        { initializer: 'initialize', kind: 'uups' }
    );

    await mocaProxy.waitForDeployment();
    const tokenContract = ImpressoMoca.attach(await mocaProxy.getAddress());

    const governanceProxy = await upgrades.deployProxy(
        ImpressoGovernance, 
        [await tokenContract.getAddress(), PROPOSAL_THRESHOLD, VOTING_PERIOD, QUORUM_BPS, APPROVAL_THRESHOLD_BPS], 
        { initializer: 'initialize', kind: 'uups' }
    );

    await governanceProxy.waitForDeployment();
    const goverenceContract = ImpressoGovernance.attach(await governanceProxy.getAddress());

    // Grant DEFAULT_ADMIN_ROLE to the deployer explicitly
    await tokenContract.setGovernanceContract(await goverenceContract.getAddress());

    // Mint initial tokens
    await tokenContract.mint(deployer.address, INITIAL_MINT_AMOUNT);

    console.log("ImpressoMoca contract deployed to:", await mocaImplementation.getAddress());
    console.log("ImpressoMoca proxy deployed to:", await mocaProxy.getAddress());
    console.log("ImpressoGovernance deployed to:", await governance.getAddress());
    console.log("ImpressoGovernance proxy deployed to:", await governanceProxy.getAddress());
    console.log("Initial tokens minted to deployer:", INITIAL_MINT_AMOUNT);
    console.log("Deployer address:", deployer.address);
    console.log("Initial tokens minted to deployer:", INITIAL_MINT_AMOUNT);
    // console.log("Initial function encoded:", data);
}

main().catch(console.error);