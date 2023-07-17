import { LitBtcSwapParams, LitEthSwapParams, YachtLitSdk } from "../../../src";
import { Wallet, providers, ethers } from "ethers";
import {
  getLitPrivateKey,
  getLitProviderUrl,
  getGoerliPrivateKey,
  getGoerliProviderUrl,
} from "../../../src/utils/environment";
import {
  generateBtcParams,
  generateEthParams,
  EVM_SWAP_AMOUNT,
} from "./BtcSwapTestFixtures";

let pkp: any;
let btcParams: LitBtcSwapParams;
let ethParams: LitEthSwapParams;
let code: string;
let ipfsCID: string;
describe("BTC Swap Test 3", () => {
  const litprovider = new providers.JsonRpcProvider(getLitProviderUrl());
  litprovider.pollingInterval = 1000;
  const evmProvider = new providers.JsonRpcProvider(getGoerliProviderUrl());
  evmProvider.pollingInterval = 1000;

  const litWallet = new Wallet(
    getLitPrivateKey(),
    new providers.JsonRpcProvider(getLitProviderUrl()),
  );
  const wallet = new Wallet(
    getGoerliPrivateKey(),
    new providers.JsonRpcProvider(getGoerliProviderUrl()),
  );
  const sdk = new YachtLitSdk({ signer: litWallet, btcTestNet: true });

  beforeAll(async () => {
    btcParams = generateBtcParams();
    ethParams = generateEthParams();
    code = await sdk.generateBtcEthSwapLitActionCode(btcParams, ethParams);
    ipfsCID = await sdk.getIPFSHash(code);
  }, 90000);

  it("should return swap conditions not met when ETH is sent to the PKP address but BTC is not and clawback time is not elapsed", async () => {
    pkp = await sdk.mintGrantBurnWithLitAction(ipfsCID);
    try {
      const tx = await wallet.sendTransaction({
        to: pkp.address,
        value: ethers.utils.parseEther(EVM_SWAP_AMOUNT),
      });
      await tx.wait();

      const result = await sdk.runBtcEthSwapLitAction({
        pkpPublicKey: pkp.publicKey,
        code,
        btcParams,
        ethParams,
        btcFeeRate: 10,
        isEthClawback: true,
        ethGasConfig: {
          maxFeePerGas: "100000000000",
          maxPriorityFeePerGas: "40000000000",
          gasLimit: "21000",
        },
        originTime: Date.now(),
        utxoIsValid: false,
        didSendBtcFromPkp: false,
      });
      console.log({ result });
      expect(result.response?.response?.error).toEqual(
        "Swap conditions not met",
      );
    } catch (e) {
      console.log(e);
    }
  }, 90000);
});
