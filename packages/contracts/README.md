## Hardhat project
This project is built with the hardhat tool


## Deployment
1) Setup environment (.env file)


```bash
METAMASK_PRIVATE_KEY=your-metamask-private-key

SEPOLIA_API_URL=sepolia_rpc_url
ETHERSCAN_API_KEY=your-etherscan-api-key

ARBITRUM_API_URL=arbitrum_rpc_url
ARBISCAN_API_KEY=your-arbiscan-api-key

ARBITRUM_NOVA_API_URL=arbitrum_nova_rpc_url
ARMITRUM_NOVASCAN_API_KEY=your-arbinovascan-api-key
```

2) Scripts setup
To configure initial params for contracts, you should edit variables in scripts files:

```bash
/scripts/erc20base.ts
```
```bash
/scripts/erc20baseAC.ts
```
```bash
/scripts/erc20votable.ts
```
```bash
/scripts/erc20votableAC.ts
```
```bash
/scripts/uupsProxy.ts
```


3) To deploy contract run

```bash
npx hardhat run <path to deployment script> --network <network name from hardhat.config.js, (hardhat network will be used as default one)>
```


## Verifying
To verify contract run

```bash
npx hardhat verify --network <network name> <deployed contract id> <...contract constructor args>
```


## Contracts available
In this section you can find links to the contracts solidity files

[**__Base__**](https://github.com/Anola-Software/impress-erc20-votable/blob/main/packages/contracts/contracts/Impresso.sol)

_Base contract provides this set of common functions:_

- **toggleCommission(bool enable) public onlyOwner** - This function enables or disables commission functionality. Only the owner of the contract can call this function.

- **setCommissionPercentage(address addr, uint256 percentage) public onlyOwner** - This function sets the commission percentage for a specific address. It ensures that the percentage is not greater than 100 and that no more than 3 addresses can have commission percentages set. Only the owner of the contract can call this function.

- **getCommissionPercentage(address addr) public onlyOwner returns(uint256)** - This function retrieves the commission percentage for a specific address. It's a view function, meaning it doesn't modify the contract's state and can be called without spending gas.

- **transfer(address to, uint256 amount) public override returns (bool)** - This function overrides the transfer function from the ERC20 contract. It transfers tokens from the sender to the recipient, with commission deducted if commission functionality is enabled.

- **transfer(address from, address to, uint256 amount) public override returns (bool)** - This function overrides the transferFrom function from the ERC20 contract. It transfers tokens from the sender to the recipient, with commission deducted if commission functionality is enabled.



[**__Votable__**](https://github.com/Anola-Software/impress-erc20-votable/blob/main/packages/contracts/contracts/ImpressoVotable.sol)

_Votable contract provides this set of common functions:_

- **...All funtions from Base**

- **blacklistVoter(address voter) public onlyOwner** - adds specific address to blacklist.

- **createVoting(string memory title, uint256 votesNeeded) public onlyOwner** - This function enables the owner of the contract to create a new voting session with a specified title and the number of votes needed for the proposal to pass.

- **vote(string memory votingTitle) public** - This function allows any allowed address to vote for a proposal with a given title.

- **executeAction(string memory votingTitle) private** - This function is called internally once a voting session receives enough votes to execute an action.

- **_resetVoting(string memory votingTitle) private** - This internal function resets the voting state for a given proposal by setting votesRunningStatuses[votingTitle] to false.


[**__UUPSProxy__**](https://github.com/Anola-Software/impress-erc20-votable/blob/main/packages/contracts/contracts/UUPSProxy.sol)
 copy of the ERC1967Proxy for making deployments from the frontend.


[**__Access control contracts__**]
There is also the second version of contracts listed above with the [ACCESS CONTROL](https://docs.openzeppelin.com/contracts/2.x/access-control) feature. (Contracts with this feature are named as (ContractName)AC.sol)


## Complie
```bash
   npx hardhat compile
```

## Deployment
```bash
npx hardhat run scripts/deployMoca.ts --network arbitrum
```


## Verify Contract

### ImpressoAC
```bash
npx hardhat verify --contract contracts/ImpressoAC.sol:ImpressoAC --network arbitrum <ImpressoAC_address>
```

### Goverance
```bash
npx hardhat verify --contract contracts/Impressogovernance.sol:Impressogovernance --network arbitrum <Impressogovernance_address> <ImpressoAC_address>
```



## Test deployment
```bash
npx hardhat test test/contractMoca.test.js
```