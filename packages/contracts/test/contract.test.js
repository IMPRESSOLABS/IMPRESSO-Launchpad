const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("Impresso Token Tests", function () {
  let impresso;
  let impressoAC;
  let impressoVotable;
  let impressoVotableAC;
  let owner;
  let addr1;
  let addr2;
  let addr3;
  let addr4;
  let addrs;

  const TOKEN_NAME = "Impresso Token";
  const TOKEN_SYMBOL = "IMP";
  const MAX_SUPPLY = ethers.parseEther("1000000"); // 1 million tokens
  const USE_MAX_SUPPLY = true;

  beforeEach(async function () {
    [owner, addr1, addr2, addr3, addr4, ...addrs] = await ethers.getSigners();

    // Deploy base contracts
    const Impresso = await ethers.getContractFactory("Impresso");
    impresso = await upgrades.deployProxy(
      Impresso,
      [TOKEN_NAME, TOKEN_SYMBOL, MAX_SUPPLY, USE_MAX_SUPPLY, owner.address],
      { initializer: "initialize" }
    );

    const ImpressoAC = await ethers.getContractFactory("ImpressoAC");
    impressoAC = await upgrades.deployProxy(
      ImpressoAC,
      [TOKEN_NAME, TOKEN_SYMBOL, MAX_SUPPLY, USE_MAX_SUPPLY, owner.address],
      { initializer: "initialize" }
    );

    // Deploy votable contracts
    const ImpressoVotable = await ethers.getContractFactory("ImpressoVotable");
    impressoVotable = await upgrades.deployProxy(
      ImpressoVotable,
      [TOKEN_NAME, TOKEN_SYMBOL, MAX_SUPPLY, USE_MAX_SUPPLY, owner.address],
      { initializer: "initialize" }
    );

    const ImpressoVotableAC = await ethers.getContractFactory("ImpressoVotableAC");
    impressoVotableAC = await upgrades.deployProxy(
      ImpressoVotableAC,
      [TOKEN_NAME, TOKEN_SYMBOL, MAX_SUPPLY, USE_MAX_SUPPLY, owner.address],
      { initializer: "initialize" }
    );
  });

  describe("Initialization", function () {
    it("Should set the correct token name and symbol", async function () {
      expect(await impresso.name()).to.equal(TOKEN_NAME);
      expect(await impresso.symbol()).to.equal(TOKEN_SYMBOL);
    });

    it("Should set the correct max supply", async function () {
      const maxSupply = await impresso._maxTotalSupply();
      expect(maxSupply).to.equal(MAX_SUPPLY);
    });

    it("Should set the correct owner", async function () {
      expect(await impresso.owner()).to.equal(owner.address);
    });
  });

  describe("AccessControl Initialization", function () {
    it("Should set up roles correctly", async function () {
      const MINTER_ROLE = await impressoAC.MINTER_ROLE();
      const PAUSER_ROLE = await impressoAC.PAUSER_ROLE();
      const BURNER_ROLE = await impressoAC.BURNER_ROLE();
      const UPGRADER_ROLE = await impressoAC.UPGRADER_ROLE();

      expect(await impressoAC.hasRole(MINTER_ROLE, owner.address)).to.be.true;
      expect(await impressoAC.hasRole(PAUSER_ROLE, owner.address)).to.be.true;
      expect(await impressoAC.hasRole(BURNER_ROLE, owner.address)).to.be.true;
      expect(await impressoAC.hasRole(UPGRADER_ROLE, owner.address)).to.be.true;
    });

    it("Should grant roles correctly", async function () {
      const MINTER_ROLE = await impressoAC.MINTER_ROLE();
      await impressoAC.grantRoleForAddress(addr1.address, "MINTER_ROLE");
      expect(await impressoAC.hasRole(MINTER_ROLE, addr1.address)).to.be.true;
    });

    it("Should prevent non-admin from granting roles", async function () {
      await expect(
        impressoAC.connect(addr1).grantRoleForAddress(addr2.address, "MINTER_ROLE")
      ).to.be.revertedWith(`AccessControl: account ${addr1.address.toString().toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`);
    });
  });

  describe("Minting", function () {
    it("Should mint tokens correctly", async function () {
      const amount = ethers.parseEther("100");
      await impresso.mint(addr1.address, amount);
      expect(await impresso.balanceOf(addr1.address)).to.equal(amount);
    });

    it("Should respect max supply", async function () {
      const overMaxSupply = MAX_SUPPLY + 1n;
      await expect(
        impresso.mint(addr1.address, overMaxSupply)
      ).to.be.revertedWith("Exceeds maximum total supply");
    });

    it("Should prevent non-owner from minting", async function () {
      const amount = ethers.parseEther("100");
      await expect(
        impresso.connect(addr1).mint(addr2.address, amount)
      ).to.be.revertedWith("Ownable: caller is not the owner");
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

  describe("Pausable", function () {
    it("Should pause and unpause correctly", async function () {
      await impresso.pause();
      expect(await impresso.paused()).to.be.true;

      await expect(
        impresso.mint(addr1.address, ethers.parseEther("100"))
      ).to.be.revertedWith("Pausable: paused");

      await impresso.unpause();
      expect(await impresso.paused()).to.be.false;
    });

    it("Should prevent non-owner from pausing", async function () {
      await expect(
        impresso.connect(addr1).pause()
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("Voting System", function () {
    const votingTitle = "Test Voting";
    const votesNeeded = 2;

    beforeEach(async function () {
      await impressoVotable.createVoting(votingTitle, votesNeeded, 1); // PauseContract
    });

    it("Should create voting correctly", async function () {
      expect(await impressoVotable.isVotingActive(votingTitle)).to.be.true;
      expect(await impressoVotable.votesCountNeeded(votingTitle)).to.equal(votesNeeded);
    });

    it("Should handle voting process correctly", async function () {
      await impressoVotable.connect(addr1).vote(votingTitle);
      expect(await impressoVotable.totalVotes(votingTitle)).to.equal(1);

      await impressoVotable.connect(addr2).vote(votingTitle);
      expect(await impressoVotable.isVotingActive(votingTitle)).to.be.false;
      expect(await impressoVotable.paused()).to.be.true;
    });

    it("Should prevent double voting", async function () {
      await impressoVotable.connect(addr1).vote(votingTitle);
      await expect(
        impressoVotable.connect(addr1).vote(votingTitle)
      ).to.be.revertedWith("Already voted");
    });

    it("Should handle blacklisted voters correctly", async function () {
      await impressoVotable.blacklistVoter(addr1.address);
      await expect(
        impressoVotable.connect(addr1).vote(votingTitle)
      ).to.be.revertedWith("Not allowed to vote");
    });

    it("Should prevent voting on non-existent proposal", async function () {
      await expect(
        impressoVotable.connect(addr1).vote("Non-existent")
      ).to.be.revertedWith("Voting ended or not exists");
    });
  });

  describe("Burnable", function () {
    const amount = ethers.parseEther("100");

    beforeEach(async function () {
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
  });

  describe("Upgradeable", function () {
    it("Should upgrade correctly", async function () {
      const ImpressoV2 = await ethers.getContractFactory("Impresso");
      const upgradedImpresso = await upgrades.upgradeProxy(impresso.target, ImpressoV2);
      expect(upgradedImpresso.target).to.equal(impresso.target);
    });

    it("Should prevent non-owner from upgrading", async function () {
      const ImpressoV2 = await ethers.getContractFactory("Impresso", addr1);
      await expect(
        upgrades.upgradeProxy(impresso.target, ImpressoV2)
      ).to.be.reverted;
    });
  });
});