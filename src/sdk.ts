import { getBytesFromMultihash, sleep } from "./utils/lit";
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
import {
  LitERC20SwapCondition,
  LitChainIds,
  LitUnsignedTransaction,
  LitERC20SwapParams,
} from "./@types/yacht-lit-sdk";

export class YachtLitSdk {
  private provider: ethers.providers.JsonRpcProvider;
  private pkpContract: PKPNFT;
  private signer: ethers.Signer;
  private litClient: any;
  constructor(
    provider: ethers.providers.JsonRpcProvider,
    litNetwork?: string,
    signer?: ethers.Signer,
    pkpContractAddress = PKP_CONTRACT_ADDRESS_MUMBAI,
  ) {
    this.provider = provider;
    this.signer = signer ? signer : ethers.Wallet.createRandom();
    this.litClient = litNetwork
      ? new LitJsSdk.LitNodeClient({ litNetwork, debug: false })
      : new LitJsSdk.LitNodeClient({ debug: false });
    this.pkpContract = new ethers.Contract(
      pkpContractAddress,
      pkpNftContract.abi,
      this.signer,
    ) as PKPNFT;
  }

  private async connect() {
    try {
      await this.litClient.connect();
    } catch (err) {
      throw new Error(`Error connecting with LitJsSDK: ${err}`);
    }
  }

  private async mintPKP() {
    if (!this.signer.provider) {
      throw new Error("No provider attached to ethers Yacht-Lit-SDK signer");
    }
    return await this.pkpContract.mintNext(2, { value: 1e14 });
  }

  createERC20SwapLitAction(
    chainAParams: LitERC20SwapParams,
    chainBParams: LitERC20SwapParams,
    originTime?: number,
  ): string {
    const chainAIsValid = Object.keys(LitChainIds).includes(chainAParams.chain);
    const chainBIsValid = Object.keys(LitChainIds).includes(chainAParams.chain);
    if (!chainAIsValid || !chainBIsValid) {
      throw new Error(
        `Invalid chain name. Valid chains: ${Object.keys(LitChainIds)}`,
      );
    }
    if (chainAParams.chain === chainBParams.chain) {
      throw new Error("Swap must be cross chain, same chains not supported");
    }
    const chainACondition = this.generateERC20SwapCondition(chainAParams);
    const chainBCondition = this.generateERC20SwapCondition(chainBParams);
    const chainATransaction = this.generateUnsignedERC20Transaction({
      ...chainAParams,
      counterPartyAddress: chainBParams.counterPartyAddress,
    });
    const chainBTransaction = this.generateUnsignedERC20Transaction({
      ...chainBParams,
      counterPartyAddress: chainAParams.counterPartyAddress,
    });
    const chainAClawbackTransaction = this.generateUnsignedERC20Transaction({
      ...chainAParams,
    });
    const chainBClawbackTransaction = this.generateUnsignedERC20Transaction({
      ...chainBParams,
    });
    return this.generateERC20SwapLitActionCode(
      chainACondition,
      chainBCondition,
      chainATransaction,
      chainBTransaction,
      chainAClawbackTransaction,
      chainBClawbackTransaction,
      originTime,
    );
  }

  private generateERC20SwapCondition(conditionParams: {
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
    from?: string;
    nonce?: number;
  }): LitUnsignedTransaction {
    return {
      to: transactionParams.tokenAddress,
      nonce: transactionParams.nonce ? transactionParams.nonce : 0,
      chainId: LitChainIds[transactionParams.chain],
      maxFeePerGas: ethers.utils.parseUnits("102", "gwei").toString(),
      maxPriorityFeePerGas: ethers.utils.parseUnits("100", "gwei").toString(),
      gasLimit: "1000000",
      from: transactionParams.from
        ? transactionParams.from
        : "{{pkpPublicKey}}",
      data: this.generateTransferCallData(
        transactionParams.counterPartyAddress,
        ethers.utils
          .parseUnits(transactionParams.amount, transactionParams.decimals)
          .toString(),
      ),
      type: 2,
    };
  }

  async uploadToIPFS(code: string): Promise<string> {
    const { path } = await uploadToIPFS(code);
    return path;
  }

