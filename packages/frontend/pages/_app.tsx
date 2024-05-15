import '../styles/globals.css';
import '@rainbow-me/rainbowkit/styles.css';
import type { AppProps } from 'next/app';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import {
  arbitrum,
  arbitrumNova,
  sepolia,
} from 'wagmi/chains';
import { getDefaultConfig, RainbowKitProvider } from '@rainbow-me/rainbowkit';

const config = getDefaultConfig({
  appName: 'RainbowKit App',
  projectId: 'aec84fc090cad6ff22325f167a1b60a1',
  chains: [
    arbitrum,
    arbitrumNova,
    {
      ...sepolia, 
      blockExplorers: {
        ...sepolia.blockExplorers,
        default: {
          ...sepolia.blockExplorers.default,
          apiUrl: "https://sepolia.infura.io/v3/aaf40adf2d1f4a4d829a88d872f4237a"
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
