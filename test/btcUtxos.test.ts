import { PKP_CONTRACT_ADDRESS_MUMBAI } from "./../src/constants/index";
import {
  getMumbaiPrivateKey,
  getMumbaiProviderUrl,
} from "./../src/utils/environment";
import { Wallet, providers } from "ethers";
import { YachtLitSdk } from "../src/sdk";

const wallet = new Wallet(
  getMumbaiPrivateKey(),
  new providers.JsonRpcProvider(getMumbaiProviderUrl()),
);
const sdk = new YachtLitSdk(wallet, PKP_CONTRACT_ADDRESS_MUMBAI, true);

describe("Get Utxos", () => {
  it("should get utxos", async () => {
    // get a BTC Address from your ETH private key
    const btcAddress = sdk.ethPubKeyToBtcAddress(wallet.publicKey);
    console.log({ btcAddress });

    // mint a PKP NFT
    const pkpInfo = await sdk.mintPkp();
    console.log({ pkpInfo });

    const utxos = await sdk.getUtxosByAddress(btcAddress);

    console.log({ utxos });
  });
});
