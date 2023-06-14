import { getLitPrivateKey, getLitProviderUrl } from "./environment";
import { Wallet, providers } from "ethers";
import { YachtLitSdk } from "../sdk";

const wallet = new Wallet(
  "f61166ca58f9ce75c66bcd2649cf2ba97fe68bbeba5f1b9ee7e158cd33a51b49",
  new providers.JsonRpcProvider("https://chain-rpc.litprotocol.com/http"),
);
const sdk = new YachtLitSdk({ signer: wallet, btcTestNet: true });

(async () => {
  const { publicKey } = await sdk.mintPkp();
  const btcAddress = await sdk.generateBtcAddress(publicKey);
  console.log(btcAddress + "." + publicKey);
})().catch((err) => {
  console.error(err);
});
