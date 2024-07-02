# Impresso Monorepo

It uses npm workspaces, more about them here 
[here](https://docs.npmjs.com/cli/v8/using-npm/workspaces)

## Setup

1. Make sure node/npm and hardhat are installed
2. run `npm i` in packages directories to install all dependencies
3. run `npm run compile:contracts` to compile the contracts
4. for development start the local hardhat node `npm run hh-node:contracts`, the frontend `npm run dev:frontend`

## Smart Contracts

[Smart Contracts](https://github.com/Anola-Software/impress-erc20-votable/tree/main/packages/contracts)

## Frontend

[Frontend](https://github.com/Anola-Software/impress-erc20-votable/blob/main/packages/frontend)

## Testing
[Testing] npx hardhat test