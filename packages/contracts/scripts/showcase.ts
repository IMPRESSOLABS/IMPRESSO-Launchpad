import { ethers, upgrades } from "hardhat";


async function main() {
    const [ deployer ] = await ethers.getSigners();
    const Impresso = await ethers.getContractFactory("Impresso");
    //address initialOwner, string memory name, string memory symbol
    const contract = await upgrades.deployProxy(Impresso, ["Token", "TK", 1000, true], { initializer: 'initialize', kind: 'uups' });

    await contract.waitForDeployment();

    console.log("Impresso deployed to:", await contract.getAddress());


    // check initial balance
    const initialBalance = await contract.balanceOf(deployer.address);
    console.log("Initial balance:", initialBalance.toString());

    // minting tokens
    await contract.mint(deployer.address, 100);

    // Check the balance after minting
    const finalBalance = await contract.balanceOf(deployer.address);
    console.log("Final balance:", finalBalance.toString());


    // perform an upgrade to ImpressoVotable
    const ImpressoVotable = await ethers.getContractFactory("ImpressoVotable");
    
    // upgrade
    const newContract = await upgrades.upgradeProxy(contract, ImpressoVotable);
    console.log("ImpressoVotable deployed to (should be the same as the prev one):", await newContract.getAddress())

    // Check the balance after minting
    const finalBalanceOnNewContract = await newContract.balanceOf(deployer.address);
    console.log("Final balance after upgrade:", finalBalanceOnNewContract.toString());
    console.log("Max total supply on new implementation:", await newContract._maxTotalSupply());
}

main().catch(console.error);