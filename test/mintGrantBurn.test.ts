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
describe("Mint Grant Burn Tests", () => {
  const counterPartyAAddress = "0x630A5FA5eA0B94daAe707fE105404749D52909B9";
  const counterPartyBAddress = "0x96242814208590C563AAFB6270d6875A12C5BC45";
  const tokenAAddress = "0xBA62BCfcAaFc6622853cca2BE6Ac7d845BC0f2Dc"; // FAU TOKEN - GOERLI
  const tokenBAddress = "0xeDb95D8037f769B72AAab41deeC92903A98C9E16"; // TEST TOKEN - MUMBAI
  const sdk = new YachtLitSdk(
    new ethers.Wallet(
      // Add private key with at least .2 TEST MATIC to pass tests
      // ETH ADDRESS OF PRIVATE KEY BELOW: 0xe811b31f7f6054DBda8C15b1426d84bE6f2DD403
      "f3df8b10ac9be101d40ff4656b6d446f5dc400ed3b2545f3871fea8cff94d791",
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

  it("The PKP should not allow arbitrary Lit Action execution", async () => {
    const authSig = await sdk.generateAuthSig();
    const response = await sdk.runLitAction({
      authSig,
      pkpPublicKey: pkpNftPublicKey,
      code:`const go = async () => {
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
    });
    expect(response).toBeUndefined;

  });

  it("The PKP can successfully execute the Lit Action that was granted", async () => {
    // Because pinning the code to IPFS can take a variably (long) amount of time,
    // we use a preminted PKP to confirm the expected action here
    // You can find the details of the preminted NFT using tokenId: '70139713315300345978369823842850820255724642159163001633099360822662354333280'
    const preMintedPkpNftPublicKey = "0x04d27e0830e765c096b8bc65fc3d9659ace3719980d6f59bb5d19b26290bdba9495c8334efd21f426f620472f57a419a2dfedfc67847877f3ceee819a3963f8355";
    const authSig = await sdk.generateAuthSig();
    const response = await sdk.runLitAction({
      authSig,
      pkpPublicKey: preMintedPkpNftPublicKey,
      ipfsCID: "QmX6JFcNMowY2iL4N2yEZwvXhMpm1JfXpVEqwBEXbD1NWt",
    });
    expect(response.response).toEqual("Conditions for swap not met!");
  });
});
