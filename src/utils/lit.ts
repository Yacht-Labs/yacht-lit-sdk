import { ethers } from "ethers";
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
