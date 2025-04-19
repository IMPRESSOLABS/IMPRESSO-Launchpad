const { expect } = require("chai");
const { ethers, upgrades } = require("hardhat");

describe("ImpressoGovernance", function() {
  // Test constants matching those in deployment script
  const TOKEN_NAME = "MOCABETA";
  const TOKEN_SYMBOL = "MOCABETA";
  const DECIMALS = 18;
  const INITIAL_MINT_AMOUNT = BigInt(10000000000) * BigInt(10 ** DECIMALS);
  const MAX_TOTAL_SUPPLY = BigInt(1000000000000) * BigInt(10 ** DECIMALS);
  const PROPOSAL_THRESHOLD = 100;
  const VOTING_PERIOD = 432000; // 5 days in seconds
  const QUORUM_BPS = 1500; // 15%
  const APPROVAL_THRESHOLD_BPS = 5000; // 50%

  let deployer, user1, user2;
  let tokenContract, governanceContract;
  let mocaProxy, governanceProxy;
  const lockPeriod = 7 * 24 * 60 * 60; // 7 days in seconds

  beforeEach(async function() {
    [deployer, user1, user2] = await ethers.getSigners();
    
    // Deploy token contract
    const ImpressoMoca = await ethers.getContractFactory("ImpressoMoca");
    mocaProxy = await upgrades.deployProxy(
      ImpressoMoca, 
      [TOKEN_NAME, TOKEN_SYMBOL, MAX_TOTAL_SUPPLY, false, deployer.address],
      { initializer: 'initialize', kind: 'uups' }
    );
    await mocaProxy.waitForDeployment();
    tokenContract = ImpressoMoca.attach(await mocaProxy.getAddress());
    
    // Deploy governance contract
    const ImpressoGovernance = await ethers.getContractFactory("ImpressoGovernance");
    governanceProxy = await upgrades.deployProxy(
      ImpressoGovernance,
      [await tokenContract.getAddress(), PROPOSAL_THRESHOLD, VOTING_PERIOD, QUORUM_BPS, APPROVAL_THRESHOLD_BPS],
      { initializer: 'initialize', kind: 'uups' }
    );
    await governanceProxy.waitForDeployment();
    governanceContract = ImpressoGovernance.attach(await governanceProxy.getAddress());
    
    // Link governance to token
    await tokenContract.setGovernanceContract(await governanceContract.getAddress());
    
    // Mint tokens to test accounts
    await tokenContract.mint(deployer.address, INITIAL_MINT_AMOUNT);
    await tokenContract.transfer(user1.address, ethers.parseEther("1000000"));
    await tokenContract.transfer(user2.address, ethers.parseEther("500000"));
  });

  describe("Initialization", function() {
    it("should initialize with correct parameters", async function() {
      // Access token as property, not function
      const tokenAddress = await governanceContract.tokenAddress();
      expect(tokenAddress).to.equal(await tokenContract.getAddress());
      
      const threshold = await governanceContract.proposalThreshold();
      expect(threshold).to.equal(PROPOSAL_THRESHOLD);
      
      const votingPeriod = await governanceContract.votingPeriod();
      expect(votingPeriod).to.equal(VOTING_PERIOD);
      
      const quorum = await governanceContract.quorumBps();
      expect(quorum).to.equal(QUORUM_BPS);
      
      const approvalThreshold = await governanceContract.approvalThresholdBps();
      expect(approvalThreshold).to.equal(APPROVAL_THRESHOLD_BPS);
    });
    
    it("should connect token with governance contract", async function() {
      const governanceAddress = await tokenContract.governanceContract();
      expect(governanceAddress).to.equal(await governanceContract.getAddress());
    });
  });

  describe("Proposal Creation", function() {
    const proposalDescription = "Test proposal";
    
    it("should create a new proposal", async function() {
      const tx = await governanceContract.connect(deployer).createProposal(proposalDescription);
      const receipt = await tx.wait();
      const proposalId = receipt.events[0].args.proposalId;
      
      expect(await governanceContract.getProposalDescription(proposalId)).to.equal(proposalDescription);
      
      const proposal = await governanceContract.getProposal(proposalId);
      expect(proposal.executed).to.be.false;
    });
    
    it("should reject proposal from user without enough tokens", async function() {
      // Create a signer with no tokens
      const [_, __, ___, poorUser] = await ethers.getSigners();
      
      // Assuming minimum token threshold for creating proposals
      await expect(
        governanceContract.connect(poorUser).createProposal(proposalDescription)
      ).to.be.revertedWith("Insufficient tokens to create proposal");
    });
  });

  describe("Voting", function() {
    let proposalId;
    
    beforeEach(async function() {
      // Create a test proposal
      const tx = await governanceContract.connect(deployer).createProposal("Test proposal for voting");
      const receipt = await tx.wait();
      proposalId = receipt.events[0].args.proposalId;
    });
    
    it("should allow users to vote on proposals", async function() {
      await governanceContract.connect(user1).vote(proposalId, true); // Vote in favor
      await governanceContract.connect(user2).vote(proposalId, false); // Vote against
      
      const proposal = await governanceContract.getProposal(proposalId);
      expect(proposal.votesFor).to.be.gt(0);
      expect(proposal.votesAgainst).to.be.gt(0);
    });
    
    it("should not allow double voting", async function() {
      await governanceContract.connect(user1).vote(proposalId, true);
      
      await expect(
        governanceContract.connect(user1).vote(proposalId, true)
      ).to.be.revertedWith("Already voted");
    });
  });

  describe("Proposal Execution", function() {
    let proposalId;
    
    beforeEach(async function() {
      // Create proposal
      const tx = await governanceContract.connect(deployer).createProposal("Proposal to test execution");
      const receipt = await tx.wait();
      proposalId = receipt.events[0].args.proposalId;
      
      // Vote with enough tokens to pass
      await governanceContract.connect(deployer).vote(proposalId, true);
    });
    
    it("should execute successful proposals", async function() {
      // Fast-forward time to end voting period
      await ethers.provider.send("evm_increaseTime", [lockPeriod + 1]);
      await ethers.provider.send("evm_mine");
      
      await governanceContract.connect(deployer).executeProposal(proposalId);
      
      const proposal = await governanceContract.getProposal(proposalId);
      expect(proposal.executed).to.be.true;
    });
    
    it("should not execute proposals if voting period is not over", async function() {
      await expect(
        governanceContract.connect(deployer).executeProposal(proposalId)
      ).to.be.revertedWith("Voting period not over");
    });
    
    it("should not execute already executed proposals", async function() {
      // Fast-forward time
      await ethers.provider.send("evm_increaseTime", [lockPeriod + 1]);
      await ethers.provider.send("evm_mine");
      
      await governanceContract.connect(deployer).executeProposal(proposalId);
      
      await expect(
        governanceContract.connect(deployer).executeProposal(proposalId)
      ).to.be.revertedWith("Proposal already executed");
    });
  });

  describe("Governance Parameters", function() {
    it("should allow owner to update governance parameters", async function() {
      const newVotingPeriod = 600000;
      
      // Assuming there's an updateVotingPeriod function
      await governanceContract.connect(deployer).updateVotingPeriod(newVotingPeriod);
      
      expect(await governanceContract.votingPeriod()).to.equal(newVotingPeriod);
    });
    
    it("should get all proposal IDs", async function() {
      await governanceContract.connect(deployer).createProposal("Proposal 1");
      await governanceContract.connect(deployer).createProposal("Proposal 2");
      
      const proposalIds = await governanceContract.getAllProposalIds();
      expect(proposalIds.length).to.equal(2);
    });
  });
});