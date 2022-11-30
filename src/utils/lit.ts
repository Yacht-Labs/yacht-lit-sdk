import { ethers, UnsignedTransaction } from "ethers";
import bs58 from "bs58";

function makeNonce() {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  for (let i = 0; i < 8; i++) {
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
  version = 1,
): Promise<LitAuthSig> {
  const messageToSign = `localhost wants you to sign in with your Ethereum account:\n${await signer.getAddress()},
  )}\n\nThis is a key for Yacht-Lit-SDK\n\nURI: ${uri}\nVersion: ${version}\nChain ID: ${chainId}\nNonce: ${makeNonce()}\nIssued At: ${new Date().toISOString()}`;
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

export function hasThreeDaysPassed(previousTime: number) {
  const currentTime = Date.now();
  const difference = currentTime - previousTime;
  return difference / (1000 * 3600 * 24) >= 3 ? true : false;
}

export function didCounterPartySendTransaction(tx: UnsignedTransaction) {
  const chain = tx.chainId;
}

// ethereum: 1;
// polygon: 137;
// fantom: 250;
// xdai: 100;
// bsc: 56;
// arbitrum: 42161;
// avalanche: 43114;
// fuji: 43113;
// harmony: 1666600000;
// kovan: 42;
// mumbai: 80001;
// goerli: 5;
// ropsten: 3;
// rinkeby: 4;
// cronos: 25;
// optimism: 10;
// celo: 42220;
// aurora: 1313161554;
// eluvio: 955305;
// alfajores: 44787;
// xdc: 50;
// evmos: 9001;
// evmosTestnet: 9000;
