import { getMumbaiPrivateKey, getMumbaiProviderUrl } from "./environment";
import { Wallet, providers } from "ethers";
import { YachtLitSdk } from "../sdk";

const wallet = new Wallet(
  getMumbaiPrivateKey(),
  new providers.JsonRpcProvider(getMumbaiProviderUrl()),
);
const sdk = new YachtLitSdk({ signer: wallet, btcTestNet: true });

(async () => {
  const { publicKey } = await sdk.mintPkp();
  const btcAddress = await sdk.generateBtcAddress(publicKey);
  console.log(btcAddress + "." + publicKey);
})().catch((err) => {
  console.error(err);
});
