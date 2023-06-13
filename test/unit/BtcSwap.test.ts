import { YachtLitSdk } from "../../src";

describe("BTC Swap", () => {
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

  // it should return swap conditions not met when neither ETH or BTC is sent to the PKP address

  // it should return swap conditions not met when ETH is sent to the PKP address but BTC is not and clawback time is not elapsed

  // it should return swap conditions not met when BTC is sent to the PKP address but ETH is not and clawback time is not elapsed

  // it should return ETH clawback signature and transaction when only ETH is sent to the PKP address and clawback time is elapsed

  // it should return BTC clawback signature and transaction when only BTC is sent to the PKP address and clawback time is elapsed

  // it should return ETH and BTC signatures and transactions when both ETH and BTC are sent to the PKP address

  // it should return ETH and BTC signatures and transactions when ETH is sent to PKP and the BTC has been sent out of PKP

  // it should return ETH and BTC signatures and transactions when BTC is sent to PKP and the ETH has been sent out of PKP
});
