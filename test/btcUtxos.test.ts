import {
  getMumbaiPkpPublicKey,
  getMumbaiPrivateKey,
  getMumbaiProviderUrl,
} from "./../src/utils/environment";
import { Wallet, providers } from "ethers";
import { YachtLitSdk } from "../src/sdk";
import { UTXO } from "../src/@types/yacht-lit-sdk";
import * as bitcoin from "bitcoinjs-lib";
import { toOutputScript } from "bitcoinjs-lib/src/address";

const wallet = new Wallet(
  getMumbaiPrivateKey(),
  new providers.JsonRpcProvider(getMumbaiProviderUrl()),
);
const sdk = new YachtLitSdk({ signer: wallet, btcTestNet: true });

const stubUTXO: UTXO = {
  txid: "1d126542ec070387cc21b9fb9035a76cc1e12cd4fe021a884cfdabc3ed315a73",
  vout: 0,
  status: {
    confirmed: true,
    block_height: 2425194,
    block_hash:
      "000000000000000e6e0a45601a98694bc2e47736f6b909c04408e4f6f736f96d",
    block_time: 1679324880,
  },
  value: 9328,
};
jest.mock("node-fetch", () => {
  return jest.fn().mockImplementation(() => {
    return {
      ok: true,
      json: () => {
        return [stubUTXO];
      },
    };
  });
});

describe("Bitcoin UTXOs", () => {
  const FEE = 25;
  const recipientAddress = "mqnvzsHWFNZv5TYVMaSQ4yCfyCVgo3Bgch";

  it("Should properly sign a transaction with public key", async () => {
    expect(async () => {
      await sdk.signFirstBtcUtxo({
        pkpPublicKey: getMumbaiPkpPublicKey(),
        fee: FEE,
        recipientAddress: recipientAddress,
      });
    }).not.toThrow();
  });

  xit("should do other stuff, too", async () => {
    const transaction = await sdk.signFirstBtcUtxo({
      pkpPublicKey: getMumbaiPkpPublicKey(),
      fee: FEE,
      recipientAddress: recipientAddress,
    });
    const hashForSig = transaction.hashForSignature(
      0,
      toOutputScript(
        sdk.getPkpBtcAddress(getMumbaiPkpPublicKey()),
        bitcoin.networks.testnet,
      ),
      bitcoin.Transaction.SIGHASH_ALL,
    );
    console.dir(transaction);
  });
});