  async mintGrantBurnWithLitAction(ipfsCID: string): Promise<{
    ipfsCID: string;
    pkp: {
      tokenId: string;
      publicKey: string;
      compressedPublicKey: string;
    };
  }> {
    try {
      const mintGrantBurnTx = await this.mintGrantBurn(ipfsCID);
      const minedMintGrantBurnTx = await mintGrantBurnTx.wait(2);
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

  private async mintGrantBurn(ipfsCID: string) {
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

  private async getPubKeyByPKPTokenId(tokenId: string): Promise<string> {
    try {
      return await this.pkpContract.getPubkey(tokenId);
    } catch (err) {
      throw new Error(`Error getting pkp public key: ${err}`);
    }
  }

  async generateAuthSig(
    chainId = 1,
    uri = "https://localhost/login",
    version = "1",
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
      await this.runLitAction({ ipfsCID, authSig, pkpPubKey });
    } catch (err) {
      console.log(err);
    }
  }

  async runLitAction({
    authSig,
    pkpPubKey,
    ipfsCID,
    code,
  }: {
    authSig: any;
    pkpPubKey: string;
    ipfsCID?: string;
    code?: string;
  }) {
    try {
      await this.connect();
      const response = await this.litClient.executeJs({
        ipfsId: ipfsCID,
        code: code,
        authSig: authSig,
        jsParams: {
          publicKey: pkpPubKey,
          pkpPublicKey: ethers.utils.computeAddress(pkpPubKey),
          authSig,
        },
      });
      return response;
    } catch (err) {
      console.log(err);
    }
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

  private generateERC20SwapLitActionCode = (
    chainACondition: LitERC20SwapCondition,
    chainBCondition: LitERC20SwapCondition,
    chainATransaction: LitUnsignedTransaction,
    chainBTransaction: LitUnsignedTransaction,
    chainAClawbackTransaction: LitUnsignedTransaction,
    chainBClawbackTransaction: LitUnsignedTransaction,
    originTime?: number,
  ) => {
    return `
    const go = async () => {
        const originTime = ${JSON.stringify(originTime)} ? ${JSON.stringify(
      originTime,
    )} : Date.now();
        const chainACondition = ${JSON.stringify(chainACondition)}
        const chainBCondition = ${JSON.stringify(chainBCondition)}
        const chainATransaction = ${JSON.stringify(chainATransaction)}
        const chainBTransaction = ${JSON.stringify(chainBTransaction)}
        const chainAClawbackTransaction = ${JSON.stringify(
          chainAClawbackTransaction,
        )}
        const chainBClawbackTransaction = ${JSON.stringify(
          chainBClawbackTransaction,
        )}
        const hashTransaction = (tx) => {
          return ethers.utils.arrayify(
            ethers.utils.keccak256(
              ethers.utils.arrayify(ethers.utils.serializeTransaction(tx)),
            ),
          );
        }
      
        function checkHasThreeDaysPassed(previousTime) {
            const currentTime = Date.now();
            const difference = currentTime - previousTime;
            return difference / (1000 * 3600 * 24) >= 3 ? true : false;
        }
        
        const generateSwapTransactions = async () => {
          await LitActions.signEcdsa({
            toSign: hashTransaction(chainATransaction),
            publicKey: publicKey,
            sigName: "chainASignature",
          });
          await LitActions.signEcdsa({
            toSign: hashTransaction(chainBTransaction),
            publicKey: publicKey,
            sigName: "chainBSignature",
          });
          Lit.Actions.setResponse({
            response: JSON.stringify({ chainATransaction, chainBTransaction }),
          });
        };
      
        chainACondition.parameters = chainBCondition.parameters = [
          pkpPublicKey,
        ];
        chainATransaction.from = chainBTransaction.from = pkpPublicKey;
      
        const chainAConditionsPass = await Lit.Actions.checkConditions({
          conditions: [chainACondition],
          authSig,
          chain: chainACondition.chain,
        });
      
        const chainBConditionsPass = await Lit.Actions.checkConditions({
          conditions: [chainBCondition],
          authSig,
          chain: chainBCondition.chain,
        });
      
        if (chainAConditionsPass && chainBConditionsPass) {
          await generateSwapTransactions();
          return;
        }
      
        const threeDaysHasPassed = checkHasThreeDaysPassed(originTime);
        const chainANonce = await Lit.Actions.getLatestNonce({address: pkpPublicKey, chain: chainACondition.chain});
        const chainBNonce = await Lit.Actions.getLatestNonce({address: pkpPublicKey, chain: chainBCondition.chain});

        if (chainAConditionsPass) {
          if (chainBNonce === 1) {
            await generateSwapTransactions();
            return;
          }
          if (!threeDaysHasPassed) {
            Lit.Actions.setResponse({ response: "Conditions for swap not met!" });
            return;
          }
          await Lit.Actions.signEcdsa({
            toSign: hashTransaction(chainAClawbackTransaction),
            publicKey: publicKey,
            sigName: "chainASignature",
          });
          Lit.Actions.setResponse({
            response: JSON.stringify({
              chainATransaction: chainAClawbackTransaction,
            }),
          });
          return;
        }
      
        if (chainBConditionsPass) {
          if (chainANonce === 1) {
            await generateSwapTransactions();
            return;
          }
          if (!threeDaysHasPassed) {
            Lit.Actions.setResponse({ response: "Conditions for swap not met!" });
            return;
          }
          await Lit.Actions.signEcdsa({
            toSign: hashTransaction(chainBClawbackTransaction),
            publicKey: publicKey,
            sigName: "chainBSignature",
          });
          Lit.Actions.setResponse({
            response: JSON.stringify({
              chainBTransaction: chainBClawbackTransaction,
            }),
          });
          return;
        }
        Lit.Actions.setResponse({ response: "Conditions for swap not met!" });
      }
    go();
    `;
  };
}
