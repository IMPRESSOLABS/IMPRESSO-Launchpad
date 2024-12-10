# Impresso Monorepo

It uses npm workspaces, more about them here 
[here](https://docs.npmjs.com/cli/v8/using-npm/workspaces)

## Setup

1. Make sure node/npm and hardhat are installed
2. run `npm i` in packages directories to install all dependencies
3. run `npm run compile:contracts` to compile the contracts
4. for development start the local hardhat node `npm run hh-node:contracts`, the frontend `npm run dev:frontend`

## Production

1. run `link -s ~/{project_name}/packages/contracts/artifacts/contracts ~/{project_name}/packages/frontend/contracts` to create a symbolic link between compiled contracts and frontend.
2. run `npm run build` to compile the contracts and frontend
3. Host on Nginx:
```
    root /home/{user_name}/{project_name}/packages/frontend/out/;
    index index.html;

    location / {
         try_files $uri $uri.html /$uri $uri/ /404.html =404;
    }

     location ~ ^/[^/]+\.html$ {
         try_files $uri $uri/ /index.html;
     }
```

## Smart Contracts

[Smart Contracts](https://github.com/Anola-Software/impress-erc20-votable/tree/main/packages/contracts)

## Frontend

[Frontend](https://github.com/Anola-Software/impress-erc20-votable/blob/main/packages/frontend)
