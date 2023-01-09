import {
  PKP_CONTRACT_ADDRESS_MUMBAI,
  PKP_PERMISSIONS_CONTRACT_ADDRESS,
} from "./../src/constants/index";
import { getBytesFromMultihash } from "../src/utils";
import { YachtLitSdk } from "../src";
import { ethers } from "ethers";
import PKPNFTContract from "../src/abis/PKPNFT.json";
import PKPPermissionsContract from "../src/abis/PKPPermissions.json";
import { PKPNFT } from "../typechain-types/contracts/PKPNFT";
import { PKPPermissions } from "../typechain-types/contracts/PKPPermissions";

const provider = new ethers.providers.JsonRpcProvider(
  "https://polygon-mumbai.g.alchemy.com/v2/fbWG-Mg4NtNwWVOP-MyV73Yu5EGxLT8Z",
);
describe("Mint Grant BurnTests", () => {
  const counterPartyAAddress = "0x630A5FA5eA0B94daAe707fE105404749D52909B9";
  const counterPartyBAddress = "0x96242814208590C563AAFB6270d6875A12C5BC45";
  const tokenAAddress = "0xBA62BCfcAaFc6622853cca2BE6Ac7d845BC0f2Dc"; // FAU TOKEN - GOERLI
  const tokenBAddress = "0xeDb95D8037f769B72AAab41deeC92903A98C9E16"; // TEST TOKEN - MUMBAI
  const sdk = new YachtLitSdk(
    new ethers.Wallet(
      // Add private key with Matic to pass tests
      "b6d84955bc272c590344b528e4cebc73a72b0fc250b176680ff39807ee272f2b",
      provider,
    ),
  );
  const chainAParams = {
    counterPartyAddress: counterPartyAAddress,
    tokenAddress: tokenAAddress,
    chain: "goerli",
    amount: "16",
    decimals: 18,
  };
  const chainBParams = {
    counterPartyAddress: counterPartyBAddress,
    tokenAddress: tokenBAddress,
    chain: "mumbai",
    amount: "8",
    decimals: 18,
  };
  let LitActionCode: string;
  let ipfsCID: string;
  let randomNonce: string;
  let pkpTokenId: string;
  let pkpNftPublicKey: string;
  beforeAll(() => {
    LitActionCode = sdk.createERC20SwapLitAction(chainAParams, chainBParams);
    randomNonce = `\n// ${Math.random().toString()}`;
  });

  it("Generates an IPFSCID", async () => {
    ipfsCID = await sdk.uploadToIPFS(LitActionCode + randomNonce);
    expect(typeof ipfsCID).toEqual("string");
    expect(ipfsCID).not.toBeFalsy();
  });

  it("Mints a PKP with a token ID and public key", async () => {
    const pkpTokenData = await sdk.mintGrantBurnWithLitAction(ipfsCID);
    const pkpContract = new ethers.Contract(
      PKP_CONTRACT_ADDRESS_MUMBAI,
      PKPNFTContract.abi,
      provider,
    ) as PKPNFT;
    pkpTokenId = pkpTokenData.tokenId;
    pkpNftPublicKey = await pkpContract.getPubkey(pkpTokenId);
    expect(pkpNftPublicKey).toEqual(pkpTokenData.publicKey);
  }, 30000);

  it("The PKP has permissions to run the ipfsCID", async () => {
    const pkpPermissionsContract = new ethers.Contract(
      PKP_PERMISSIONS_CONTRACT_ADDRESS,
      PKPPermissionsContract.abi,
      provider,
    ) as PKPPermissions;
    const [permittedAction] = await pkpPermissionsContract.getPermittedActions(
      ethers.BigNumber.from(pkpTokenId),
    );
    expect(getBytesFromMultihash(ipfsCID)).toEqual(permittedAction);
  }, 10000);

  it("The tokenID has no owner", async () => {
    const pkpContract = new ethers.Contract(
      PKP_CONTRACT_ADDRESS_MUMBAI,
      PKPNFTContract.abi,
      provider,
    ) as PKPNFT;
    await expect(pkpContract.ownerOf(pkpTokenId)).rejects.toThrow();
  });
});
