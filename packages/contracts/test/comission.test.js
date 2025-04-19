const { expect } = require("chai");
const { ethers } = require("hardhat");



describe("Comission", function() {
    let contract;
    let owner;
    let commissionAddress1;
    let commissionAddress2;
    let someUser;
    
    beforeEach(async function () {
        [owner, commissionAddress1, commissionAddress2, someUser] = await ethers.getSigners();
    
        const erc20base = await ethers.getContractFactory("ImpressoAC");
        contract = await upgrades.deployProxy(erc20base, ["contract", "TK", 0, false, owner.address], { initializer: 'initialize', kind: 'uups' });

        await contract.waitForDeployment();
    });

    describe("commission", function () {
        it("should calculate and distribute commission correctly on transfer", async function () {
            // Set commission percentages
            await contract.setCommissionPercentages([commissionAddress1.address, commissionAddress2.address], [10, 20]);
        
            // Enable commission
            await contract.toggleCommission(true);
        
            // Mint some tokens to owner
            await contract.mint(owner.address, 1000);
        
            // Transfer tokens from owner to another address
            await contract.transfer(someUser.address, 100);
        
            // Check balance of commissionAddress1
            const balanceCommissionAddress1 = await contract.balanceOf(commissionAddress1.address);
        
            expect(balanceCommissionAddress1).to.equal(10); // Commission should be 10% of 100
        
            // Check balance of commissionAddress2
            const balanceCommissionAddress2 = await contract.balanceOf(commissionAddress2.address);
            expect(balanceCommissionAddress2).to.equal(20); // Commission should be 20% of 100
        
            // Check balance of owner
            const balanceOwner = await contract.balanceOf(owner.address);
            expect(balanceOwner).to.equal(900); // 1000 - 100
        });
    
        it("should not distribute commission when commission is disabled", async function () {
            // Set commission percentages
            await contract.setCommissionPercentages([commissionAddress1.address], [10]);
        
            // Disable commission
            await contract.toggleCommission(false);
        
            // Mint some tokens to owner
            await contract.mint(owner.address, 1000);
        
            // Transfer tokens from owner to another address
            await contract.transfer(someUser.address, 100);
        
            // Check balance of commissionAddress1
            const balanceCommissionAddress1 = await contract.balanceOf(commissionAddress1.address);
            expect(balanceCommissionAddress1).to.equal(0); // No commission should be distributed
        
            // Check balance of owner
            const balanceOwner = await contract.balanceOf(owner.address);
            expect(balanceOwner).to.equal(900); // 1000 - 100 = 900
        });
    });
});