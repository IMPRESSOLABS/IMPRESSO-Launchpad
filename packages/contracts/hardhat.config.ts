import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import '@openzeppelin/hardhat-upgrades';
require("dotenv").config();


const { METAMASK_PRIVATE_KEY,
    SEPOLIA_API_URL, ETHERSCAN_API_KEY,
    ARBITRUM_API_URL, ARBISCAN_API_KEY,
    ARBITRUM_NOVA_API_URL, ARMITRUM_NOVASCAN_API_KEY
} = process.env;


const config: HardhatUserConfig = {
    solidity: {
        version: "0.8.24",
        settings: {
            optimizer: {
                enabled: true,
                runs: 1000,
            },
        },
    },
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            allowUnlimitedContractSize: true,
        },
        sepolia: {
            url: SEPOLIA_API_URL as string,
            accounts: [`${METAMASK_PRIVATE_KEY}`],
        },
        arbitrum: {
            url: ARBITRUM_API_URL as string,
            accounts: [`${METAMASK_PRIVATE_KEY}`],
        },
        arbitrumNova: {
            url: ARBITRUM_NOVA_API_URL as string,
            accounts: [`${METAMASK_PRIVATE_KEY}`],
        }
    },
    etherscan: {
        apiKey: {
            sepolia: ETHERSCAN_API_KEY as string,
            arbitrumOne: ARBISCAN_API_KEY as string,
            arbitrumNova: ARMITRUM_NOVASCAN_API_KEY as string,
        },
    },

};


export default config;
