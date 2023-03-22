import { providers, Wallet } from "ethers";
import { YachtLitSdk } from "../../src";
import {
  getMumbaiPrivateKey,
  getMumbaiProviderUrl,
} from "../../src/utils/environment";

const provider = new providers.JsonRpcProvider(getMumbaiProviderUrl());
const wallet = new Wallet(getMumbaiPrivateKey(), provider);
const sdk = new YachtLitSdk({ signer: wallet, btcTestNet: true });

describe("Signing Bitcoin UTXOs", () => {
  let pkpPublicKey: string;
  const FEE = 25;
  const recipientAddress = "mqnvzsHWFNZv5TYVMaSQ4yCfyCVgo3Bgch";

  beforeAll(async () => {
    const balance = await provider.getBalance(wallet.address);
    if (balance.eq(0)) {
      throw new Error(
        "Wallet balance is 0. Please fund the wallet with some Polygon Mumbai ETH to run tests",
      );
    }
    pkpPublicKey = (await sdk.mintPkp()).publicKey;
  });
  it("Should validate that a transaction was signed with the proper public key", async () => {
    expect(async () => {
      await sdk.signFirstBtcUtxo({
        pkpPublicKey: pkpPublicKey,
        fee: FEE,
        recipientAddress: recipientAddress,
      });
    }).not.toThrow();
  });

  it("Should error if the transaction was not signed with the proper public key", async () => {
    expect(async () => {
      await sdk.signFirstBtcUtxo({
        pkpPublicKey: "wrong",
        fee: FEE,
        recipientAddress: recipientAddress,
      });
    }).rejects.toThrow();
  });
});
