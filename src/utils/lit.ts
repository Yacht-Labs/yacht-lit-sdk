import { Wallet } from "@ethersproject/wallet";
import { computeAddress } from "@ethersproject/transactions";

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

export async function generateAuthSig(
  privateKey: string,
  chainId = 1,
  uri = "https://localhost/login",
  version = 1,
) {
  const messageToSign = `localhost wants you to sign in with your Ethereum account:\n${computeAddress(
    privateKey,
  )}\n\nThis is a key for Yacht-Lit-SDK\n\nURI: ${uri}\nVersion: ${version}\nChain ID: ${chainId}\nNonce: ${makeNonce()}\nIssued At: ${new Date().toISOString()}`;
  const wallet = new Wallet(privateKey);
  const sig = await wallet.signMessage(messageToSign);
  return {
    sig,
    derivedVia: "web3.eth.personal.sign",
    signedMessage: messageToSign,
    address: wallet.address,
  };
}
