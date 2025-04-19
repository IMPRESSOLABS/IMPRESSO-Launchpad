import '../styles/globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import type { AppProps } from 'next/app';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import {
  mainnet,
  cronos,
  cronosTestnet,
  arbitrum,
  arbitrumNova,
  sepolia,
  hardhat,
} from 'wagmi/chains';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';

const config = getDefaultConfig({
  appName: process.env.appName ?? 'Launchpad',
  projectId: process.env.projectId ?? "",
  chains: [
    mainnet,
    arbitrum,
    arbitrumNova,
    cronos,
    cronosTestnet,
    hardhat,
    {
      ...sepolia, 
      blockExplorers: {
        ...sepolia.blockExplorers,
        default: {
          ...sepolia.blockExplorers.default,
          apiUrl: process.env.apiUrl ?? ""
        }
      }
    },
  ],
  ssr: true,
});

const client = new QueryClient();

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={client}>
        <RainbowKitProvider locale='en-US'>
          <Component {...pageProps} />
        </RainbowKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

export default MyApp;
