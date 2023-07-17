import {
  LitBtcSwapParams,
  LitEthSwapParams,
  YachtLitSdk,
  UtxoResponse,
} from "../../../src";
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
  BTC_TESTNET_SWAP_AMOUNT,
  BTC_TESTNET_FEE,
} from "./BtcSwapTestFixtures";
import { getSourceKeyPair, sleep } from "../../../src/utils";
import { toOutputScript } from "bitcoinjs-lib/src/address";
import * as bitcoin from "bitcoinjs-lib";

let pkp: any;
let btcParams: LitBtcSwapParams;
let ethParams: LitEthSwapParams;
let code: string;
let ipfsCID: string;
describe("BTC Swap Test 5", () => {
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

  it("5 should return swap conditions not met when BTC is sent to the PKP address but ETH is not and clawback time is not elapsed", async () => {
    pkp = await sdk.mintGrantBurnWithLitAction(ipfsCID);
    const { address, keyPair } = getSourceKeyPair();
    const utxoResponse = await fetch(
      `https://mempool.space/testnet/api/address/${address}/utxo`,
    );
    const fetchUtxo = (await utxoResponse.json()) as UtxoResponse;
    const utxo = fetchUtxo[0];
    const tx = new bitcoin.Transaction();
    const pkpBtcAddress = sdk.generateBtcAddress(pkp.publicKey);
    tx.addInput(Buffer.from(utxo.txid, "hex").reverse(), utxo.vout);
    tx.addOutput(
      toOutputScript(pkpBtcAddress, bitcoin.networks.testnet),
      BTC_TESTNET_SWAP_AMOUNT,
    );
    tx.addOutput(
      toOutputScript(address!, bitcoin.networks.testnet),
      utxo.value - BTC_TESTNET_SWAP_AMOUNT - BTC_TESTNET_FEE,
    );
    const hashForSig = tx.hashForSignature(
      0,
      toOutputScript(address!, bitcoin.networks.testnet),
      bitcoin.Transaction.SIGHASH_ALL,
    );
    const signature0 = keyPair.sign(hashForSig);
    const signedInput = bitcoin.script.compile([
      bitcoin.script.signature.encode(
        signature0,
        bitcoin.Transaction.SIGHASH_ALL,
      ),
      keyPair.publicKey,
    ]);
    tx.setInputScript(0, signedInput);
    const returnResult = await sdk.broadcastBtcTransaction(tx);

    console.log({ returnResult });

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
      utxoIsValid: true,
      didSendBtcFromPkp: false,
      originTime: Date.now(),
    });

    expect(result.response?.response?.error).toEqual("Swap conditions not met");
  }, 90000);
});
