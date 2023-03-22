**NOTE**
You are on the bitcoin branch. To install this version, use `yarn add lit-swap-sdk@bitcoin`

This is the Yacht-Lit-SDK which facilitates cross chain atomic swaps using Lit Protocol [Programmable Key Pairs](https://developer.litprotocol.com/coreConcepts/LitActionsAndPKPs/PKPs) (PKPs) and [Lit Actions](https://developer.litprotocol.com/coreConcepts/LitActionsAndPKPs/litActions).

Check out our [gitbook documentation](https://hank-minden.gitbook.io/yacht-lit-sdk-developer-docs/) for more in-depth descriptions of implementation details

Programmable Key Pairs are valid ECDSA wallets with a private key and a public key and can be used for signing transactions on-chain. The private key is generated collectively by the Lit Protocol nodes through a process called Distributed Key Generation (DKG). Each node in the Lit network has a share of the private key, and no party involved in the DKG process ever has the whole key. The ownership of the PKP is currently managed by an NFT on the Polygon Mumbai network: whatever wallet owns the NFT is able to ask the Lit Network to combine the key shares and sign any transaction or message.

Lit Actions are JavaScript functions that can use PKPs to sign transactions. They are akin to Javascript smart contracts that can work cross chain because they are able to sign messages using the PKP on any chain that Lit Protocol has been set up for. Lit Actions can read on-chain data take action based on the state of the network.

In our use case, we are using Lit Actions with PKPs to enable atomic cross chains swaps using the PKP address as an escrow service. We mint a PKP and associate it with Lit Action code that determines whether the PKP address has a certain balance of ERC20 tokens on two different chains. When two users send their tokens to the PKP within a three day time limit, the users are able to generate transactions which will swap the tokens between the two counterparties. **Because we are minting the PKP, associating it with the Lit Action code, and burning the PKP all within an atmoic transaction, nobody can change the code that the PKP is associated with**. This gives counterparties the assurance that if both parties send their ERC20 tokens to the address that they will be able to swap the tokens. If only one party sends their tokens to the PKP address, after three days the Lit Action will generate a clawback transaction that will allow the party who sent their tokens to retrieve them.

---

**TESTING:**
To compile and run tests locally:

IMPORTANT NOTE: Some tests consume TEST MATIC and Goerli ETH. To ensure the tests pass, copy the .env.sample file into a .env file, and add a MATIC private key and a Goerli private key each with some native tokens. You will also need an RPC url for both MATIC and GOERLI. You can find a faucet at https://goerlifaucet.com/ and https://mumbaifaucet.com/

To ensure that bitcoin tests pass, enter your MUMBAI private key in the .env file as noted above as well as your MUMBAI provider URL.

When you run `yarn test` it will prompt you to send testnet Bitcoin to an address. We recommend using this faucet: https://testnet-faucet.com/btc-testnet/

Please note that since the integration tests are running on-chain it can take some time

```
yarn install
npx hardhat compile
yarn test
```

---

**Contributing**
Make sure you are using Node version >=16. You can download the Node Version Manager (nvm) [here](https://github.com/nvm-sh/nvm)

Install the prettier and esLint extensions in VSCode to enforce code standard and for automatic linting.

To develop against a local version of the package in your own project, you can change the package version in your project's package.json to the local path of the package:

```
"lit-swap-sdk": "file:**PATH TO LOCAL PACKAGE HERE**",
```

You'll want to set up your code environment to watch for changes in this package's directory and automatically compile any changes since its the build folder that's actually imported as the package.

Finally, if you're using typescript in your project, disable the `checkJs` flag in `tsconfig`. If you don't then it will treat the packages build folder as typescript rather than javascript and everything will break :)

---

To install the SDK in an existing project, open your terminal and type the following two lines:

```
yarn add ethers
yarn add lit-swap-sdk
```

---

**USING THE SDK:**

To mint a PKP, you will need an ethers signer that has MATIC tokens on the Polygon Mumbai test network. _If you just want to generate Lit Action code or execute the Lit Action once it has already been associated with a PKP, you do **not** need an ethers signer object_

Instantiate SDK:

```typescript
import { ethers } from "ethers";
import { YachtLitSdk } from "lit-swap-sdk";

const mumbaiProvider = new ethers.providers.JsonRpcProvider(YOUR_PROVIDER_URL);
const mySigner = new ethers.Wallet(YOUR_PRIVATE_KEY_HERE, mumbaiProvider);

const yacht = new YachtLitSdk({ signer: mySigner });
```

To generate an atomic cross-chain swap using the SDK, you'll first need to generate the Lit Action code which checks that two parties have sent their tokens to the PKP escrow address. To do this, agree on your ERC20 swap conditions across two chains. Then, using the instantiated sdk:

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

This will return the required litActionCode to mint the PKP.

You can see our logic for generating the Lit Action code below:
![Lit Action ERC20 Swap Logic](https://i.imgur.com/0dDSXny.png)

Once you have the Lit Action code generated, it's time to generate an IPFS hash for the code and associate it with a new PKP:

```typescript
const ipfsCID = await sdk.getIPFSHash(litActionCode);
const pkpInfo = await sdk.mintGrantBurnWithLitAction(ipfsCID);
```

The object returned by `mintGrantBurnWithLitAction` has the following properties: `tokenId`, `publicKey` and `address`. The address is the PKP escrow account where you'll send your ERC20 tokens. The publicKey is the uncompressed public key used by the ECDSA algorithm to derive the address. To execute the Lit Action, we'll need the Lit Action code itself and the `publicKey`:

```typescript
const response = await sdk.runLitAction({code: litActionCode, pkpPublicKey: pkpInfo.publicKey);
```

A response when both parties have sent their ERC20 tokens to the pkp address looks like the following:

```typescript
{
  response: {
    chainATransaction: {
      to: string;
      nonce: number;
      chainId: number;
      gasLimit: string;
      from: string;
      data: string;
      type: 2;
      maxFeePerGas: string;
      maxPriorityFeePerGas: string;
    }
    chainBTransaction: {
      to: string;
      nonce: number;
      chainId: number;
      gasLimit: string;
      from: string;
      data: string;
      type: 2;
      maxFeePerGas: string;
      maxPriorityFeePerGas: string;
    }
  }
  signatures: {
    chainASignature: {
      r: string;
      s: string;
      recid: number;
      signature: string;
      publicKey: string;
      dataSigned: string;
    }
    chainBSignature: {
      r: string;
      s: string;
      recid: number;
      signature: string;
      publicKey: string;
      dataSigned: string;
    }
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

Please note that using IPFS to upload the code can sometimes fail. In this SDK implementation, we are only generating the IPFS hash for the code. The Lit Protocol Nodes also hash the Lit Action Code and generate an IPFS hash, so if you pass the original code into the sdk you don't actually need to upload the code to IPFS. We are exploring ways to make the IPFS upload function more robust, but until then we recommend only getting the hash of the code and passing the Javascript code string to the sdk.

---

**Bitcoin**

Please refer to our Gitbook page for documentation regarding the Bitcoin capabilities of the SDK.
