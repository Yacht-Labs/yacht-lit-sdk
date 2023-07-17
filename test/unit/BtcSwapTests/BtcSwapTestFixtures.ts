import { LitBtcSwapParams, LitEthSwapParams } from "../../../src";
import * as bitcoin from "bitcoinjs-lib";
import { ECPairFactory } from "ecpair";
import * as ecc from "tiny-secp256k1";
import { Wallet } from "ethers";

export const EVM_SWAP_AMOUNT = "0.0001";
export const BTC_TESTNET_SWAP_AMOUNT = 5000;
export const BTC_TESTNET_FEE = 1000;

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
