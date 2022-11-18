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
  "{JSON_RPC_PROVIDER_URL_HERE}"
);

const PRIVATE_KEY = "{YOUR_PRIVATE_KEY_HERE}"
const wallet = new ethers.Wallet(PRIVATE_KEY);

const yacht = new YachtLitSdk(provider, wallet);

const result = yacht.generateUnsignedERC20Transaction({
  tokenAddress: "{ERC_20_CONTRACT_ADDRESS}",
  counterPartyAddress: "{COUNTER_PARTY_ADDRESS}",
  tokenAmount: "{TOKEN_AMOUNT_HUMAN_READABLE}",
  decimals: "{TOKEN_DECIMALS}",
  chainId: "{CHAIN_ID}",
});

console.log(result);
```
