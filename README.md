This is the Yacht-Lit-SDK which facilitates cross chain atomic swaps using Lit Protocol [Programmable Key Pairs](https://developer.litprotocol.com/coreConcepts/LitActionsAndPKPs/PKPs) (PKPs) and [Lit Actions](https://developer.litprotocol.com/coreConcepts/LitActionsAndPKPs/litActions).

Programmable Key Pairs are valid ECDSA wallets with a private key and a public key and can be used for signing transactions on-chain. The private key is generated collectively by the Lit Protocol nodes through a process called Distributed Key Generation (DKG). Each node in the Lit network has a share of the private key, and no party involved in the DKG process ever has the whole key. The ownership of the PKP is currently managed by an NFT on the Polygon Mumbai network: whatever wallet owns the NFT is able to ask the Lit Network to combine the key shares and sign any transaction or message.

Lit Actions are JavaScript functions that can use PKPs to sign transactions. They are akin to Javascript smart contracts that can work cross chain because they are able to sign messages using the PKP on any chain that Lit Protocol has been set up for. Lit Actions can read on-chain data take action based on the state of the network.

In our use case, we are using Lit Actions with PKPs to enable atomic cross chains swaps. We mint a PKP and associate it with Lit Action code that determines whether the PKP address has a certain balance of ERC20 tokens on two different chains. When two users send their tokens to the PKP within a three day time limit, the users are able to generate transactions which will swap the tokens between the two counterparties. **Because we minting the PKP, associating it with the Lit Action code, and burning the PKP all within an atmoic transaction, nobody can change the code that the PKP is associated with**. This gives counterparties the assurance that if both parties send their ERC20 tokens to the address, then they will be able to swap the tokens. If only one party sends their tokens to the PKP address, after three days the Lit Action will generate a clawback transaction that will allow the party who sent their tokens to retrieve them.

To compile and run tests locally:

IMPORTANT NOTE: Some tests consume TEST MATIC. Before running the test suite, check that the mumbai address on line 24 of /test/mintGrantBurn.test.ts has at least .2 TEST MATIC in order to pass all tests successfully.

```
yarn install
npx hardhat compile
npm test
```

Make sure you are using Node version >=16. You can download the Node Version Manager (nvm) [here](https://github.com/nvm-sh/nvm)

Install the prettier and esLint extensions in VSCode to enforce code standard and for automatic linting.

To install the SDK in an existing project, open your terminal and type the following two lines:

```
yarn add ethers
yarn add lit-swap-sdk
```

_to mint a PKP, you will need an ethers signer that has MATIC tokens on the Polygon mumbai network. If you just want to generate Lit Action code or execute the Lit Action once it has already been associated with a PKP, you do **not** need an ethers signer object_

Instantiate SDK:

```typescript
import { ethers } from "ethers";
import { YachtLitSdk } from "lit-swap-sdk";

const mumbaiProvider = new ethers.providers.JsonRpcProvider(YOUR_PROVIDER_URL);
const signer = new ethers.Wallet(YOUR_PRIVATE_KEY_HERE, mumbaiProvider);

const yacht = new YachtLitSdk(signer);
```

To generate an atomic cross-chain swap using the SDK, you'll first need to generate the Lit Action code which checks the swap conditions. To do this, agree on your ERC20 swap conditions across two chains. Then, using the instantiated sdk:

```typescript
const chainAParams = {
  counterPartyAddress: "0x630A5FA5eA0B94daAe707fE105404749D52909B9", // Wallet address to send ERC20 tokens on Chain A
  tokenAddress: "0xBA62BCfcAaFc6622853cca2BE6Ac7d845BC0f2Dc", // ERC20 Contract Address on Chain A
  chain: "goerli",
  amount: "5", // Amount of tokens to swap
  decimals: 18, // Decimals of the token
};
const chainBParams = {
  counterPartyAddress: "0x96242814208590C563AAFB6270d6875A12C5BC45", // Wallet address to send ERC20 tokens on Chain B
  tokenAddress: "0xeDb95D8037f769B72AAab41deeC92903A98C9E16", // ERC20 Contract Address on Chain B
  chain: "mumbai",
  amount: "8", // Amount of tokens to swap
  decimals: 18, // Decimals of the token
};
const litActionCode = yacht.createERC20SwapLitAction(
  chainAParams,
  chainBParams,
);
```

This will return the required litActionCode to mint the PKP. You can see our logic for generating the Lit Action code below:
![Lit Action ERC20 Swap Logic](https://i.imgur.com/0dDSXny.png)

Once you have the Lit Action code generated, it's time to upload the Lit Action code to IPFS and associate it with a new PKP:

```typescript
const ipfsCID = await sdk.uploadToIPFS(litActionCode);
const pkpInfo = await sdk.mintGrantBurnWithLitAction(ipfsCID);
```

The object returned by `mintGrantBurnWithLitAction` has the following properties: `tokenId`, `publicKey` and `address`. The address is where you'll send your ERC20 tokens. The publicKey is the uncompressed public key used by the ECDSA algorithm to derive the address. To execute the Lit Action, we'll need the `ipfsCID` and the `publicKey`:

```typescript
const response = await sdk.runLitAction({ipfsCID: ipfsCID, pkpPublicKey: pkpInfo.publicKey);
```

A response when both parties have sent their ERC20 tokens to the pkp address looks like the following:

```typescript
{
  response: {
    chainATransaction: {
      counterPartyAddress: string;
      tokenAddress: string;
      chain: string;
      amount: string;
      decimals: number;
      from: string;
      nonce: number;
    }
    chainBTransaction: {
      counterPartyAddress: string;
      tokenAddress: string;
      chain: string;
      amount: string;
      decimals: number;
      from: string;
      nonce: number;
    }
  }
  signatures: {
    chainASignature: any;
    chainBSignature: any;
  }
}
```

In this case, we can use an ethers provider to send the transactions on each network

```typescript
await chainAProvider.sendTransaction(
  ethers.utils.serializeTransaction(
    response.response.chainATransaction,
    response.signatures.chainASignature,
  ),
);
await chainBProvider.sendTransaction(
  ethers.utils.serializeTransaction(
    response.response.chainBTransaction,
    response.signatures.chainBSignature,
  ),
);
```
