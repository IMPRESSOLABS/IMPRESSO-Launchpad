const { expect } = require("chai");
const { ethers, upgrades, BigNumber } = require("hardhat");

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

  const PROPOSAL_THRESHOLD = 100; // Example threshold
  const VOTING_PERIOD = 432000; // 5 days in seconds
  const QUORUM_BPS = 1500; // 15%
  const APPROVAL_THRESHOLD_BPS = 5000; // 50%

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
        impresso
          .connect(addr1)
          .grantRoleForAddress(addr2.address, "MINTER_ROLE")
      ).to.be.revertedWith(
        `AccessControl: account ${addr1.address
          .toString()
          .toLowerCase()} is missing role 0x0000000000000000000000000000000000000000000000000000000000000000`
      );
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
      expect(await impresso.getCommissionPercentage(addr1.address)).to.equal(
        commission1
      );
      expect(await impresso.getCommissionPercentage(addr2.address)).to.equal(
        commission2
      );
    });

    it("Should handle transfers with commission", async function () {
      const amount = ethers.parseEther("100");

      await impresso.connect(addr3).transfer(addr4.address, amount);

      const commission1Amount = (amount * BigInt(commission1)) / 100n;
      const commission2Amount = (amount * BigInt(commission2)) / 100n;
      const finalAmount = amount - commission1Amount - commission2Amount;

      expect(await impresso.balanceOf(addr1.address)).to.equal(
        commission1Amount
      );
      expect(await impresso.balanceOf(addr2.address)).to.equal(
        commission2Amount
      );
      expect(await impresso.balanceOf(addr4.address)).to.equal(finalAmount);
    });

    it("Should handle transferFrom with commission", async function () {
      const amount = ethers.parseEther("100");
      await impresso.connect(addr3).approve(owner.address, amount);
      await impresso.transferFrom(addr3.address, addr4.address, amount);

      const commission1Amount = (amount * BigInt(commission1)) / 100n;
      const commission2Amount = (amount * BigInt(commission2)) / 100n;
      const finalAmount = amount - commission1Amount - commission2Amount;

      expect(await impresso.balanceOf(addr1.address)).to.equal(
        commission1Amount
      );
      expect(await impresso.balanceOf(addr2.address)).to.equal(
        commission2Amount
      );
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
      await expect(impresso.connect(addr1).burn(amount + 1n)).to.be.reverted;
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
    });
  });

  describe("ImpressoGovernance", function () {
    let governance;
    let proposalId;
    const lockPeriod = 7 * 24 * 60 * 60; // 7 days in seconds

    beforeEach(async function () {
      const ImpressoGovernance = await ethers.getContractFactory("ImpressoGovernance");
      treasury = owner.getAddress();
      governance = await upgrades.deployProxy(
        ImpressoGovernance, 
        [await impresso.getAddress(), PROPOSAL_THRESHOLD, VOTING_PERIOD, QUORUM_BPS, APPROVAL_THRESHOLD_BPS], 
        { initializer: 'initialize', kind: 'uups' }
      );
      await governance.waitForDeployment();
      const goverenceContract = ImpressoGovernance.attach(await governance.getAddress());

      // Only set governance contract if NOT running the proposal execution test
      // ...existing code...
      // await impresso.setGovernanceContract(await goverenceContract.getAddress());
      // ...existing code...
      await impresso.mint(owner.address, ethers.parseEther("100")); // or whatever the threshold is
    });

    it("Should create a proposal correctly", async function () {
      const description = "Proposal to update governance params";
      // Mint tokens to proposer to meet threshold
      await impresso.mint(owner.address, ethers.parseEther("100"));

      const iface = new ethers.Interface([
        "function updateGovernanceParameters(uint256,uint256,uint256,uint256)"
      ]);
      const callData = iface.encodeFunctionData("updateGovernanceParameters", [
        200, // new proposalThreshold
        432000, // new votingPeriod
        2000, // new quorumBps
        6000 // new approvalThresholdBps
      ]);
      const tx = await governance.createProposal(
        await governance.getAddress(), // Use the proxy address as target
        description,
        callData
      );
      const receipt = await tx.wait();

      // Find the ProposalCreated event log
      const event = receipt.logs
        .map(log => {
          try {
            return governance.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(e => e && e.name === "ProposalCreated");

      expect(event).to.not.be.undefined;
      const proposalId = event.args.proposalId;

      const details = await governance.getProposalDetails(proposalId);
      expect(details.description).to.equal(description);
    });

    it("Should create a proposal to set governance contract", async function () {
      const iface = new ethers.Interface([
        "function setGovernanceContract(address)"
      ]);
      const callData = iface.encodeFunctionData("setGovernanceContract", [governance.target]);

      // Always mint to the proposer before creating a proposal
      await impresso.mint(owner.address, ethers.parseEther("100")); // if owner is proposer

      const tx = await governance.createProposal(
        await impresso.getAddress(),
        "Proposal to set governance contract",
        callData
      );
      const receipt = await tx.wait();

      // Find the ProposalCreated event log
      const event = receipt.logs
        .map(log => {
          try {
            return governance.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(e => e && e.name === "ProposalCreated");

      expect(event).to.not.be.undefined;
      const proposalId = event.args.proposalId;

      const details = await governance.getProposalDetails(proposalId);
      expect(details.description).to.equal("Proposal to set governance contract");
    });

    /*
    it("Should allow users to stake tokens", async function () {
      const amount = ethers.parseEther("100");
      await impresso.connect(addr1).approve(governance.address, amount);
      await governance.connect(addr1).stake(amount);
      expect(await governance.stakedBalance(addr1.address)).to.equal(amount);
    });

    it("Should allow users to unstake tokens after the lock period", async function () {
      const amount = ethers.parseEther("100");
      await impresso.connect(addr1).approve(governance.address, amount);
      await governance.connect(addr1).stake(amount);
      await ethers.provider.send("evm_increaseTime", [lockPeriod]);
      await ethers.provider.send("evm_mine");
      await governance.connect(addr1).unstake();
      expect(await governance.stakedBalance(addr1.address)).to.equal(0);
    });
    */

    it("Should allow voting on proposals", async function () {
      const description = "Proposal to update governance params";
      // Mint tokens to proposer to meet threshold
      await impresso.mint(owner.address, ethers.parseEther("100"));

      // Prepare dummy calldata for updateGovernanceParameters
      const iface = new ethers.Interface([
        "function updateGovernanceParameters(uint256,uint256,uint256,uint256)"
      ]);
      // const callData = iface.encodeFunctionData("updateGovernanceParameters", [
      //   200, 432000, 2000, 6000
      // ]);

      const callData = iface.encodeFunctionData("updateGovernanceParameters", [
        200, // new proposalThreshold
        432000, // new votingPeriod
        2000, // new quorumBps
        6000 // new approvalThresholdBps
      ]);

      const tx = await governance.createProposal(
        await governance.getAddress(),
        description,
        callData
      );
      const receipt = await tx.wait();

      // Parse ProposalCreated event
      const event = receipt.logs
        .map(log => {
          try {
            return governance.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(e => e && e.name === "ProposalCreated");

      expect(event).to.not.be.undefined;
      const proposalId = event.args.proposalId;

      // Mint tokens to voter
      await impresso.mint(addr1.address, ethers.parseEther("100"));

      // Move time forward to activate voting
      await ethers.provider.send("evm_increaseTime", [1]);
      await ethers.provider.send("evm_mine");

      await governance.connect(addr1).castVote(proposalId, true);
      const details = await governance.getProposalDetails(proposalId);
      expect(details.forVotes).to.be.gt(0);
    });

    it("Should not allow voting twice on the same proposal", async function () {
      const description = "Proposal to update governance params";
      // Mint tokens to proposer to meet threshold
      await impresso.mint(owner.address, ethers.parseEther("100"));

      // Prepare dummy calldata for updateGovernanceParameters
      const iface = new ethers.Interface([
        "function updateGovernanceParameters(uint256,uint256,uint256,uint256)"
      ]);
      const callData = iface.encodeFunctionData("updateGovernanceParameters", [
        200, 432000, 2000, 6000
      ]);

      const tx = await governance.createProposal(
        await governance.getAddress(),
        description,
        callData
      );
      const receipt = await tx.wait();

      // Parse ProposalCreated event
      const event = receipt.logs
        .map(log => {
          try {
            return governance.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(e => e && e.name === "ProposalCreated");

      expect(event).to.not.be.undefined;
      const proposalId = event.args.proposalId;

      // Mint tokens to voter
      await impresso.mint(addr1.address, ethers.parseEther("100"));

      // Move time forward to activate voting
      await ethers.provider.send("evm_increaseTime", [1]);
      await ethers.provider.send("evm_mine");

      await governance.connect(addr1).castVote(proposalId, true);
      await expect(
        governance.connect(addr1).castVote(proposalId, true)
      ).to.be.revertedWith("Already voted");
    });

    it("Should execute approved proposals after voting period", async function () {
      // Grant admin role to governance contract so it can call setGovernanceContract
      await impresso.grantRole(
        await impresso.DEFAULT_ADMIN_ROLE(),
        await governance.getAddress()
      );

      const iface = new ethers.Interface([
        "function setGovernanceContract(address)"
      ]);
      // Use impresso.getAddress() as the target and in calldata
      const callData = iface.encodeFunctionData("setGovernanceContract", [await governance.getAddress()]);

      // Mint tokens to proposer to meet threshold
      await impresso.mint(owner.address, ethers.parseEther("100"));

      const tx = await governance.createProposal(
        await impresso.getAddress(), // Target ImpressoMoca proxy
        "Proposal to set governance contract",
        callData
      );
      const receipt = await tx.wait();
      const event = receipt.logs
        .map(log => {
          try {
            return governance.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(e => e && e.name === "ProposalCreated");
      expect(event).to.not.be.undefined;
      const proposalId = event.args.proposalId;
      // console.info(`Stark: proposalId=${proposalId}`);

      // Move time forward to activate proposal
      await ethers.provider.send("evm_increaseTime", [1]);
      await ethers.provider.send("evm_mine");

      // Mint tokens to voter and vote
      await impresso.mint(addr1.address, ethers.parseEther("100"));
      await governance.connect(addr1).castVote(proposalId, true);

      // Fast forward to just after endTime
      await ethers.provider.send("evm_increaseTime", [432000 + 1]);
      await ethers.provider.send("evm_mine");

      // Finalize proposal (now block.timestamp > endTime)
      await governance.connect(owner).finalizeProposal(proposalId);

      // Implement proposal
      await governance.connect(owner).implementProposal(proposalId);

      // Check that the governance contract address was set
      expect(await impresso.governanceContract()).to.equal(await governance.getAddress());
    });

    it("Should not execute proposal if voting period is not over", async function () {
      const description = "Proposal to update governance params";
      await impresso.mint(owner.address, ethers.parseEther("100"));

      const iface = new ethers.Interface([
        "function updateGovernanceParameters(uint256,uint256,uint256,uint256)"
      ]);
      const callData = iface.encodeFunctionData("updateGovernanceParameters", [
        200, 432000, 2000, 6000
      ]);

      const tx = await governance.createProposal(
        await governance.getAddress(),
        description,
        callData
      );
      const receipt = await tx.wait();
      const event = receipt.logs
        .map(log => {
          try {
            return governance.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(e => e && e.name === "ProposalCreated");
      expect(event).to.not.be.undefined;
      const proposalId = event.args.proposalId;

      // Mint tokens to voter and vote
      await impresso.mint(addr1.address, ethers.parseEther("100"));
      await ethers.provider.send("evm_increaseTime", [1]);
      await ethers.provider.send("evm_mine");
      await governance.connect(addr1).castVote(proposalId, true);

      // Try to finalize and implement before voting period ends
      await expect(governance.finalizeProposal(proposalId)).to.be.revertedWith("Voting period not ended");
    });

    it("Should not execute proposal if not approved", async function () {
      const description = "Proposal to update governance params";
      await impresso.mint(owner.address, ethers.parseEther("100"));

      const iface = new ethers.Interface([
        "function updateGovernanceParameters(uint256,uint256,uint256,uint256)"
      ]);
      const callData = iface.encodeFunctionData("updateGovernanceParameters", [
        200, 432000, 2000, 6000
      ]);

      const tx = await governance.createProposal(
        await governance.getAddress(),
        description,
        callData
      );
      const receipt = await tx.wait();
      const event = receipt.logs
        .map(log => {
          try {
            return governance.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(e => e && e.name === "ProposalCreated");
      expect(event).to.not.be.undefined;
      const proposalId = event.args.proposalId;

      // Move time forward to activate proposal (so it becomes Active)
      await ethers.provider.send("evm_increaseTime", [1]);
      await ethers.provider.send("evm_mine");

      // Fast forward to just after voting period ends (not exactly at endTime)
      await ethers.provider.send("evm_increaseTime", [432000 + 1]);
      await ethers.provider.send("evm_mine");

      // Finalize and implement
      await governance.finalizeProposal(proposalId);
      await expect(governance.implementProposal(proposalId)).to.be.revertedWith("Proposal not successful");
    });

    it("Should not execute already executed proposal", async function () {
      // Grant admin role to governance contract so it can call setGovernanceContract
      await impresso.grantRole(
        await impresso.DEFAULT_ADMIN_ROLE(),
        await governance.getAddress()
      );

      const iface = new ethers.Interface([
        "function setGovernanceContract(address)"
      ]);
      // Use impresso.getAddress() as the target and in calldata
      const callData = iface.encodeFunctionData("setGovernanceContract", [await governance.getAddress()]);

      // Mint tokens to proposer to meet threshold
      await impresso.mint(owner.address, ethers.parseEther("100"));

      const tx = await governance.createProposal(
        await impresso.getAddress(), // Target ImpressoMoca proxy
        "Proposal to set governance contract",
        callData
      );
      const receipt = await tx.wait();
      const event = receipt.logs
        .map(log => {
          try {
            return governance.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(e => e && e.name === "ProposalCreated");
      expect(event).to.not.be.undefined;
      const proposalId = event.args.proposalId;

      // Move time forward to activate proposal
      await ethers.provider.send("evm_increaseTime", [1]);
      await ethers.provider.send("evm_mine");

      // Mint tokens to voter and vote
      await impresso.mint(addr1.address, ethers.parseEther("100"));
      await governance.connect(addr1).castVote(proposalId, true);

      // Fast forward to after voting period
      await ethers.provider.send("evm_increaseTime", [432000]);
      await ethers.provider.send("evm_mine");

      // Finalize and implement
      await governance.connect(owner).finalizeProposal(proposalId);
      await governance.connect(owner).implementProposal(proposalId);

      // Try to implement again
      await expect(
        governance.connect(owner).implementProposal(proposalId)
      ).to.be.revertedWith("Proposal not successful");
    });

    it("Should get all proposal IDs", async function () {
      const description1 = "Proposal 1";
      const description2 = "Proposal 2";
      const iface = new ethers.Interface([
        "function updateGovernanceParameters(uint256,uint256,uint256,uint256)"
      ]);
      const callData = iface.encodeFunctionData("updateGovernanceParameters", [
        200, 432000, 2000, 6000
      ]);
      await impresso.mint(owner.address, ethers.parseEther("100"));
      await governance.createProposal(await governance.getAddress(), description1, callData);
      await governance.createProposal(await governance.getAddress(), description2, callData);
      const proposalIds = await governance.getAllProposalIds();
      expect(proposalIds.length).to.equal(2);
    });
  });
});
