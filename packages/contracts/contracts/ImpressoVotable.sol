// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.24;


import "./Impresso.sol";


contract ImpressoVotable is Impresso {
    bool private _commissionEnabled;

    // map (commissionerAddress => amount)
    mapping(address => uint256) private _commissionPercentages;

    // users (addresses) allowed to vote
    mapping(address => bool) private _blockedToVote;

    // tracking already voted users
    mapping(string => mapping(address => bool)) public votings;

    // mapping for tracking voting count
    mapping(string => uint256) public totalVotes;

    // mapping for tracking voting status (enabled / disabled)
    mapping(string => bool) public isVotingActive;
    
    // mapping for setting the vote count
    mapping(string => uint256) public votesCountNeeded;

    // events VotingStarted, VotingEnded, Vote
    event VotingStarted(string title, uint256 votesNeeded);
    event VotingEnded(string title);
    event Vote(string title, address voterAddress);

    /* ##################   ######################  ################## */
    /* ##################           VOTING          ################## */
    /* ##################   ######################  ################## */

    // Disable address from voting
    function blacklistVoter(address voter) public onlyOwner whenNotPaused {
        _blockedToVote[voter] = true;
    }

    // Create a voting
    function createVoting(string memory title, uint256 votesNeeded) public onlyOwner whenNotPaused {
        require(votesNeeded > 0, "votesNeeded must be > 0");
        require(votesCountNeeded[title] == 0, "Voting with this title already exists");
        
        votesCountNeeded[title] = votesNeeded;
        isVotingActive[title] = true;

        emit VotingStarted(title, votesNeeded);
    }

    // Vote for a proposal
    function vote(string memory votingTitle) public whenNotPaused {
        require(isVotingActive[votingTitle], "Voting ended or not exists");
        require(!_blockedToVote[msg.sender], "Not allowed to vote");
        require(!votings[votingTitle][msg.sender], "Already voted");

        // add msg.sender to people who already voted
        votings[votingTitle][msg.sender] = true;
        totalVotes[votingTitle]++;

        emit Vote(votingTitle, msg.sender);

        // Execute action if enough votes are received
        if (totalVotes[votingTitle] >= votesCountNeeded[votingTitle]) {
            executeAction(votingTitle);
        }
    }

    // Action to be executed once enough votes are received
    function executeAction(string memory votingTitle) private {
        // Reset voting state
        _resetVoting(votingTitle);
    }

    // Reset voting state
    function _resetVoting(string memory votingTitle) private {
        
        // IMPROVEMENT: Sybil Attack Protection. Ensure comprehensive resetting of voting state post-voting to clear out all previous tallies and flags.
        totalVotes[votingTitle] = 0;

        isVotingActive[votingTitle] = false;
        emit VotingEnded(votingTitle);
    }
}