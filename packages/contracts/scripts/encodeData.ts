import { encodeFunctionData } from 'viem';
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
    const contract = await ethers.getContractAt("ImpressoMoca", "0xA3D103769E4A4d03e6F556E82b9E1F5400b8bbD7"); // Replace with actual address

    // console.log("Encode function:", contract.interface.encodeFunctionData('initialize', [TOKEN_NAME, TOKEN_SYMBOL, MAX_TOTAL_SUPPLY, false, deployer.address]));
    const encodedData = contract.interface.encodeFunctionData('initialize',
        [TOKEN_NAME, TOKEN_SYMBOL, MAX_TOTAL_SUPPLY, false, deployer.address]
    );
    console.log("Encoded Data:", encodedData);
}

main().catch(console.error);