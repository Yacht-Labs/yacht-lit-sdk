import { YachtLitSdk } from "../src";
import {
  getMumbaiPrivateKey,
  getMumbaiProviderUrl,
} from "../src/utils/environment";
import { ethers } from "ethers";

const provider = new ethers.providers.JsonRpcProvider(getMumbaiProviderUrl());

const wallet = new ethers.Wallet(getMumbaiPrivateKey(), provider);
const sdk = new YachtLitSdk({ signer: wallet, btcTestNet: true });

// sdk.mintPkp().then(console.log);
console.log(
  sdk.getPkpBtcAddress(
    "0x048d20ecf8a0fe6d1b09121b3d36d454717e77da0fa6cfedf2cbf764794e46b0a47ce51f7e0e8ec64afa7025d2fba1917ece2ce0f9c60d4a7bf019c8f5383ce7fb",
  ),
);
