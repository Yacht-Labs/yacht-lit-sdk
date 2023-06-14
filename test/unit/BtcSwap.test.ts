import { LitBtcSwapParams, LitEthSwapParams, YachtLitSdk } from "../../src";
import * as bitcoin from "bitcoinjs-lib";
import { ECPairFactory } from "ecpair";
import * as ecc from "tiny-secp256k1";
import { Wallet, providers } from "ethers";
import {
  getLitPrivateKey,
  getLitProviderUrl,
} from "../../src/utils/environment";
const ECPair = ECPairFactory(ecc);

export function generateBtcParams(): LitBtcSwapParams {
  const { address } = bitcoin.payments.p2pkh({
    pubkey: ECPair.makeRandom().publicKey,
    network: bitcoin.networks.testnet,
  });
  const btcParams = {
    counterPartyAddress: address!,
    network: "testnet",
    value: 8000,
    ethAddress: Wallet.createRandom().address,
  };
  return btcParams;
}

export function generateEthParams(): LitEthSwapParams {
  const { address } = bitcoin.payments.p2pkh({
    pubkey: ECPair.makeRandom().publicKey,
    network: bitcoin.networks.testnet,
  });
  const ethParams = {
    counterPartyAddress: Wallet.createRandom().address,
    chain: "ethereum",
    amount: "0.0001",
    btcAddress: address!,
  };
  return ethParams;
}

describe("BTC Swap", () => {
  const wallet = new Wallet(
    getLitPrivateKey(),
    new providers.JsonRpcProvider(getLitProviderUrl()),
  );
  const sdk = new YachtLitSdk({ signer: wallet, btcTestNet: true });
  xit("Should load the BTC swap", async () => {
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
    const targetString = `const btcSwapParams = {"counterPartyAddress":"2N3WBN3Z6Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5","network":"testnet","amount":"0.0001","ethAddress":"0x0"};
const ethSwapParams = {"counterPartyAddress":"0x0","chain":"ETH","amount":"0.0001","btcAddress":"2N3WBN3Z6Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5Y5"};`;
    //console.log(code);
    expect(code).toContain(targetString);
  });

  it("should return swap conditions not met when neither ETH or BTC is sent to the PKP address", async () => {
    const btcParams = {
      ...generateBtcParams(),
    };
    const ethParams = generateEthParams();
    const code = await sdk.generateBtcEthSwapLitActionCode(
      btcParams,
      ethParams,
    );
    const ipfsCID = await sdk.getIPFSHash(code);
    const pkp = await sdk.mintGrantBurnWithLitAction(ipfsCID);

    console.log(pkp);
    const result = await sdk.runBtcEthSwapLitAction({
      pkpPublicKey: pkp.publicKey,
      code,
      btcParams,
      ethParams,
      btcFeeRate: 10,
      ethGasConfig: {
        maxFeePerGas: "100000000000",
        maxPriorityFeePerGas: "40000000000",
        gasLimit: "21000",
      },
    });
    console.log(result);
  }, 90000);

  // it should return swap conditions not met when neither ETH or BTC is sent to the PKP address

  // it should return swap conditions not met when ETH is sent to the PKP address but BTC is not and clawback time is not elapsed

  // it should return swap conditions not met when BTC is sent to the PKP address but ETH is not and clawback time is not elapsed

  // it should return ETH clawback signature and transaction when only ETH is sent to the PKP address and clawback time is elapsed

  // it should return BTC clawback signature and transaction when only BTC is sent to the PKP address and clawback time is elapsed

  // it should return ETH and BTC signatures and transactions when both ETH and BTC are sent to the PKP address

  // it should return ETH and BTC signatures and transactions when ETH is sent to PKP and the BTC has been sent out of PKP

  // it should return ETH and BTC signatures and transactions when BTC is sent to PKP and the ETH has been sent out of PKP
});
