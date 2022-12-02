This is the Yacht-Lit-SDK which facilitates cross chain swaps using Lit Protocol PKPs and Lit Actions.

To compile and run tests locally:

```
yarn install
npx hardhat compile
npm test
```

Make sure you are using Node version >=16

Install the prettier and esLint extension in VSCode for easier use and automatic linting.

To install the SDK in an existing project:

```
yarn add lit-swap-sdk
```

Instantiate SDK:

```
import { YachtLitSdk } from "lit-swap-sdk";
```

Generate ERC20 Swap Transaction:

```
import { ethers } from "ethers";

const provider = new ethers.providers.JsonRpcProvider(
  "{JSON_RPC_PROVIDER_URL_HERE}" // this is the network which will mint PKPs.  As of 12/01/2022 this is Mumbai
);

const yacht = new YachtLitSdk(provider);
```

This SDK is used to generate a Lit Action that will facilitate cross chain atomic swaps of ERC20 tokens. Rather than having a central pool of liquidity used to swap assets cross chain, you can instead find a counterparty for a one-time trade. This removes the risk of vulnerable honeypot liquidity pools.

A Lit Action is attached to a Programmable Key Pair(PKP) and has a public and private key with which it can receive tokens and sign transactions. In this case, you will create a Lit Action with an associated PKP, send the required ERC20 tokens to the PKP address, and once both parties have fulfilled the swap conditions the Lit Action will return two transactions which swap the tokens across chains.

To generate an atomic cross-chain swap using Lit Actions, you'll first need to generate the Lit Action code to check the swap conditions.
