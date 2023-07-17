import { LitBtcSwapParams, LitEthSwapParams, YachtLitSdk } from "../../../src";
import { Wallet, providers } from "ethers";
import {
  getLitPrivateKey,
  getLitProviderUrl,
} from "../../../src/utils/environment";
import { generateBtcParams, generateEthParams } from "./BtcSwapTestFixtures";

let pkp: any;
let btcParams: LitBtcSwapParams;
let ethParams: LitEthSwapParams;
let code: string;
let ipfsCID: string;
describe("BTC Swap Test 2", () => {
  const litprovider = new providers.JsonRpcProvider(getLitProviderUrl());
  litprovider.pollingInterval = 1000;

  const litWallet = new Wallet(
    getLitPrivateKey(),
    new providers.JsonRpcProvider(getLitProviderUrl()),
  );
  const sdk = new YachtLitSdk({ signer: litWallet, btcTestNet: true });

  beforeAll(async () => {
    btcParams = generateBtcParams();
    ethParams = generateEthParams();
    code = await sdk.generateBtcEthSwapLitActionCode(btcParams, ethParams);
    ipfsCID = await sdk.getIPFSHash(code);
  }, 90000);

  it("should throw an error when neither BTC nor ETH has been sent to the public key", async () => {
    pkp = await sdk.mintGrantBurnWithLitAction(ipfsCID);

    await expect(
      sdk.runBtcEthSwapLitAction({
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
        originTime: Date.now(),
        utxoIsValid: false,
        didSendBtcFromPkp: false,
      }),
    ).rejects.toThrow();
  }, 90000);
});
