import {
  getMumbaiPkpPublicKey,
  getMumbaiPrivateKey,
  getMumbaiProviderUrl,
} from "./../src/utils/environment";
import { Wallet, providers } from "ethers";
import { YachtLitSdk } from "../src/sdk";

const wallet = new Wallet(
  getMumbaiPrivateKey(),
  new providers.JsonRpcProvider(getMumbaiProviderUrl()),
);
const sdk = new YachtLitSdk({ signer: wallet, btcTestNet: true });
