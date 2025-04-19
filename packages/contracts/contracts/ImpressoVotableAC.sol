// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.24;

import "./ImpressoAC.sol";

contract ImpressoVotableAC is ImpressoAC {
    // bool private _commissionEnabled;

    // map (commissionerAddress => amount)
    // mapping(address => uint256) private _commissionPercentages;

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

    // Add an enum for voting actions
    enum VotingAction {
        None,
        PauseContract,
        UnpauseContract,
        UpdateCommission
    }

    // Add mapping for voting actions
    mapping(string => VotingAction) public votingActions;

    // events VotingStarted, VotingActionExecuted, VotingEnded, Vote
    event VotingStarted(string title, uint256 votesNeeded);
    event VotingActionExecuted(string title, VotingAction action);
    event VotingEnded(string title);
    event Vote(string title, address voterAddress);

    /* ##################   ######################  ################## */
    /* ##################           VOTING          ################## */
    /* ##################   ######################  ################## */

    // Disable address from voting
    function blacklistVoter(
        address voter
    ) public onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        _blockedToVote[voter] = true;
    }

    // Create a voting
    function createVoting(
        string memory title,
        uint256 votesNeeded,
        VotingAction action
    ) public onlyRole(DEFAULT_ADMIN_ROLE) whenNotPaused {
        require(votesNeeded > 0, "votesNeeded must be > 0");
        require(
            votesCountNeeded[title] == 0,
            "Voting with this title already exists"
        );

        votingActions[title] = action;
        votesCountNeeded[title] = votesNeeded;
        isVotingActive[title] = true;

        emit VotingStarted(title, votesNeeded);
    }

    // Vote for a proposal
    function vote(string memory votingTitle) public whenNotPaused {
        require(bytes(votingTitle).length > 0, "Empty voting title");
        require(isVotingActive[votingTitle], "Voting ended or not exists");
        require(!_blockedToVote[msg.sender], "Not allowed to vote");
        require(!votings[votingTitle][msg.sender], "Already voted");

        votings[votingTitle][msg.sender] = true;

        uint256 newTotalVotes = totalVotes[votingTitle] + 1;
        totalVotes[votingTitle] = newTotalVotes;

        emit Vote(votingTitle, msg.sender);

        if (
            newTotalVotes >= votesCountNeeded[votingTitle] &&
            isVotingActive[votingTitle]
        ) {
            isVotingActive[votingTitle] = false; // Prevent re-entrancy
            executeAction(votingTitle);
        }
    }

    // Action to be executed once enough votes are received
    function executeAction(string memory votingTitle) private {
        VotingAction action = votingActions[votingTitle];

        if (action == VotingAction.PauseContract) {
            _pause();
        } else if (action == VotingAction.UnpauseContract) {
            _unpause();
        }
        // Reset voting state
        _resetVoting(votingTitle);
        emit VotingActionExecuted(votingTitle, action);
    }

    // Reset voting state
    function _resetVoting(string memory votingTitle) private {
        isVotingActive[votingTitle] = false;
        emit VotingEnded(votingTitle);
    }
}
