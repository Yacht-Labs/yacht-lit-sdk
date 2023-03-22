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
  const FEE = 10;

  let pkpPublicKey = process.argv[4];
  pkpPublicKey = pkpPublicKey.slice(1, -1);

  console.log({ pkpPublicKey });
  const btcAddress = sdk.generateBtcAddress(pkpPublicKey);
  console.log(
    `Bitcoin address ${sdk.generateBtcAddress(
      pkpPublicKey,
    )} must have at least one unspent UTXO`,
  );

  beforeAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 10000));
    const utxo = await sdk.getUtxoByAddress(btcAddress);
    if (!utxo) {
      throw new Error(
        `Bitcoin address ${sdk.generateBtcAddress(
          pkpPublicKey,
        )} must have at least one unspent UTXO`,
      );
    }
  }, 100000);

  it("Should validate that a transaction was signed with the proper public key", async () => {
    expect(async () => {
      await sdk.signFirstBtcUtxo({
        pkpPublicKey: pkpPublicKey,
        fee: FEE,
        recipientAddress: recipientAddress,
      });
    }).not.toThrow();
  }, 100000);

  it("Should error if the transaction was not signed with the proper public key", async () => {
    expect(async () => {
      await sdk.signFirstBtcUtxo({
        pkpPublicKey: "wrong",
        fee: FEE,
        recipientAddress: recipientAddress,
      });
    }).rejects.toThrow();
  }, 100000);

  it("Should properly send UTXO", async () => {
    const signedTx = await sdk.signFirstBtcUtxo({
      pkpPublicKey,
      fee: 25,
      recipientAddress,
    });
    const txId = await sdk.broadcastBtcTransaction(signedTx);
    expect(txId).toBeTruthy();
    const endpoint = "https://blockstream.info/testnet/api/tx";
    const response = await fetch(`${endpoint}/${txId}`);
    const data: {
      vin: [
        {
          txid: string;
          prevout: { scriptpubkey_address: string };
        },
      ];
      vout: [{ scriptpubkey_address: string }];
    } = await response.json();
    expect(data.vin[0].prevout.scriptpubkey_address).toBe(btcAddress);
    expect(data.vout[0].scriptpubkey_address).toBe(recipientAddress);
  });
});
