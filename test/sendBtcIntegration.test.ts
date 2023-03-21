import { ethers } from "ethers";
import { YachtLitSdk } from "../src";
import {
  getMumbaiPkpPublicKey,
  getMumbaiPrivateKey,
  getMumbaiProviderUrl,
} from "../src/utils/environment";

describe("Bitcoin send utxo integration test", () => {
  const wallet = new ethers.Wallet(
    getMumbaiPrivateKey(),
    new ethers.providers.JsonRpcProvider(getMumbaiProviderUrl()),
  );
  const sdk = new YachtLitSdk({
    btcTestNet: true,
    signer: wallet,
  });

  const recipientWallet = ethers.Wallet.createRandom();
  const recipientSDK = new YachtLitSdk({
    btcTestNet: true,
    signer: recipientWallet,
  });
  const recipientAddress = recipientSDK.getPkpBtcAddress(wallet.publicKey);

  // let pkpPublicKey = process.argv[4];
  // pkpPublicKey = pkpPublicKey.slice(1, -1);
  // console.log({ pkpPublicKey });
  // console.log(
  //   `Bitcoin address ${sdk.getPkpBtcAddress(
  //     pkpPublicKey,
  //   )} must have at least one unspent UTXO`,
  // );

  it("Should properly send UTXO", async () => {
    const signedTx = await sdk.signFirstBtcUtxo({
      pkpPublicKey:
        "0x04eb82422a50338ca6c7e5b3514e4dbf317f32033f522b4eb2b842b4ec6e63eec3edb1d4e9b32372ed22ee3def425e75f1d369e68348fedb5199077b0e58db6fc3",
      fee: 25,
      recipientAddress,
    });
    console.log({ signedTx });
    const tx = await sdk.broadcastBtcTransaction(signedTx);
    console.dir(tx, { depth: null });
    expect(tx).toBeTruthy();
  });
});
