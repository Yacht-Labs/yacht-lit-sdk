import { readEnv } from "./../../src/utils/environment";
import {
  LitBtcSwapParams,
  LitEthSwapParams,
  UtxoResponse,
  YachtLitSdk,
} from "../../src";
import * as bitcoin from "bitcoinjs-lib";
import { ECPairFactory } from "ecpair";
import * as ecc from "tiny-secp256k1";
import { Wallet, providers, ethers } from "ethers";
import {
  getLitPrivateKey,
  getLitProviderUrl,
  getMumbaiPrivateKey,
  getMumbaiProviderUrl,
  getGoerliPrivateKey,
  getGoerliProviderUrl,
} from "../../src/utils/environment";
import { getSourceKeyPair } from "../../src/utils";
import { toOutputScript } from "bitcoinjs-lib/src/address";

const EVM_SWAP_AMOUNT = "0.0001";
const BTC_TESTNET_SWAP_AMOUNT = 5000;
const BTC_TESTNET_FEE = 1000;

const ECPair = ECPairFactory(ecc);

export function generateBtcParams(): LitBtcSwapParams {
  const { address } = bitcoin.payments.p2pkh({
    pubkey: ECPair.makeRandom().publicKey,
    network: bitcoin.networks.testnet,
  });
  const btcParams = {
    counterPartyAddress: address!,
    network: "testnet",
    value: BTC_TESTNET_SWAP_AMOUNT,
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
    chain: "goerli",
    amount: EVM_SWAP_AMOUNT,
    btcAddress: address!,
  };
  return ethParams;
}

let pkp: any;
let btcParams: LitBtcSwapParams;
let ethParams: LitEthSwapParams;
let code: string;
let ipfsCID: string;

describe("BTC Swap", () => {
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
  });

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

  xit("should throw an error when neither BTC nor ETH has been sent to the public key", async () => {
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
      }),
    ).rejects.toThrow();
  }, 90000);

  xit("should return swap conditions not met when ETH is sent to the PKP address but BTC is not and clawback time is not elapsed", async () => {
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
      });
      console.log({ result });
      expect(result.response?.response?.error).toEqual(
        "Swap conditions not met",
      );
    } catch (e) {
      console.log(e);
    }
  }, 90000);

  xit("should return ETH clawback signature and transaction when only ETH is sent to the PKP address and clawback time is elapsed", async () => {
    pkp = await sdk.mintGrantBurnWithLitAction(ipfsCID);
    const tx = await wallet.sendTransaction({
      to: pkp.address,
      value: ethers.utils.parseEther(EVM_SWAP_AMOUNT),
    });
    await tx.wait();

    const fourDaysAgo = Date.now() - 4 * 24 * 60 * 60 * 1000;

    const result = await sdk.runBtcEthSwapLitAction({
      pkpPublicKey: pkp.publicKey,
      code,
      btcParams,
      ethParams,
      btcFeeRate: 10,
      isEthClawback: true,
      originTime: fourDaysAgo,
      utxoIsValid: false,
      didSendBtcFromPkp: false,
      ethGasConfig: {
        maxFeePerGas: "100000000000",
        maxPriorityFeePerGas: "40000000000",
        gasLimit: "21000",
      },
    });
    console.log({ result });
    expect(result.response?.response?.evmClawbackTransaction).toBeDefined();
  }, 90000);

  xit("should return swap conditions not met when BTC is sent to the PKP address but ETH is not and clawback time is not elapsed", async () => {
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
    });

    expect(result.response?.response?.error).toEqual("Swap conditions not met");
  }, 90000);
  xit("it should return BTC clawback signature and transaction when only BTC is sent to the PKP address and clawback time is elapsed", async () => {
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

    const fourDaysAgo = Date.now() - 4 * 24 * 60 * 60 * 1000;

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
      originTime: fourDaysAgo,
      utxoIsValid: true,
      didSendBtcFromPkp: false,
    });
    console.log(result.response?.response?.btcTransaction);
    expect(result.response?.response?.btcClawbackTransaction).toBeDefined();
  }, 90000);

  // it should return ETH and BTC signatures and transactions when both ETH and BTC are sent to the PKP address
  xit("should return ETH and BTC signatures and transactions when both ETH and BTC are sent to the PKP address", async () => {
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
  });

  // it should return ETH and BTC signatures and transactions when ETH is sent to PKP and the BTC has been sent out of PKP
  it("it should return ETH and BTC signatures and transactions when ETH is sent to PKP and the BTC has been sent out of PKP", async () => {
    pkp = await sdk.mintGrantBurnWithLitAction(ipfsCID);
    const etx = await wallet.sendTransaction({
      to: pkp.address,
      value: ethers.utils.parseEther(EVM_SWAP_AMOUNT),
    });
    await etx.wait();

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

    const result = await sdk.runBtcEthSwapLitAction({
      pkpPublicKey: pkp.publicKey,
      code,
      btcParams,
      ethParams,
      btcFeeRate: 10,
      utxoIsValid: true,
      didSendBtcFromPkp: true,
      ethGasConfig: {
        maxFeePerGas: "100000000000",
        maxPriorityFeePerGas: "40000000000",
        gasLimit: "21000",
      },
    });
    console.log({ result });
    expect(result.response?.response?.btcTransaction).toBeDefined();
    expect(result.response?.response?.evmTransaction).toBeDefined();
  }, 90000);

  // it should return ETH and BTC signatures and transactions when BTC is sent to PKP and the ETH has been sent out of PKP
});
