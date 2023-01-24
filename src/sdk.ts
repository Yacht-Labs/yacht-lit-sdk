import { getBytesFromMultihash } from "./utils/lit";
import { PKP_CONTRACT_ADDRESS_MUMBAI } from "./constants/index";
import { BigNumber, ethers } from "ethers";
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
import { PKPNFT } from "../typechain-types/contracts/PKPNFT";
import {
  LitERC20SwapCondition,
  LitChainIds,
  LitUnsignedTransaction,
  LitERC20SwapParams,
} from "./@types/yacht-lit-sdk";
import { create, IPFS } from "ipfs-core";
import Hash from "ipfs-only-hash";

export class YachtLitSdk {
  private pkpContract: PKPNFT;
  private signer: ethers.Signer;
  private litClient: any;
  private ipfs: IPFS | undefined = undefined;
  /**
   * @constructor
   * Instantiates an instance of the Yacht atomic swap SDK powered by Lit Protocol.  If you want to mint a PKP, then you will need to attach an ethers Wallet with a Polygon Mumbai provider.  For generating Lit Action code and executing Lit Actions, you do not need a signer
   * @param {ethers.Signer} signer - The wallet that will be used to mint a PKP
   */
  constructor(
    signer?: ethers.Signer,
    pkpContractAddress = PKP_CONTRACT_ADDRESS_MUMBAI,
  ) {
    this.signer = signer ? signer : ethers.Wallet.createRandom();
    this.litClient = new LitJsSdk.LitNodeClient({
      litNetwork: "serrano",
      debug: false,
    });
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
  /**
   * Generates the Lit Action code that will be uploaded to IPFS and manages the logic for the cross chain atomic swap
   * @param {LitERC20SwapParams} chainAParams - Parameters for the swap on Chain A
   * @param {LitERC20SwapParams} chainBParams - Parameters for the swap on Chain B
   * @param originTime - Only used for testing.  Leave blank
   * @returns {string} Lit Action code
   */
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

  /**
   * Utility function for generating an unsigned ERC20 transaction. Used for testing
   * @param transactionParams
   * @returns
   */
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

  /**
   *
   * @param {string} code - The Lit Action code to be uploaded to IPFS
   * @returns {string} The IPFS CID to locate your record
   */
  async uploadToIPFS(code: string): Promise<string> {
    const { path } = await uploadToIPFS(code);
    return path;
  }

  async getIPFSHash(code: string): Promise<string> {
    return await Hash.of(code);
  }

  /**
   * Mints a PKP NFT on the Polygon Mumbai network, attaches the Lit Action code to the PKP, then burns the PKP so that the code attached to the PKP cannot be changed.
   * @param ipfsCID - The IPFS cid where your Lit Action code is stored
   * @returns PKP info with tokenID, publicKey, and address
   */
  async mintGrantBurnWithLitAction(ipfsCID: string): Promise<{
    tokenId: string;
    publicKey: string;
    address: string;
  }> {
    try {
      const mintGrantBurnTx = await this.mintGrantBurn(ipfsCID);
      const minedMintGrantBurnTx = await mintGrantBurnTx.wait(2);
      const pkpTokenId = ethers.BigNumber.from(
        minedMintGrantBurnTx.logs[1].topics[3],
      ).toString();
      const publicKey = await this.getPubKeyByPKPTokenId(pkpTokenId);
      return {
        tokenId: pkpTokenId,
        publicKey: publicKey,
        address: ethers.utils.computeAddress(publicKey),
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
      const feeData = await this.signer.provider.getFeeData();
      // estimateGAs * feeData.maxFeePerGas
      return await this.pkpContract.mintGrantAndBurnNext(
        2,
        getBytesFromMultihash(ipfsCID),
        {
          value: 1e14,
          maxFeePerGas: feeData.maxFeePerGas as ethers.BigNumber,
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

  /**
   * Generates an auth sig to be used for executing a Lit Action.  All parameters are optional and do not need to be changed.
   * @param [chainId]
   * @param [uri]
   * @param [version]
   * @returns A valid auth sig for use with the Lit Protocol
   */
  async generateAuthSig(
    chainId = 1,
    uri = "https://localhost/login",
    version = "1",
  ) {
    return generateAuthSig(this.signer, chainId, uri, version);
  }

  /**
   * Executes the Lit Action code associated with the given PKP.  If the swap conditions have been met, then it will respond with the transactions that need to be signed. If not, it will respond with the string "Conditions for swap not met!"
   * @param {Object} LitActionParameters - Information needed to execute a Lit Action for a cross chain atomic swap
   * @param {string} LitActionParameters.pkpPublicKey - The public key of the PKP associated with the Lit Action code
   * @param {string} LitActionParameters.ipfsCID - The IPFS cid where the Lit Action code is located
   * @param {string} code - Arbitrary javascript to be run.  Used for testing purposes and will not work if the PKP has been associated with a Lit Action and subsequently burned
   * @param authSig - Used for testing purposes.  The function will automatically generate an auth sig if not provided
   * @param {code}
   * @returns
   */
  async runLitAction({
    pkpPublicKey,
    ipfsCID,
    code,
    authSig,
    chainAMaxFeePerGas,
    chainBMaxFeePerGas,
  }: {
    pkpPublicKey: string;
    ipfsCID?: string;
    code?: string;
    authSig?: any;
    chainAMaxFeePerGas: string;
    chainBMaxFeePerGas: string;
  }) {
    try {
      await this.connect();
      const response = await this.litClient.executeJs({
        ipfsId: ipfsCID,
        code: code,
        authSig: authSig ? authSig : await this.generateAuthSig(),
        jsParams: {
          pkpAddress: ethers.utils.computeAddress(pkpPublicKey),
          pkpPublicKey: pkpPublicKey,
          authSig: authSig ? authSig : await this.generateAuthSig(),
          chainAMaxFeePerGas,
          chainBMaxFeePerGas,
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

  /**
   * Utility function that can sign a transaction with a given private key
   * @param tx - Transaction to be signed
   * @param privateKey - Private key which will sign the transaction
   * @returns A serialized transaction
   */
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
            publicKey: pkpPublicKey,
            sigName: "chainASignature",
          });
          await LitActions.signEcdsa({
            toSign: hashTransaction(chainBTransaction),
            publicKey: pkpPublicKey,
            sigName: "chainBSignature",
          });
          Lit.Actions.setResponse({
            response: JSON.stringify({ chainATransaction, chainBTransaction }),
          });
        };
      
        chainACondition.parameters = chainBCondition.parameters = [
          pkpAddress,
        ];
        chainATransaction.from = chainBTransaction.from = pkpAddress;

        chainATransaction.maxFeePerGas = chainAMaxFeePerGas;
        chainBTransaction.maxFeePerGas = chainBMaxFeePerGas;
        
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
        const chainANonce = await Lit.Actions.getLatestNonce({address: pkpAddress, chain: chainACondition.chain});
        const chainBNonce = await Lit.Actions.getLatestNonce({address: pkpAddress, chain: chainBCondition.chain});

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
            publicKey: pkpPublicKey,
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
            publicKey: pkpPublicKey,
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
