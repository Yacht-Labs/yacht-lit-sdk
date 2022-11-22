import { getBytesFromMultihash, LitAuthSig } from "./utils/lit";
import { PKP_CONTRACT_ADDRESS_MUMBAI } from "./constants/index";
import { ethers } from "ethers";
import pkpNftContract from "./abis/PKPNFT.json";
import { generateAuthSig } from "./utils";
import LitJsSdk from "@lit-protocol/sdk-nodejs";
import { uploadToIPFS } from "./utils/ipfs";
import { arrayify, keccak256, SigningKey } from "ethers/lib/utils";
import { serialize } from "@ethersproject/transactions";
import { PKPNFT } from "../typechain-types/contracts";

export type LitERC20SwapParams = {
  tokenAddress: string;
  counterPartyAddress: string;
  tokenAmount: string;
  decimals: number;
  chainId: number;
  nonce?: number;
  highGas?: boolean;
};

export type LitErc20SwapTx = {
  to: string;
  nonce: number;
  chainId: number;
  maxFeePerGas: ethers.BigNumber;
  maxPriorityFeePerGas: ethers.BigNumber;
  gasLimit: number;
  data: string;
  type: number;
};

export class YachtLitSdk {
  public provider: ethers.providers.JsonRpcProvider;
  public pkpContract: PKPNFT;
  private signer: ethers.Signer;
  public litClient: any;
  constructor(
    provider: ethers.providers.JsonRpcProvider,
    signer: ethers.Signer,
    litNetwork?: string,
    pkpContractAddress = PKP_CONTRACT_ADDRESS_MUMBAI,
  ) {
    this.provider = provider;
    this.signer = signer;
    this.litClient = litNetwork
      ? new LitJsSdk.LitNodeClient({ litNetwork })
      : new LitJsSdk.LitNodeClient();
    this.pkpContract = new ethers.Contract(
      pkpContractAddress,
      pkpNftContract.abi,
      this.signer,
    ) as PKPNFT;
  }

  async connect() {
    await this.litClient.connect();
  }

  async mintPKP() {
    if (!this.signer.provider) {
      throw new Error("No provider attached to ethers Yacht-Lit-SDK signer");
    }
    return await this.pkpContract.mintNext(2, { value: 1e14 });
  }

  async mintGrantBurnWithJs(litActionCode: string): Promise<{
    ipfsCID: string;
    pkp: {
      tokenId: string;
      publicKey: string;
    };
  }> {
    const { path: ipfsCID } = await uploadToIPFS(litActionCode);
    const mintGrantBurnTx = await this.mintGrantBurn(ipfsCID);
    const minedMintGrantBurnTx = await mintGrantBurnTx.wait();
    const pkpTokenId = ethers.BigNumber.from(
      minedMintGrantBurnTx.logs[1].topics[3],
    ).toString();
    console.log("here");
    const pkpPubKey = await this.getPubKeyByPKPTokenId(pkpTokenId);
    console.log("there");
    return {
      ipfsCID,
      pkp: {
        tokenId: pkpTokenId,
        publicKey: pkpPubKey,
      },
    };
  }

  async mintGrantBurn(ipfsCID: string) {
    if (!this.signer.provider) {
      throw new Error("No provider attached to ethers Yacht-Lit-SDK signer");
    }
    return await this.pkpContract.mintGrantAndBurnNext(
      2,
      getBytesFromMultihash(ipfsCID),
      {
        value: 1e14,
      },
    );
  }

  async getPubKeyByPKPTokenId(tokenId: string): Promise<string> {
    return await this.pkpContract.getPubkey(tokenId);
  }

  async generateAuthSig(
    chainId = 1,
    uri = "https://localhost/login",
    version = 1,
  ) {
    return generateAuthSig(this.signer, chainId, uri, version);
  }

  async mintPKPandExecuteJs(litActionCode: string) {
    try {
      const mintTx = await this.mintPKP();
      const minedMintTx = await mintTx.wait();
      const pkpTokenId = ethers.BigNumber.from(
        minedMintTx.logs[1].topics[3],
      ).toString();
      const pkpPubKey = await this.getPubKeyByPKPTokenId(pkpTokenId);
      const { path: ipfsCID } = await uploadToIPFS(litActionCode);
      const authSig = await this.generateAuthSig();
      await this.runLitAction(ipfsCID, authSig, pkpPubKey);
    } catch (err) {
      console.log(err);
    }
  }

  async runLitAction(
    ipfsCID: string,
    authSig: LitAuthSig,
    pkpPubKey: string,
    conditions?: [{ [key: string]: any }],
  ) {
    try {
      await this.connect();
      const response = await this.litClient.executeJs({
        ipfsId: ipfsCID,
        authSig: authSig,
        debug: true,
        conditions: conditions,
        jsParams: {
          authSig: authSig,
          chain: "mumbai",
          publicKey: pkpPubKey,
          sigName: "hello",
          toSign: [72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100],
        },
      });
      return response;
    } catch (err) {
      console.log(err);
    }
  }

  async uploadToIPFS(code: string) {
    //TODO: Figure out how to use version 17 of ipfs-core
    return await uploadToIPFS(code);
  }

  private generateTransferCallData(counterParty: string, amount: string) {
    const transferInterface = new ethers.utils.Interface([
      "function transfer(address, uint256) returns (bool)",
    ]);
    return transferInterface.encodeFunctionData("transfer", [
      counterParty,
      amount,
    ]);
  }

  generateUnsignedERC20Transaction({
    tokenAddress,
    counterPartyAddress,
    tokenAmount,
    decimals,
    chainId,
    nonce = 0,
    highGas = false,
  }: LitERC20SwapParams): LitErc20SwapTx {
    return {
      to: tokenAddress,
      nonce: nonce,
      chainId: chainId,
      maxFeePerGas: ethers.utils.parseUnits(
        `${highGas ? "204" : "102"}`,
        "gwei",
      ),
      maxPriorityFeePerGas: ethers.utils.parseUnits(
        `${highGas ? "200" : "100"}`,
        "gwei",
      ),
      gasLimit: 1000000,
      data: this.generateTransferCallData(
        counterPartyAddress,
        ethers.utils.parseUnits(tokenAmount, decimals).toString(),
      ),
      type: 2,
    };
  }

  public signTransaction(tx: LitErc20SwapTx, privateKey: string) {
    function getMessage(tx: LitErc20SwapTx) {
      return keccak256(arrayify(serialize(tx)));
    }
    const message = arrayify(getMessage(tx));
    const signer = new SigningKey("0x" + privateKey);
    const encodedSignature = signer.signDigest(message);
    return serialize(tx, encodedSignature);
  }
}
