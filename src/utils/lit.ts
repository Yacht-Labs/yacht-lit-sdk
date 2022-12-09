import { ethers, UnsignedTransaction } from "ethers";
import bs58 from "bs58";
import { SiweMessage } from "siwe";

function makeNonce() {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < 16; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}

export type LitAuthSig = {
  sig: string;
  derivedVia: string;
  signedMessage: string;
  address: string;
};

export async function generateAuthSig(
  signer: ethers.Signer,
  chainId = 1,
  uri = "https://localhost/login",
  version = "1",
): Promise<LitAuthSig> {
  const siweMessage = new SiweMessage({
    domain: "localhost",
    address: await signer.getAddress(),
    statement: "This is a key for Yacht",
    uri,
    version,
    chainId,
  });
  const messageToSign = siweMessage.prepareMessage();
  const sig = await signer.signMessage(messageToSign);
  return {
    sig,
    derivedVia: "web3.eth.personal.sign",
    signedMessage: messageToSign,
    address: await signer.getAddress(),
  };
}

export function getBytesFromMultihash(multihash: string): string {
  const decoded = bs58.decode(multihash);
  return `0x${Buffer.from(decoded).toString("hex")}`;
}

export function sleep(ms: number) {
  console.log("....zzzzzzZZZzzzzz....");
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export function checkHasThreeDaysPassed(previousTime: number) {
  const currentTime = Date.now();
  const difference = currentTime - previousTime;
  return difference / (1000 * 3600 * 24) >= 3 ? true : false;
}

export function didCounterPartySendTransaction(tx: UnsignedTransaction) {
  const chain = tx.chainId;
}

export function getBytes32FromMultihash(multihash: string) {
  const decoded = bs58.decode(multihash);

  return {
    digest: `0x${Buffer.from(decoded.slice(2)).toString("hex")}`,
    hashFunction: decoded[0],
    size: decoded[1],
  };
}

export function ipfsIdToIpfsIdHash(ipfsId: string) {
  const multihashStruct = getBytes32FromMultihash(ipfsId);
  // console.log("multihashStruct", multihashStruct);
  const packed = ethers.utils.solidityPack(
    ["bytes32", "uint8", "uint8"],
    [
      multihashStruct.digest,
      multihashStruct.hashFunction,
      multihashStruct.size,
    ],
  );
  return ethers.utils.keccak256(packed);
}
