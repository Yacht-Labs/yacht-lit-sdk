import { create } from "ipfs-core";
import ECPairFactory from "ecpair";
import * as ecc from "tiny-secp256k1";
import * as bitcoin from "bitcoinjs-lib";
import { getBtcTestnetWif } from "./environment";

const ECPair = ECPairFactory(ecc);
const testnet = bitcoin.networks.testnet;

const getBtcWif = () => {
  const keyPair = ECPair.makeRandom({ network: testnet });
  const wif = keyPair.toWIF();
  console.log({ wif });
  return wif;
};

export const getSourceKeyPair = () => {
  const keyPair = ECPair.fromWIF(getBtcTestnetWif(), testnet);
  const { address } = bitcoin.payments.p2pkh({
    pubkey: keyPair.publicKey,
    network: testnet,
  });
  return { keyPair, address };
};

export function reverseBuffer(buffer: Buffer): Buffer {
  if (buffer.length < 1) return buffer;
  let j = buffer.length - 1;
  let tmp = 0;
  for (let i = 0; i < buffer.length / 2; i++) {
    tmp = buffer[i];
    buffer[i] = buffer[j];
    buffer[j] = tmp;
    j--;
  }
  return buffer;
}

export const validator = (
  pubkey: Buffer,
  msghash: Buffer,
  signature: Buffer,
): boolean => ECPair.fromPublicKey(pubkey).verify(msghash, signature);
