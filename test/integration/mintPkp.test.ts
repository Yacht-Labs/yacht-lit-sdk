/* eslint-disable @typescript-eslint/no-unused-vars */
import { ethers } from "ethers";
import { YachtLitSdk } from "../../src";
import { PKP_CONTRACT_ADDRESS_LIT } from "../../src/constants";
import {
  getLitPrivateKey,
  getLitProviderUrl,
  getMumbaiPrivateKey,
  getMumbaiProviderUrl,
} from "../../src/utils/environment";
import PKPNFTContract from "../../src/abis/PKPNFT.json";
import { PKPNFT } from "../../typechain-types/contracts/PKPNFT";

describe("Mint PKP", () => {
  const provider = new ethers.providers.JsonRpcProvider(getLitProviderUrl());
  provider.pollingInterval = 1000;
  const wallet = new ethers.Wallet(getLitPrivateKey(), provider);
  const sdk = new YachtLitSdk({ signer: wallet });
  const pkpContract = new ethers.Contract(
    PKP_CONTRACT_ADDRESS_LIT,
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
