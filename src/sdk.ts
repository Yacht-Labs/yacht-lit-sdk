import { ethers } from "ethers";
import pkpNftContract from "./abis/PKPNFT.json";
import { generateAuthSig } from "./utils";
import LitJsSdk from "@lit-protocol/sdk-nodejs";
import uploadToIPFS from "./utils/ipfs";
import { Signature } from "ethers";

export class YachtLitSdk {
  public providerUrl: string;
  public pkpContract: any; //TODO: Typechain contract typings
  private privateKey: string; //TODO: Make safer?
  private litClient: any;
  constructor(
    providerUrl: string,
    privateKey: string,
    pkpContractAddress = "0x86062B7a01B8b2e22619dBE0C15cbe3F7EBd0E92", //TODO: Add to config?
    litNetwork?: string,
  ) {
    this.providerUrl = providerUrl;
    this.privateKey = privateKey;
    this.litClient = litNetwork
      ? new LitJsSdk.LitNodeClient({ litNetwork })
      : new LitJsSdk.LitNodeClient();
    this.pkpContract = new ethers.Contract(
      pkpContractAddress,
      pkpNftContract.abi,
      new ethers.Wallet(
        privateKey,
        new ethers.providers.JsonRpcProvider(this.providerUrl),
      ),
    );
  }

  async connect() {
    this.litClient.connect();
  }

  async getPubKeyByPKPTokenId(tokenId: string): Promise<string> {
    return await this.pkpContract.getPubKey(tokenId);
  }

  async generateAuthSig(
    chainId = 1,
    uri = "https://localhost/login",
    version = 1,
  ) {
    return generateAuthSig(this.privateKey, chainId, uri, version);
  }

  async upLoadToIpfs(code: string) {
    //TODO: Figure out how to use version 17 of ipfs-core
    return uploadToIPFS(code);
  }

  async generateUnsignedSwapTransaction({
    erc20Address,
    counterPartyAddress,
    tokenAmount,
    decimals,
    chainId,
    nonce = 0,
  }: {
    erc20Address: string;
    counterPartyAddress: string;
    tokenAmount: string;
    decimals: number;
    chainId: number;
    nonce: number;
  }) {
    // const erc20ContractInstance = new ethers.Contract(
    //   erc20Address,
    //   erc20Contract.abi,
    // );
    // const transactionData =
    //   await erc20ContractInstance.populateTransaction.transfer(
    //     counterPartyAddress,
    //     ethers.utils.parseUnits(tokenAmount, decimals).toString(),
    //   );
    const transferInterface = new ethers.utils.Interface([
      "function transfer(address, uint256) returns (bool)",
    ]);
    const transactionData = transferInterface.encodeFunctionData("transfer", [
      counterPartyAddress,
      ethers.utils.parseUnits(tokenAmount, decimals).toString(),
    ]);
    const tx = {
      to: erc20Address,
      nonce: nonce,
      value: 0,
      maxFeePerGas: ethers.utils.parseUnits("100", "gwei"),
      maxPriorityFeePerGas: ethers.utils.parseUnits("10", "gwei"),
      gasLimit: 100000,
      chainId: chainId,
      data: transactionData,
      type: 2,
    };
    const message = ethers.utils.arrayify(
      ethers.utils.keccak256(
        ethers.utils.arrayify(ethers.utils.serializeTransaction(tx)),
      ),
    );
    return { serializedMessage: message, tx };

    // generate tx string here
    // has to have a nonce
    // how to know whether to set to 0 or 1

    // alice can run SDK
    // bob can run SDK

    // need to create the transferABI Interface
  }
}
