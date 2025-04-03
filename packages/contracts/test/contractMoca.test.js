const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Moca Token Tests", function () {
  let impresso;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addr4;
  let addrs;

  const TOKEN_NAME = "Impresso Moca Token";
  const TOKEN_SYMBOL = "MOCA";
  const MAX_SUPPLY = ethers.parseEther("1000000"); // 1 million tokens
  const USE_MAX_SUPPLY = true;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3, addr4, ...addrs] = await ethers.getSigners();

    // Deploy base contracts
    const Impresso = await ethers.getContractFactory("ImpressoMoca");
    impresso = await upgrades.deployProxy(
      Impresso,
      [TOKEN_NAME, TOKEN_SYMBOL, MAX_SUPPLY, USE_MAX_SUPPLY, owner.address],
      { initializer: "initialize" }
    );

  });


  describe("AccessControl Initialization", function () {
    it("Should set up roles correctly", async function () {
      const MINTER_ROLE = await impresso.MINTER_ROLE();
      const PAUSER_ROLE = await impresso.PAUSER_ROLE();
      const BURNER_ROLE = await impresso.BURNER_ROLE();
      const UPGRADER_ROLE = await impresso.UPGRADER_ROLE();

      expect(await impresso.hasRole(MINTER_ROLE, owner.address)).to.be.true;
      expect(await impresso.hasRole(PAUSER_ROLE, owner.address)).to.be.true;
      expect(await impresso.hasRole(BURNER_ROLE, owner.address)).to.be.true;
      expect(await impresso.hasRole(UPGRADER_ROLE, owner.address)).to.be.true;
    });

    it("Should grant roles correctly", async function () {
      const MINTER_ROLE = await impresso.MINTER_ROLE();
      await impresso.grantRoleForAddress(addr1.address, "MINTER_ROLE");
      expect(await impresso.hasRole(MINTER_ROLE, addr1.address)).to.be.true;
    });

    it("Should prevent non-admin from granting roles", async function () {
      await expect(
        impresso.connect(addr1).grantRoleForAddress(addr2.address, "MINTER_ROLE")
      ).to.be.revertedWith(`AccessControl: account ${addr1.address.toString().toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`);
    });
  });

  describe("Commission System", function () {
    const commission1 = 5; // 5%
    const commission2 = 3; // 3%

    beforeEach(async function () {
      await impresso.setCommissionPercentages(
        [addr1.address, addr2.address],
        [commission1, commission2]
      );
      await impresso.mint(addr3.address, ethers.parseEther("1000"));
    });

    it("Should set commission percentages correctly", async function () {
      expect(await impresso.getCommissionPercentage(addr1.address)).to.equal(commission1);
      expect(await impresso.getCommissionPercentage(addr2.address)).to.equal(commission2);
    });

    it("Should handle transfers with commission", async function () {
      const amount = ethers.parseEther("100");

      await impresso.connect(addr3).transfer(addr4.address, amount);

      const commission1Amount = (amount * BigInt(commission1)) / 100n;
      const commission2Amount = (amount * BigInt(commission2)) / 100n;
      const finalAmount = amount - commission1Amount - commission2Amount;

      expect(await impresso.balanceOf(addr1.address)).to.equal(commission1Amount);
      expect(await impresso.balanceOf(addr2.address)).to.equal(commission2Amount);
      expect(await impresso.balanceOf(addr4.address)).to.equal(finalAmount);
    });

    it("Should handle transferFrom with commission", async function () {
      const amount = ethers.parseEther("100");
      await impresso.connect(addr3).approve(owner.address, amount);
      await impresso.transferFrom(addr3.address, addr4.address, amount);

      const commission1Amount = (amount * BigInt(commission1)) / 100n;
      const commission2Amount = (amount * BigInt(commission2)) / 100n;
      const finalAmount = amount - commission1Amount - commission2Amount;

      expect(await impresso.balanceOf(addr1.address)).to.equal(commission1Amount);
      expect(await impresso.balanceOf(addr2.address)).to.equal(commission2Amount);
      expect(await impresso.balanceOf(addr4.address)).to.equal(finalAmount);
    });

    it("Should toggle commission correctly", async function () {
      await impresso.toggleCommission(false);
      const amount = ethers.parseEther("100");
      await impresso.connect(addr3).transfer(addr4.address, amount);
      expect(await impresso.balanceOf(addr4.address)).to.equal(amount);
    });

    it("Should prevent commission percentage over 100%", async function () {
      await expect(
        impresso.setCommissionPercentages([addr3.address], [101])
      ).to.be.revertedWith("Total commission percentage exceeds 100%");
    });
  });

  describe("Burnable", function () {
    const amount = ethers.parseEther("100");

    beforeEach(async function () {
      // await impresso.mint(addr1.address, amount);
      await impresso.mint(addr1.address, amount);
    });

    it("Should allow token holder to burn their tokens", async function () {
      await impresso.connect(addr1).burn(amount);
      expect(await impresso.balanceOf(addr1.address)).to.equal(0);
    });

    it("Should prevent burning more than balance", async function () {
      await expect(
        impresso.connect(addr1).burn(amount + 1n)
      ).to.be.reverted;
    });

    it("Should prevent burning of token not from caller's own account", async function () {
// Ensure addr1 approves addr2 for the burnFrom operation
      await impresso.connect(addr1).approve(addr2.address, amount - 1n); // Insufficient allowance
      await expect(
        impresso.connect(addr2).burnFrom(addr1.address, amount)
      ).to.be.revertedWith("ERC20: insufficient allowance");
    });
  });

  describe("Upgradeable", function () {
    it("Should upgrade correctly", async function () {
      const ImpressoV2 = await ethers.getContractFactory("ImpressoMoca");
      const upgradedImpresso = await upgrades.upgradeProxy(impresso.target, ImpressoV2);
      expect(upgradedImpresso.target).to.equal(impresso.target);
    });

    it("Should prevent non-owner from upgrading", async function () {
      const ImpressoV2 = await ethers.getContractFactory("ImpressoMoca", addr1);
      await expect(
        upgrades.upgradeProxy(impresso.target, ImpressoV2)
      ).to.be.reverted;
    });
  });
});