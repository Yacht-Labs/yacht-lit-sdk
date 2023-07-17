import { YachtLitSdk } from "../../../src";
import { Wallet, providers } from "ethers";
import {
  getLitPrivateKey,
  getLitProviderUrl,
} from "../../../src/utils/environment";
describe("BTC Swap Test 1", () => {
  const litWallet = new Wallet(
    getLitPrivateKey(),
    new providers.JsonRpcProvider(getLitProviderUrl()),
  );
  const sdk = new YachtLitSdk({ signer: litWallet, btcTestNet: true });
  it("Should load the BTC swap", async () => {
    const btcParams = {
      counterPartyAddress: "2N3WBN3Z6Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5",
      network: "testnet",
      value: 8000,
      ethAddress: "0x0",
    };
    const ethParams = {
      counterPartyAddress: "0x0",
      chain: "ethereum",
      amount: "0.0001",
      btcAddress: "2N3WBN3Z6Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5",
    };
    const code = await sdk.generateBtcEthSwapLitActionCode(
      btcParams,
      ethParams,
      "TestTarget.js",
    );
    const targetString = `const btcSwapParams = {"counterPartyAddress":"2N3WBN3Z6Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5","network":"testnet","value":8000,"ethAddress":"0x0"};
const ethSwapParams = {"counterPartyAddress":"0x0","chain":"ethereum","amount":"0.0001","btcAddress":"2N3WBN3Z6Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5"};`;

    expect(code).toContain(targetString);
  });
});
