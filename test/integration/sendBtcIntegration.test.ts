import { ethers } from "ethers";
import { YachtLitSdk } from "../../src";
import {
  getMumbaiPrivateKey,
  getMumbaiProviderUrl,
} from "../../src/utils/environment";

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
  const recipientAddress = recipientSDK.generateBtcAddress(wallet.publicKey);

  console.log("Process.argv: ", process.argv);
  let pkpPublicKey = process.argv[4];
  pkpPublicKey = pkpPublicKey.slice(1, -1);
  const btcAddress = sdk.generateBtcAddress(pkpPublicKey);
  console.log({ pkpPublicKey });
  console.log(
    `Bitcoin address ${sdk.generateBtcAddress(
      pkpPublicKey,
    )} must have at least one unspent UTXO`,
  );

  beforeAll(async () => {
    const utxo = await sdk.getUtxoByAddress(btcAddress);
    if (!utxo) {
      throw new Error(
        `Bitcoin address ${sdk.generateBtcAddress(
          pkpPublicKey,
        )} must have at least one unspent UTXO`,
      );
    }
  });

  it("Should properly send UTXO", async () => {
    const signedTx = await sdk.signFirstBtcUtxo({
      pkpPublicKey,
      fee: 25,
      recipientAddress,
    });
    const tx = await sdk.broadcastBtcTransaction(signedTx);
    expect(tx).toBeTruthy();
  });
});
