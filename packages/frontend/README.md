This is a [RainbowKit](https://rainbowkit.com) + [wagmi](https://wagmi.sh) + [Next.js](https://nextjs.org/) project bootstrapped with [`create-rainbowkit`](/packages/create-rainbowkit).

## Getting Started

First, run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more about this stack, take a look at the following resources:

- [RainbowKit Documentation](https://rainbowkit.com) - Learn how to customize your wallet connection flow.
- [wagmi Documentation](https://wagmi.sh) - Learn how to interact with Ethereum.
- [Next.js Documentation](https://nextjs.org/docs) - Learn how to build a Next.js application.

You can check out [the RainbowKit GitHub repository](https://github.com/rainbow-me/rainbowkit) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out the [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.


## Frontend itself

The frontend includes special deployment form page and deployment results page.

Deployment form
- Token name
- Token symbol
- Max total supply (optional)
- Token type (default, votable, defaultAC, votableAC)
- Amount to mint (must be < (Max total supply) (if max total supply is checked))
- Address to be minted on (0x...)

![Capture](https://github.com/Anola-Software/impress-erc20-votable/assets/97344806/ca7d790a-e018-48a5-a165-23c6da4c1f8f)

Results page
- Contains all important information of the last deployment

![Capture](https://github.com/Anola-Software/impress-erc20-votable/assets/97344806/cbbd4111-2544-4f52-8992-f12c183e3552)