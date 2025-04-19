# IMPRESSO Smart Contracts

This repository contains the core smart contracts for the IMPRESSO ecosystem, including the **ImpressoMoca** ERC20 token with commission logic and the **ImpressoGovernance** contract for decentralized proposal and voting.

---

## Table of Contents

- [Contracts Overview](#contracts-overview)
- [ImpressoMoca Functions](#impresso-moca-functions)
  - [Read Functions](#read-functions)
  - [Write Functions](#write-functions)
- [ImpressoGovernance Functions](#impresso-governance-functions)
  - [Read Functions](#read-functions-1)
  - [Write Functions](#write-functions-1)

---

## Contracts Overview

### ImpressoMoca

- ERC20 token with commission system.
- Supports minting, burning, pausing, and role-based access control.
- Commission on transfers can be distributed to up to 3 addresses.
- Upgradeable via UUPS proxy pattern.

### ImpressoGovernance

- Governance contract for proposals and voting.
- Token holders can create and vote on proposals.
- Owner has final authority to implement or reject proposals.
- Upgradeable via UUPS proxy pattern.

---

## ImpressoMoca Functions

### Read Functions

| Function | Description |
|----------|-------------|
| `name()` | Returns the token name. |
| `symbol()` | Returns the token symbol. |
| `decimals()` | Returns the number of decimals. |
| `totalSupply()` | Returns the total token supply. |
| `balanceOf(address)` | Returns the balance of an address. |
| `allowance(owner, spender)` | Returns the remaining allowance for a spender. |
| `getCommissionEnabled()` | Returns whether commission is enabled. |
| `getCommissionPercentage(address)` | Returns the commission percentage for an address. |
| `getAllCommissionPercentages()` | Returns all commission addresses and their percentages. |
| `isCommissionExempt(address)` | Returns if an address is exempt from commission. |
| `hasRole(bytes32, address)` | Checks if an address has a specific role. |
| `supportsInterface(bytes4)` | Checks if a contract supports an interface. |
| `DEFAULT_ADMIN_ROLE()` | Returns the admin role identifier. |
| `BURNER_ROLE()` | Returns the burner role identifier. |
| `PAUSER_ROLE()` | Returns the pauser role identifier. |
| `MINTER_ROLE()` | Returns the minter role identifier. |
| `UPGRADER_ROLE()` | Returns the upgrader role identifier. |
| `governanceContract()` | Returns the governance contract address. |
| `_maxTotalSupply()` | Returns the maximum total supply. |
| `_useMaxTotalSupply()` | Returns if max total supply is enforced. |
| `_commissionAddresses(uint256)` | Returns a commission address at a specific index. |
| `_commissionPercentages(address)` | Returns the commission percentage for an address. |
| `_commissionExempt(address)` | Returns if an address is commission exempt. |

---

### Write Functions

| Function | Description |
|----------|-------------|
| `initialize(name, symbol, maxTotalSupply, useMaxTotalSupply, owner)` | Initializes the contract. |
| `setGovernanceContract(address)` | Sets the governance contract address (admin only). |
| `grantRoleForAddress(address, string)` | Grants a role to a user (admin only). |
| `grantRole(bytes32, address)` | Grants a role (admin only). |
| `revokeRole(bytes32, address)` | Revokes a role (admin only). |
| `renounceRole(bytes32, address)` | Renounces a role. |
| `burn(address, uint256)` | Burns tokens from an account (by BURNER_ROLE or governance). |
| `burn(uint256)` | Burns tokens from caller’s account. |
| `pause()` | Pauses all token transfers (by PAUSER_ROLE or governance). |
| `unpause()` | Unpauses token transfers (by PAUSER_ROLE or governance). |
| `mint(address, uint256)` | Mints new tokens (by MINTER_ROLE or governance). |
| `toggleCommission(bool)` | Enables/disables commission (admin/governance). |
| `setCommissionPercentages(address[], uint256[])` | Sets commission percentages for addresses (admin only). |
| `setCommissionExempt(address, bool)` | Sets/removes commission exemption for an address (admin only). |
| `transfer(address, uint256)` | Transfers tokens (with commission logic). |
| `transferFrom(address, address, uint256)` | Transfers tokens on behalf of another (with commission logic). |
| `approve(address, uint256)` | Approves a spender to spend tokens. |
| `increaseAllowance(address, uint256)` | Increases allowance for a spender. |
| `decreaseAllowance(address, uint256)` | Decreases allowance for a spender. |
| `_authorizeUpgrade(address)` | Restricts contract upgrades. |
| `_beforeTokenTransfer(address, address, uint256)` | Hook for pausing logic. |
| `constructor()` | Disables initializers (only runs once). |

---

## ImpressoGovernance Functions

### Read Functions

| Function | Description |
|----------|-------------|
| `tokenAddress()` | Returns the address of the governance token. |
| `proposalThreshold()` | Returns the minimum tokens required to create a proposal. |
| `votingPeriod()` | Returns the voting period duration. |
| `quorumBps()` | Returns the quorum in basis points. |
| `approvalThresholdBps()` | Returns the approval threshold in basis points. |
| `getProposalState(uint256)` | Returns the current state of a proposal. |
| `getProposalDetails(uint256)` | Returns all details about a proposal. |
| `getAllProposalIds()` | Returns an array of all proposal IDs. |
| `hasVoted(uint256, address)` | Returns whether an address has voted on a proposal. |
| `owner()` | Returns the contract owner. |
| `paused()` | Returns if the contract is paused. |
| `_proposalExists(uint256)` | Checks if a proposal exists. |
| `proposals(uint256)` | Returns the proposal struct for a given ID. |
| `proposalIds(uint256)` | Returns a proposal ID at a specific index. |

---

### Write Functions

| Function | Description |
|----------|-------------|
| `initialize(tokenAddress, proposalThreshold, votingPeriod, quorumBps, approvalThresholdBps)` | Initializes the contract. |
| `createProposal(address, string, bytes)` | Creates a new proposal. |
| `castVote(uint256, bool)` | Casts a vote on a proposal. |
| `finalizeProposal(uint256)` | Finalizes a proposal after voting ends. |
| `implementProposal(uint256)` | Executes a successful proposal (owner only). |
| `rejectProposal(uint256, string)` | Rejects a successful proposal (owner only). |
| `updateGovernanceParameters(uint256, uint256, uint256, uint256)` | Updates governance parameters (owner only). |
| `pause()` | Pauses governance operations (owner only). |
| `unpause()` | Unpauses governance operations (owner only). |
| `transferOwnership(address)` | Transfers contract ownership. |
| `renounceOwnership()` | Renounces contract ownership. |
| `_authorizeUpgrade(address)` | Restricts contract upgrades. |
| `constructor()` | Disables initializers (only runs once). |

---

## License

MIT