import { PKP_CONTRACT_ADDRESS_MUMBAI } from "./../src/constants/index";
import { generateAuthSig, YachtLitSdk } from "../src";
import { ethers } from "ethers";
import { sleep } from "../src";
import PKPNFTContract from "../src/abis/PKPNFT.json";
import { PKPNFT } from "../typechain-types/contracts";

describe("Mint Grant BurnTests", () => {
  const counterPartyAAddress = "0x630A5FA5eA0B94daAe707fE105404749D52909B9";
  const counterPartyBAddress = "0x96242814208590C563AAFB6270d6875A12C5BC45";
  const tokenAAddress = "0xBA62BCfcAaFc6622853cca2BE6Ac7d845BC0f2Dc"; // FAU TOKEN
  const tokenBAddress = "0xeDb95D8037f769B72AAab41deeC92903A98C9E16"; // TEST TOKEN
  const sdk = new YachtLitSdk(
    new ethers.providers.JsonRpcProvider(
      "https://polygon-mumbai.g.alchemy.com/v2/fbWG-Mg4NtNwWVOP-MyV73Yu5EGxLT8Z",
    ),
    "serrano",
    new ethers.Wallet(
      // Add private key with Matic to pass tests
      "b6d84955bc272c590344b528e4cebc73a72b0fc250b176680ff39807ee272f2b",
      new ethers.providers.JsonRpcProvider(
        "https://polygon-mumbai.g.alchemy.com/v2/fbWG-Mg4NtNwWVOP-MyV73Yu5EGxLT8Z",
      ),
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
  let publicKey: string;
  beforeAll(async () => {
    LitActionCode = await sdk.createERC20SwapLitAction(
      chainAParams,
      chainBParams,
    );
    randomNonce = `\n// ${Math.random().toString()}`;
    ipfsCID = await sdk.uploadToIPFS(LitActionCode + randomNonce);
    await sleep(10000);
    const pkpTokenData = await sdk.mintGrantBurnWithLitAction(ipfsCID);
    pkpTokenId = pkpTokenData.pkp.tokenId;
    publicKey = pkpTokenData.pkp.publicKey;
  }, 60000);

  it("Uploads the code to IPFS", async () => {
    const code = await (
      await fetch(`https://cloudflare-ipfs.com/ipfs/${ipfsCID}`)
    ).text();
    expect(code).toEqual(LitActionCode + randomNonce);
  });

  it("Mints the PKP", async () => {
    const pkpContract = new ethers.Contract(
      PKP_CONTRACT_ADDRESS_MUMBAI,
      PKPNFTContract.abi,
      new ethers.providers.JsonRpcProvider(
        "https://polygon-mumbai.g.alchemy.com/v2/fbWG-Mg4NtNwWVOP-MyV73Yu5EGxLT8Z",
      ),
    ) as PKPNFT;
    const pkpNftPublicKey = await pkpContract.getPubkey(pkpTokenId);
    expect(publicKey).toEqual(pkpNftPublicKey);
  });

  it("Runs the correct lit action code", async () => {
    const authSig = await sdk.generateAuthSig();
    const response = await sdk.runLitAction({
      authSig,
      pkpPubKey: publicKey,
      ipfsCID,
    });
    console.log("response in correct lit action test: ", response);
    expect(response.response).toEqual("Conditions for swap not met!");
  });

  it("Fails when running arbitrary javascript code", async () => {
    const authSig = await sdk.generateAuthSig();
    const response = await sdk.runLitAction({
      authSig,
      pkpPubKey: publicKey,
      // Lit Hello World Example IPFS CID
      ipfsCID: "QmSCxGRRznNDJRDri9qd3batstNiSj9xDHRTVhj8j2TKfo",
    });
    console.log("response running bad js: ", response);
    expect(response.response).not.toEqual("Conditions for swap not met!");
  });
  // test that it cant run arbitrary javascript
});
