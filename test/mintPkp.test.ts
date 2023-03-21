/* eslint-disable @typescript-eslint/no-unused-vars */
import { ethers } from "ethers";
import { YachtLitSdk } from "../src";
import { PKP_CONTRACT_ADDRESS_MUMBAI } from "../src/constants";
import {
  getMumbaiPrivateKey,
  getMumbaiProviderUrl,
} from "../src/utils/environment";
import PKPNFTContract from "../src/abis/PKPNFT.json";
import { PKPNFT } from "../typechain-types/contracts/PKPNFT";

const provider = new ethers.providers.JsonRpcProvider(getMumbaiProviderUrl());

describe("Mint PKP", () => {
  const wallet = new ethers.Wallet(getMumbaiPrivateKey(), provider);
  const sdk = new YachtLitSdk(wallet);
  const pkpContract = new ethers.Contract(
    PKP_CONTRACT_ADDRESS_MUMBAI,
    PKPNFTContract.abi,
    provider,
  ) as PKPNFT;
  let pkpInfo: {
    tokenId: string;
    publicKey: string;
    address: string;
  };
  beforeAll(async () => {
    pkpInfo = await sdk.mintPkp();
  }, 100000);
  it("Mints a PKP with a token ID and public key", async () => {
    expect(pkpInfo.tokenId).toBeTruthy();
    expect(pkpInfo.publicKey).toBeTruthy();
    const pkpNftPublicKey = await pkpContract.getPubkey(pkpInfo.tokenId);
    expect(pkpNftPublicKey).toEqual(pkpInfo.publicKey);
  });

  it("The PKP is owned by the sdk wallet", async () => {
    const pkpOwner = await pkpContract.ownerOf(pkpInfo.tokenId);
    expect(pkpOwner).toEqual(wallet.address);
  });
});
