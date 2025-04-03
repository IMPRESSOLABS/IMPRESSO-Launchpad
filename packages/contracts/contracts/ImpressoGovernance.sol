// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/IERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

/**
 * @title ImpressoGovernance
 * @notice Governance contract for ImpressoAC token
 * @dev Allows token holders to vote on proposals, with owner having final implementation authority
 */
contract ImpressoGovernance is 
    Initializable, 
    OwnableUpgradeable, 
    ReentrancyGuardUpgradeable, 
    PausableUpgradeable,
    UUPSUpgradeable
{
    /// @notice ImpressoAC token contract
    address public tokenAddress;
    
    /// @notice Minimum token balance required to create a proposal
    uint256 public proposalThreshold;
    
    /// @notice Duration of voting period in seconds
    uint256 public votingPeriod;
    
    /// @notice Percentage of total supply required for quorum (in basis points, e.g. 1500 = 15%)
    uint256 public quorumBps;
    
    /// @notice Percentage of votes required for proposal to pass (in basis points, e.g. 5000 = 50%)
    uint256 public approvalThresholdBps;
    
    /// @notice Counter for proposal IDs
    uint256 private _proposalIdCounter;
    
    /// @notice Proposal states
    enum ProposalState {
        Pending,    // Waiting for voting to start
        Active,     // Voting is active
        Defeated,   // Failed to reach quorum or majority
        Succeeded,  // Passed voting
        Implemented,// Implemented by owner
        Rejected    // Owner rejected implementation
    }
    
    /// @notice Proposal structure
    struct Proposal {
        uint256 id;
        address proposer;
        string description;
        bytes callData;           // The function call to execute
        address targetContract;   // Contract to call
        uint256 startTime;        // When voting begins
        uint256 endTime;          // When voting ends
        uint256 forVotes;         // Votes in favor
        uint256 againstVotes;     // Votes against
        bool passed;              // Whether passed community vote
        bool implemented;         // Whether implemented by owner
        string rejectionReason;   // If not implemented, why
        mapping(address => bool) hasVoted; // Track who has voted
    }
    
    /// @notice Mapping of proposal ID to proposal
    mapping(uint256 => Proposal) public proposals;
    
    /// @notice Array of all proposal IDs
    uint256[] public proposalIds;
    
    // Events
    event ProposalCreated(
        uint256 indexed proposalId,
        address indexed proposer,
        address targetContract,
        string description,
        uint256 startTime,
        uint256 endTime
    );
    
    event VoteCast(
        uint256 indexed proposalId,
        address indexed voter,
        bool support,
        uint256 weight
    );
    
    event ProposalStatusChanged(
        uint256 indexed proposalId,
        ProposalState state
    );
    
    event ProposalImplemented(
        uint256 indexed proposalId
    );
    
    event ProposalRejected(
        uint256 indexed proposalId,
        string reason
    );
    
    event GovernanceParametersUpdated(
        uint256 proposalThreshold,
        uint256 votingPeriod,
        uint256 quorumBps,
        uint256 approvalThresholdBps
    );
    
    /**
     * @notice Initialize the governance contract
     * @param _tokenAddress Address of the ImpressoAC token
     * @param _proposalThreshold Minimum tokens required to create proposal
     * @param _votingPeriod Duration of voting in seconds (e.g., 5 days = 432000)
     * @param _quorumBps Quorum basis points (e.g., 1500 = 15%)
     * @param _approvalThresholdBps Approval threshold basis points (e.g., 5000 = 50%)
     */
    function initialize(
        address _tokenAddress,
        uint256 _proposalThreshold,
        uint256 _votingPeriod,
        uint256 _quorumBps,
        uint256 _approvalThresholdBps
    ) public initializer {
        require(_tokenAddress != address(0), "Token address cannot be zero");
        require(_quorumBps <= 10000, "Quorum cannot exceed 100%");
        require(_approvalThresholdBps <= 10000, "Approval threshold cannot exceed 100%");
        
        __Ownable_init();
        __ReentrancyGuard_init();
        __Pausable_init();
        __UUPSUpgradeable_init();
        
        tokenAddress = _tokenAddress;
        proposalThreshold = _proposalThreshold;
        votingPeriod = _votingPeriod;
        quorumBps = _quorumBps;
        approvalThresholdBps = _approvalThresholdBps;
        _proposalIdCounter = 1;
    }
    
    /**
     * @notice Create a new proposal
     * @param _targetContract Contract to call when proposal is implemented
     * @param _description Description of the proposal
     * @param _callData Function call data to execute if proposal passes
     */
    function createProposal(
        address _targetContract,
        string memory _description,
        bytes memory _callData
    ) external nonReentrant whenNotPaused {
        require(_targetContract != address(0), "Target contract cannot be zero address");
        require(bytes(_description).length > 0, "Description cannot be empty");
        require(_callData.length > 0, "Call data cannot be empty");
        
        uint256 proposerBalance = IERC20Upgradeable(tokenAddress).balanceOf(msg.sender);
        require(proposerBalance >= proposalThreshold, "Insufficient tokens to create proposal");
        
        uint256 proposalId = _proposalIdCounter++;
        uint256 startTime = block.timestamp;
        uint256 endTime = startTime + votingPeriod;
        
        Proposal storage newProposal = proposals[proposalId];
        newProposal.id = proposalId;
        newProposal.proposer = msg.sender;
        newProposal.description = _description;
        newProposal.callData = _callData;
        newProposal.targetContract = _targetContract;
        newProposal.startTime = startTime;
        newProposal.endTime = endTime;
        
        proposalIds.push(proposalId);
        
        emit ProposalCreated(
            proposalId,
            msg.sender,
            _targetContract,
            _description,
            startTime,
            endTime
        );
    }
    
    /**
     * @notice Cast a vote on a proposal
     * @param _proposalId ID of the proposal
     * @param _support Whether to support the proposal
     */
    function castVote(uint256 _proposalId, bool _support) external nonReentrant whenNotPaused {
        require(_proposalExists(_proposalId), "Proposal does not exist");
        require(getProposalState(_proposalId) == ProposalState.Active, "Proposal not active");
        
        Proposal storage proposal = proposals[_proposalId];
        require(!proposal.hasVoted[msg.sender], "Already voted");
        
        uint256 votes = IERC20Upgradeable(tokenAddress).balanceOf(msg.sender);
        require(votes > 0, "No voting power");
        
        if (_support) {
            proposal.forVotes += votes;
        } else {
            proposal.againstVotes += votes;
        }
        
        proposal.hasVoted[msg.sender] = true;
        
        emit VoteCast(_proposalId, msg.sender, _support, votes);
    }
    
    /**
     * @notice Finalize a proposal after voting ends
     * @param _proposalId ID of the proposal
     */
    function finalizeProposal(uint256 _proposalId) external nonReentrant whenNotPaused {
        require(_proposalExists(_proposalId), "Proposal does not exist");
        
        ProposalState state = getProposalState(_proposalId);
        require(state == ProposalState.Active, "Proposal not active");
        
        Proposal storage proposal = proposals[_proposalId];
        require(block.timestamp > proposal.endTime, "Voting period not ended");
        
        uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
        uint256 totalSupply = IERC20Upgradeable(tokenAddress).totalSupply();
        
        // Check quorum
        bool quorumReached = (totalVotes * 10000) / totalSupply >= quorumBps;
        
        // Check approval threshold
        bool thresholdMet = proposal.forVotes > 0 && 
                           (proposal.forVotes * 10000) / totalVotes >= approvalThresholdBps;
        
        proposal.passed = quorumReached && thresholdMet;
        
        ProposalState newState = proposal.passed ? ProposalState.Succeeded : ProposalState.Defeated;
        emit ProposalStatusChanged(_proposalId, newState);
    }
    
    /**
     * @notice Implement a successful proposal (owner only)
     * @param _proposalId ID of the proposal
     */
    function implementProposal(uint256 _proposalId) external onlyOwner nonReentrant {
        require(_proposalExists(_proposalId), "Proposal does not exist");
        require(getProposalState(_proposalId) == ProposalState.Succeeded, "Proposal not successful");
        
        Proposal storage proposal = proposals[_proposalId];
        
        // Execute the proposal
        (bool success, ) = proposal.targetContract.call(proposal.callData);
        require(success, "Proposal execution failed");
        
        proposal.implemented = true;
        
        emit ProposalImplemented(_proposalId);
        emit ProposalStatusChanged(_proposalId, ProposalState.Implemented);
    }
    
    /**
     * @notice Reject implementation of a successful proposal (owner only)
     * @param _proposalId ID of the proposal
     * @param _reason Reason for rejection
     */
    function rejectProposal(uint256 _proposalId, string memory _reason) external onlyOwner nonReentrant {
        require(_proposalExists(_proposalId), "Proposal does not exist");
        require(getProposalState(_proposalId) == ProposalState.Succeeded, "Proposal not successful");
        require(bytes(_reason).length > 0, "Reason cannot be empty");
        
        Proposal storage proposal = proposals[_proposalId];
        proposal.rejectionReason = _reason;
        
        emit ProposalRejected(_proposalId, _reason);
        emit ProposalStatusChanged(_proposalId, ProposalState.Rejected);
    }
    
    /**
     * @notice Update governance parameters (owner only)
     * @param _proposalThreshold New proposal threshold
     * @param _votingPeriod New voting period
     * @param _quorumBps New quorum basis points
     * @param _approvalThresholdBps New approval threshold basis points
     */
    function updateGovernanceParameters(
        uint256 _proposalThreshold,
        uint256 _votingPeriod,
        uint256 _quorumBps,
        uint256 _approvalThresholdBps
    ) external onlyOwner {
        require(_quorumBps <= 10000, "Quorum cannot exceed 100%");
        require(_approvalThresholdBps <= 10000, "Approval threshold cannot exceed 100%");
        
        proposalThreshold = _proposalThreshold;
        votingPeriod = _votingPeriod;
        quorumBps = _quorumBps;
        approvalThresholdBps = _approvalThresholdBps;
        
        emit GovernanceParametersUpdated(
            _proposalThreshold,
            _votingPeriod,
            _quorumBps,
            _approvalThresholdBps
        );
    }
    
    /**
     * @notice Pause governance operations
     */
    function pause() external onlyOwner {
        _pause();
    }
    
    /**
     * @notice Unpause governance operations
     */
    function unpause() external onlyOwner {
        _unpause();
    }
    
    /**
     * @notice Get the current state of a proposal
     * @param _proposalId ID of the proposal
     * @return ProposalState representing the current state
     */
    function getProposalState(uint256 _proposalId) public view returns (ProposalState) {
        require(_proposalExists(_proposalId), "Proposal does not exist");
        
        Proposal storage proposal = proposals[_proposalId];
        
        if (proposal.implemented) {
            return ProposalState.Implemented;
        }
        
        if (bytes(proposal.rejectionReason).length > 0) {
            return ProposalState.Rejected;
        }
        
        if (proposal.passed) {
            return ProposalState.Succeeded;
        }
        
        if (block.timestamp <= proposal.endTime) {
            if (block.timestamp >= proposal.startTime) {
                return ProposalState.Active;
            } else {
                return ProposalState.Pending;
            }
        } else {
            // Voting ended but not finalized
            uint256 totalVotes = proposal.forVotes + proposal.againstVotes;
            uint256 totalSupply = IERC20Upgradeable(tokenAddress).totalSupply();
            
            bool quorumReached = (totalVotes * 10000) / totalSupply >= quorumBps;
            bool thresholdMet = proposal.forVotes > 0 && 
                               (proposal.forVotes * 10000) / totalVotes >= approvalThresholdBps;
            
            return (quorumReached && thresholdMet) ? ProposalState.Succeeded : ProposalState.Defeated;
        }
    }
    
    /**
     * @notice Get proposal details
     * @param _proposalId ID of the proposal
     * @return id Proposal ID
     * @return proposer Address of the proposer
     * @return description Description of the proposal
     * @return targetContract Contract to call
     * @return startTime Start time of voting
     * @return endTime End time of voting
     * @return forVotes Votes in favor
     * @return againstVotes Votes against
     * @return passed Whether proposal passed
     * @return implemented Whether proposal was implemented
     * @return rejectionReason Reason for rejection if applicable
     */
    function getProposalDetails(uint256 _proposalId) external view returns (
        uint256 id,
        address proposer,
        string memory description,
        address targetContract,
        uint256 startTime,
        uint256 endTime,
        uint256 forVotes,
        uint256 againstVotes,
        bool passed,
        bool implemented,
        string memory rejectionReason
    ) {
        require(_proposalExists(_proposalId), "Proposal does not exist");
        
        Proposal storage proposal = proposals[_proposalId];
        
        return (
            proposal.id,
            proposal.proposer,
            proposal.description,
            proposal.targetContract,
            proposal.startTime,
            proposal.endTime,
            proposal.forVotes,
            proposal.againstVotes,
            proposal.passed,
            proposal.implemented,
            proposal.rejectionReason
        );
    }
    
    /**
     * @notice Get all proposal IDs
     * @return Array of proposal IDs
     */
    function getAllProposalIds() external view returns (uint256[] memory) {
        return proposalIds;
    }
    
    /**
     * @notice Check if a proposal exists
     * @param _proposalId ID of the proposal
     * @return Whether the proposal exists
     */
    function _proposalExists(uint256 _proposalId) internal view returns (bool) {
        return _proposalId > 0 && _proposalId < _proposalIdCounter;
    }
    
    /**
     * @notice Check if an address has voted on a proposal
     * @param _proposalId ID of the proposal
     * @param _voter Address of the voter
     * @return Whether the address has voted
     */
    function hasVoted(uint256 _proposalId, address _voter) external view returns (bool) {
        require(_proposalExists(_proposalId), "Proposal does not exist");
        return proposals[_proposalId].hasVoted[_voter];
    }
    
    /**
     * @notice Authorize contract upgrade
     * @param newImplementation Address of the new implementation
     */
    function _authorizeUpgrade(address newImplementation) internal override onlyOwner {}
}