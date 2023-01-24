import {
  PKP_CONTRACT_ADDRESS_MUMBAI,
  PKP_PERMISSIONS_CONTRACT_ADDRESS,
} from "./../src/constants/index";
import { getBytesFromMultihash } from "../src/utils";
import { LitERC20SwapParams, YachtLitSdk } from "../src";
import { ethers } from "ethers";
import PKPNFTContract from "../src/abis/PKPNFT.json";
import PKPPermissionsContract from "../src/abis/PKPPermissions.json";
import { PKPNFT } from "../typechain-types/contracts/PKPNFT";
import { PKPPermissions } from "../typechain-types/contracts/PKPPermissions";
import {
  getMumbaiPrivateKey,
  getMumbaiProviderUrl,
} from "../src/utils/environment";

const provider = new ethers.providers.JsonRpcProvider(getMumbaiProviderUrl());
describe("Mint Grant Burn Tests", () => {
  const tokenAAddress = "0xBA62BCfcAaFc6622853cca2BE6Ac7d845BC0f2Dc"; // FAU TOKEN - GOERLI
  const tokenBAddress = "0xeDb95D8037f769B72AAab41deeC92903A98C9E16"; // TEST TOKEN - MUMBAI
  const sdk = new YachtLitSdk(
    new ethers.Wallet(
      // Add private key with at least .2 TEST MATIC to .env file to pass tests
      getMumbaiPrivateKey(),
      provider,
    ),
  );
  const chainAParams: LitERC20SwapParams = {
    counterPartyAddress: "0x630A5FA5eA0B94daAe707fE105404749D52909B9",
    tokenAddress: tokenAAddress,
    chain: "goerli",
    amount: "10",
    decimals: 18,
  };
  const chainBParams: LitERC20SwapParams = {
    counterPartyAddress: "0x96242814208590C563AAFB6270d6875A12C5BC45",
    tokenAddress: tokenBAddress,
    chain: "mumbai",
    amount: "10",
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
    ipfsCID = await sdk.getIPFSHash(LitActionCode + randomNonce);
    const sameIpfsCID = await sdk.getIPFSHash(LitActionCode + randomNonce);
    expect(typeof ipfsCID).toEqual("string");
    expect(ipfsCID).toEqual(sameIpfsCID);
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
  }, 40000);

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

  it("The PKP should not allow arbitrary Lit Action execution", async () => {
    const authSig = await sdk.generateAuthSig();
    const response = await sdk.runLitAction({
      authSig,
      pkpPublicKey: pkpNftPublicKey,
      code: `const go = async () => {
        // this is the string "Hello World" for testing
        const toSign = [72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100];
        // this requests a signature share from the Lit Node
        // the signature share will be automatically returned in the HTTP response from the node
        const sigShare = await Lit.Actions.signEcdsa({
          toSign,
          publicKey:
            "${pkpNftPublicKey}",
          sigName: "sig1",
        });
      };
      go();`,
      chainAMaxFeePerGas: "0",
      chainBMaxFeePerGas: "0",
    });
    expect(response).toBeUndefined;
  });

  it("The PKP can successfully execute the Lit Action that was granted", async () => {
    const authSig = await sdk.generateAuthSig();
    const response = await sdk.runLitAction({
      authSig,
      pkpPublicKey: pkpNftPublicKey,
      code: LitActionCode + randomNonce,
      chainAMaxFeePerGas: "0",
      chainBMaxFeePerGas: "0",
    });
    expect(response.response).toEqual("Conditions for swap not met!");
  }, 10000);
});
