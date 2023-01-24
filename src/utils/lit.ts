import { ethers } from "ethers";
import bs58 from "bs58";
import { SiweMessage } from "siwe";

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
