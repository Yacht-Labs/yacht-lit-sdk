import { YachtLitSdk } from "../../src";

describe("Load BTC Swap", () => {
  const sdk = new YachtLitSdk({});
  it("Should load the BTC swap", async () => {
    const btcParams = {
      counterPartyAddress: "2N3WBN3Z6Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5",
      network: "testnet",
      amount: "0.0001",
      ethAddress: "0x0",
    };
    const ethParams = {
      counterPartyAddress: "0x0",
      chain: "ETH",
      amount: "0.0001",
      btcAddress: "2N3WBN3Z6Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5",
    };
    const code = await sdk.generateBtcEthSwapLitActionCode(
      btcParams,
      ethParams,
      "TestTarget.js",
    );
    const targetString = `const btcSwapParams = {"counterPartyAddress":"2N3WBN3Z6Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5","network":"testnet","amount":"0.0001","ethAddress":"0x0"};
const ethSwapParams = {"counterPartyAddress":"0x0","chain":"ETH","amount":"0.0001","btcAddress":"2N3WBN3Z6Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5"};`;
    //console.log(code);
    expect(code).toContain(targetString);
  });
});
