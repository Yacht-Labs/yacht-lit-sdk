import { getBytesFromMultihash, LitAuthSig, sleep } from "./utils/lit";
import { PKP_CONTRACT_ADDRESS_MUMBAI } from "./constants/index";
import { ethers } from "ethers";
import pkpNftContract from "./abis/PKPNFT.json";
import { generateAuthSig } from "./utils";
import LitJsSdk from "@lit-protocol/sdk-nodejs";
import { uploadToIPFS } from "./utils/ipfs";
import {
  arrayify,
  keccak256,
  SigningKey,
  UnsignedTransaction,
} from "ethers/lib/utils";
import { serialize } from "@ethersproject/transactions";
import { PKPNFT } from "../typechain-types/contracts";
import { LitERC20SwapCondition } from "./@types/yacht-lit-sdk";

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
    try {
      await this.litClient.connect();
    } catch (err) {
      throw new Error(`Error connecting with LitJsSDK: ${err}`);
    }
  }

  async mintPKP() {
    if (!this.signer.provider) {
      throw new Error("No provider attached to ethers Yacht-Lit-SDK signer");
    }
    return await this.pkpContract.mintNext(2, { value: 1e14 });
  }

  createERC20SwapLitAction(
    chainAParams: {
      counterPartyAddress: string;
      tokenAddress: string;
      chain: string;
      amount: string;
      decimals: number;
    },
    chainBParams: {
      counterPartyAddress: string;
      tokenAddress: string;
      chain: string;
      amount: string;
      decimals: number;
    },
  ) {
    const chainACondition = this.generateERC20SwapCondition(chainAParams);
    const chainBCondition = this.generateERC20SwapCondition(chainBParams);
    const chainATransaction =
      this.generateUnsignedERC20Transaction(chainAParams);
    const chainBTransaction =
      this.generateUnsignedERC20Transaction(chainBParams);
  }

  generateERC20SwapCondition(conditionParams: {
    counterPartyAddress: string;
    tokenAddress: string;
    chain: string;
    amount: string;
    decimals: number;
  }): LitERC20SwapCondition {
    return {
      conditionType: "evmBasic",
      contractAddress: conditionParams.tokenAddress,
      standardContractType: "ERC20",
      chain: conditionParams.chain,
      method: "balanceOf",
      parameters: ["address"],
      returnValueTest: {
        comparator: ">=",
        value: ethers.BigNumber.from(conditionParams.amount)
          .mul(
            ethers.BigNumber.from(10).pow(
              ethers.BigNumber.from(conditionParams.decimals),
            ),
          )
          .toString(),
      },
    };
  }

  generateUnsignedERC20Transaction(transactionParams: {
    counterPartyAddress: string;
    tokenAddress: string;
    chain: string;
    amount: string;
    decimals: number;
  }) {
    return {
      to: transactionParams.counterPartyAddress,
      nonce: 0,
      chainId: transactionParams.chain,
      maxFeePerGas: ethers.utils.parseUnits("102", "gwei").toString(),
      maxPriorityFeePerGas: ethers.utils.parseUnits("100", "gwei").toString(),
      gasLimit: "1000000",
      from: "{{pkpPublicKey}}",
      data: this.generateTransferCallData(
        transactionParams.counterPartyAddress,
        ethers.utils
          .parseUnits(transactionParams.amount, transactionParams.decimals)
          .toString(),
      ),
      type: 2,
    };
  }

  async mintGrantBurnWithJs(litActionCode: string): Promise<{
    ipfsCID: string;
    pkp: {
      tokenId: string;
      publicKey: string;
      compressedPublicKey: string;
    };
  }> {
    try {
      const { path: ipfsCID } = await uploadToIPFS(litActionCode);
      await sleep(10000);
      const mintGrantBurnTx = await this.mintGrantBurn(ipfsCID);
      const minedMintGrantBurnTx = await mintGrantBurnTx.wait();
      const pkpTokenId = ethers.BigNumber.from(
        minedMintGrantBurnTx.logs[1].topics[3],
      ).toString();
      const pkpPubKey = await this.getPubKeyByPKPTokenId(pkpTokenId);
      return {
        ipfsCID,
        pkp: {
          tokenId: pkpTokenId,
          publicKey: pkpPubKey,
          compressedPublicKey: ethers.utils.computeAddress(pkpPubKey),
        },
      };
    } catch (err) {
      throw new Error(`Error in mintGrantBurnWithJs: ${err}`);
    }
  }

  async mintGrantBurn(ipfsCID: string) {
    if (!this.signer.provider) {
      throw new Error("No provider attached to ethers Yacht-Lit-SDK signer");
    }
    try {
      return await this.pkpContract.mintGrantAndBurnNext(
        2,
        getBytesFromMultihash(ipfsCID),
        {
          value: 1e14,
          maxFeePerGas: ethers.utils.parseUnits("102", "gwei").toString(),
          maxPriorityFeePerGas: ethers.utils
            .parseUnits("100", "gwei")
            .toString(),
          gasLimit: "1000000",
        },
      );
    } catch (err) {
      throw new Error(`Error in mintGrantBurn: ${err}`);
    }
  }

  async getPubKeyByPKPTokenId(tokenId: string): Promise<string> {
    try {
      return await this.pkpContract.getPubkey(tokenId);
    } catch (err) {
      throw new Error(`Error getting pkp public key: ${err}`);
    }
  }

  async generateAuthSig(
    chainId = 1,
    uri = "https://localhost/login",
    version = 1,
  ) {
    return generateAuthSig(this.signer, chainId, uri, version);
  }

  // async mintPKPandExecuteJs(litActionCode: string) {
  //   try {
  //     const mintTx = await this.mintPKP();
  //     const minedMintTx = await mintTx.wait();
  //     const pkpTokenId = ethers.BigNumber.from(
  //       minedMintTx.logs[1].topics[3],
  //     ).toString();
  //     const pkpPubKey = await this.getPubKeyByPKPTokenId(pkpTokenId);
  //     const { path: ipfsCID } = await uploadToIPFS(litActionCode);
  //     const authSig = await this.generateAuthSig();
  //     await this.runLitAction(ipfsCID, authSig, pkpPubKey);
  //   } catch (err) {
  //     console.log(err);
  //   }
  // }

  async runLitAction({
    authSig,
    pkpPubKey,
    ipfsCID,
    code,
  }: {
    authSig: any;
    pkpPubKey: string;
    conditions: [LitERC20SwapCondition, LitERC20SwapCondition];
    ipfsCID?: string;
    code?: string;
  }) {
    try {
      await this.connect();
      const response = await this.litClient.executeJs({
        ipfsId: ipfsCID,
        code: code,
        authSig: authSig,
        // debug: true,
        jsParams: {
          authSig: authSig,
          publicKey: pkpPubKey,
          pkpPublicKey: ethers.utils.computeAddress(pkpPubKey),
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

  public signTransaction(tx: UnsignedTransaction, privateKey: string) {
    function getMessage(tx: UnsignedTransaction) {
      return keccak256(arrayify(serialize(tx)));
    }
    const message = arrayify(getMessage(tx));
    const signer = new SigningKey("0x" + privateKey);
    const encodedSignature = signer.signDigest(message);
    return serialize(tx, encodedSignature);
  }

  generateERC20SwapLitActionCode = (
    tx0: UnsignedTransaction,
    tx1: UnsignedTransaction,
    conditions: [LitERC20SwapCondition, LitERC20SwapCondition],
  ) => {
    const currentTime = Date.now();
    return `
    const go = async () => {
  
      const conditions = ${JSON.stringify(conditions)};
      const tx0 = ${JSON.stringify(tx0)};
      const tx1 = ${JSON.stringify(tx1)};

      const currentTime = ${currentTime};
  
      conditions.forEach((condition) => {
          condition.parameters = [pkpPublicKey]
      });
  
      tx0.from = pkpPublicKey;
      tx1.from = pkpPublicKey;

  
      const testResult = await Lit.Actions.checkConditions({
        conditions,
        authSig,
        chain,
      })
  
      if (!testResult) {
        return;
      }
  
      const tx0Hash = 
  
      const tx1Hash = ethers.utils.arrayify(
        ethers.utils.keccak256(
          ethers.utils.arrayify(ethers.utils.serializeTransaction(tx1)),
        ),
      );
  
      const sigShare = await LitActions.signEcdsa({ toSign: tx0Hash, publicKey, sigName: "tx0Signature" });
      const sigShare2 = await LitActions.signEcdsa({ toSign: tx1Hash, publicKey, sigName: "tx1Signature" });
  
      LitActions.setResponse({response: JSON.stringify({tx0, tx1})});
    };
      
    go();
    `;
  };
}

// Condition A(chainA PKP has tokens), TxA(Send to Bob's wallet on chain A)
// Condition B(ChainB PKP has tokens), TxB(Send to Alice's wallet on chainB)

// hasThreeDaysPassed = checkHasThreeDaysPassed(originTime)

// pkpHasTokensOnChainA = checkCondition(conditionA) <= Alice has sent tokens to PKP on chain A
// pkpHasTokensOnChainB = checkCondition(conditionB) <= Bob has sent tokens to PKP on chain B
// Alice wants Bob's token on chain B and Bob wants Alice's token on chain A

// if pkpHasTOkensOnChainA && pkpHasTokensOnChainB
// Generate two transfer transactions and sign them and return them
// return

// if pkpHasTokensOnChainA
// getpkpNonce(conditionB.chain);
// if chainBPkpNonce = 1;
// generate two transfer transactions
// return
// if threeDaysHasPassed
// generate transferTransaction(txA.to = txB.to) //Instead of sending to Bob, send back to Alice
// return
// else return "swap conditions not met"

// if pkpHasTokensOnChainB
// get pkpNonce(conditionA.chain);
// if chainAPkpNonce = 1;
// generate two transfer transactions;
// return
// if threeDaysHasPassed
// generate transferTransaction(txA.to = txB.to); // instead of sending to Alice, send back to Bob
// return
// else return "swap conditions not met"

// TODO parse the types in the response to figure out what actually happened on the lit node and then response accordingly
