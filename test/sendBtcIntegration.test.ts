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

  console.log(
    `Bitcoin address ${sdk.getPkpBtcAddress(
      getMumbaiPkpPublicKey(),
    )} must have at least one unspent UTXO`,
  );

  it("Should properly send UTXO", async () => {
    const signedTx = await sdk.signFirstBtcUtxo({
      pkpPublicKey: getMumbaiPkpPublicKey(),
      fee: 25,
      recipientAddress: recipientAddress,
    });
    console.log({ signedTx });
    const tx = await sdk.broadcastBtcTransaction(signedTx);
    console.dir(tx, { depth: null });
    expect(tx).toBeTruthy();
  });
});
