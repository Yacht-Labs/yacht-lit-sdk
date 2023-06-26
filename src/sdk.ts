import { successHash, clawbackHash } from "./../test/fixtures";
import { getBytesFromMultihash } from "./utils/lit";
import { PKP_CONTRACT_ADDRESS_LIT, VBYTES_PER_TX } from "./constants/index";
import { ethers } from "ethers";
import pkpNftContract from "./abis/PKPNFT.json";
import { generateAuthSig, reverseBuffer, validator } from "./utils";
import * as LitJsSdk from "@lit-protocol/lit-node-client-nodejs";
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
  GasConfig,
  UTXO,
  LitYachtSdkParams,
  LitEVMNativeSwapCondition,
  LitEthSwapParams,
  LitBtcSwapParams,
  LitBtcEthSwapResponse,
} from "./@types/yacht-lit-sdk";
import Hash from "ipfs-only-hash";
import * as bitcoin from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import fetch from "node-fetch";
import { toOutputScript } from "bitcoinjs-lib/src/address";
import fs from "fs";
import path from "path";

export class YachtLitSdk {
  private pkpContract: PKPNFT;
  private signer: ethers.Wallet;
  private litClient: any;
  private btcTestNet: boolean;
  private btcApiEndpoint: string;

  /**
   * @constructor
   * Instantiates an instance of the Yacht atomic swap SDK powered by Lit Protocol.  If you want to mint a PKP, then you will need to attach an ethers Wallet with a Polygon Mumbai provider.  For generating Lit Action code and executing Lit Actions, you do not need a signer
   * @param signer - The wallet that will be used to mint a PKP and generate auth sigs
   * @param pkpContractAddress - The address of the PKP NFT contract - defaults to the Mumbai testnet address
   * @param btcTestNet - Whether or not to use the Bitcoin testnet - defaults to false
   * @param btcApiEndpoint - The endpoint to use for the Bitcoin API - defaults to blockstream.info
   * @example
   * import { YachtLitSdk } from "yacht-lit-sdk";
   * import { Wallet, providers } from "ethers";
   *
   * const wallet = new Wallet(
   *   YOUR_PRIVATE_KEY,
   *   new providers.JsonRpcProvider(YOUR_MUMBAI_PROVIDER_URL),
   * );
   * const sdk = new YachtLitSdk({ signer: wallet });
   *
   */
  constructor({
    signer,
    pkpContractAddress = PKP_CONTRACT_ADDRESS_LIT,
    btcTestNet = false,
    btcApiEndpoint = "https://blockstream.info",
  }: LitYachtSdkParams) {
    this.signer = signer ? signer : ethers.Wallet.createRandom();
    this.litClient = new LitJsSdk.LitNodeClientNodeJs({
      litNetwork: "serrano",
      debug: true,
    });
    this.pkpContract = new ethers.Contract(
      pkpContractAddress,
      pkpNftContract.abi,
      this.signer,
    ) as PKPNFT;
    this.btcTestNet = btcTestNet;
    this.btcApiEndpoint = btcApiEndpoint;
  }

  /**
   * Converts an Ethereum public key to a Bitcoin address
   * @param {string} ethKey - Ethereum public key (compressed or uncompressed)
   * @returns {string} Bitcoin address
   * @example
   * const btcAddress = generateBtcAddress("0x043fd854ac22b8c80eadd4d8354ab8e74325265a065e566d82a21d578da4ef4d7af05d27e935d38ed28d5fda657e46a0dc4bab62960b4ad586b9c22d77f786789a");
   */
  generateBtcAddress(ethKey: string): string {
    let compressedPoint: Uint8Array;
    if (ethKey.length === 130) {
      compressedPoint = ecc.pointCompress(Buffer.from(ethKey, "hex"), true);
    } else if (ethKey.length === 132) {
      if (ethKey.slice(0, 2) !== "0x") {
        throw new Error("Invalid Ethereum public key");
      }
      compressedPoint = ecc.pointCompress(
        Buffer.from(ethKey.slice(2), "hex"),
        true,
      );
    } else if (ethKey.length === 66) {
      compressedPoint = Buffer.from(ethKey, "hex");
    } else if (ethKey.length === 68) {
      if (ethKey.slice(0, 2) !== "0x") {
        throw new Error("Invalid Ethereum public key");
      }
      compressedPoint = Buffer.from(ethKey.slice(2), "hex");
    } else {
      throw new Error("Invalid Ethereum public key");
    }

    const { address } = bitcoin.payments.p2pkh({
      pubkey: Buffer.from(compressedPoint),
      network: this.btcTestNet
        ? bitcoin.networks.testnet
        : bitcoin.networks.bitcoin,
    });
    if (!address) throw new Error("Could not generate address");
    return address;
  }

  /**
   * Gets first unspent bitcoin UTXO for an address
   * @param {string} address - Bitcoin address
   * @returns {UTXO} UTXO
   * @example
   * const utxo = await getUtxoByAddress("1JwSSubhmg6iPtRjtyqhUYYH7bZg3Lfy1T");
   */
  async getUtxoByAddress(address: string): Promise<UTXO> {
    try {
      const endpoint = `${this.btcApiEndpoint}/${
        this.btcTestNet ? "testnet/" : null
      }api/address/${address}/utxo`;
      const result = await fetch(endpoint);
      if (!result.ok)
        throw new Error(
          `Could not get utxos from endpoint ${endpoint}
          ${result.statusText}`,
        );
      const utxos = await result.json();
      const firstUtxo = utxos[0];
      if (!firstUtxo) {
        throw new Error("No utxos found for address");
      }
      if (firstUtxo.status.confirmed === false) {
        throw new Error("First utxo is unconfirmed");
      }
      return firstUtxo as UTXO;
    } catch (err) {
      throw new Error("Error fetching utxos: " + err);
    }
  }

  private prepareTransactionForSignature({
    utxo,
    recipientAddress,
    fee,
  }: {
    utxo: UTXO;
    recipientAddress: string;
    fee: number;
  }): bitcoin.Transaction {
    const transaction = new bitcoin.Transaction();
    transaction.addInput(
      reverseBuffer(Buffer.from(utxo.txid, "hex")),
      utxo.vout,
    );

    const outputScript = toOutputScript(
      recipientAddress,
      this.btcTestNet ? bitcoin.networks.testnet : bitcoin.networks.bitcoin,
    );
    transaction.addOutput(outputScript, utxo.value - VBYTES_PER_TX * fee);

    return transaction;
  }

  private async signBitcoinWithLitAction(
    hashForSig: Buffer,
    pkpPublicKey: string,
  ) {
    const litActionCode = `
    const go = async () => {
      // this requests a signature share from the Lit Node
      // the signature share will be automatically returned in the HTTP response from the node
      // all the params (toSign, publicKey, sigName) are passed in from the LitJsSdk.executeJs() function
      try {
      const sigShare = await LitActions.signEcdsa({toSign: message, publicKey, sigName});
      } catch (e) {
        // console.log("error: ", e);
      }
    };

    go();
  `;
    const authSig = await this.generateAuthSig();
    await this.connect();

    const result = (await this.litClient.executeJs({
      code: litActionCode,
      jsParams: {
        // this is the string "Hello World" for testing
        message: hashForSig,
        publicKey: pkpPublicKey,
        sigName: "sig1",
      },
      authSig,
    })) as any;
    const { sig1 } = result.signatures;
    return sig1;
  }

  /**
   * Signs first UTXO for a PKP address
   * @param {string} pkpPublicKey - PKP public key
   * @param {number} fee - Fee per vbyte
   * @param {string} recipientAddress - Bitcoin address to send to
   * @returns {bitcoin.Transaction} Signed transaction
   * @example
   * const signedTransaction = sdk.signFirstBtcUtxo({
   *   pkpPublicKey: "0x043fd854ac22b8c80eadd4d8354ab8e74325265a065e566d82a21d578da4ef4d7af05d27e935d38ed28d5fda657e46a0dc4bab62960b4ad586b9c22d77f786789a",
   *   fee: 24,
   *   recipientAddress: "1JwSSubhmg6iPtRjtyqhUYYH7bZg3Lfy1T",
   * })
   */
  async signFirstBtcUtxo({
    pkpPublicKey,
    fee,
    recipientAddress,
  }: {
    pkpPublicKey: string;
    fee: number;
    recipientAddress: string;
  }): Promise<bitcoin.Transaction> {
    const compressedPoint = ecc.pointCompress(
      Buffer.from(pkpPublicKey.replace("0x", ""), "hex"),
      true,
    );

    const pkpBtcAddress = this.generateBtcAddress(pkpPublicKey);
    const utxo = await this.getUtxoByAddress(pkpBtcAddress);
    const transaction = this.prepareTransactionForSignature({
      utxo,
      recipientAddress,
      fee,
    });

    const hashForSig = transaction.hashForSignature(
      0,
      toOutputScript(
        pkpBtcAddress,
        this.btcTestNet ? bitcoin.networks.testnet : bitcoin.networks.bitcoin,
      ),
      bitcoin.Transaction.SIGHASH_ALL,
    );
    const litSignature = await this.signBitcoinWithLitAction(
      hashForSig,
      pkpPublicKey,
    );
    const signature = Buffer.from(litSignature.r + litSignature.s, "hex");

    const validSignature = validator(
      Buffer.from(compressedPoint),
      hashForSig,
      signature,
    );

    if (!validSignature) throw new Error("Invalid signature");
    const compiledSignature = bitcoin.script.compile([
      bitcoin.script.signature.encode(
        signature,
        bitcoin.Transaction.SIGHASH_ALL,
      ),
      Buffer.from(compressedPoint.buffer),
    ]);

    transaction.setInputScript(0, compiledSignature);
    return transaction;
  }

  public signBtcTxWithLitSignature(
    transactionString: string,
    litSignature: { s: string; r: string },
    hashForSig: Buffer,
    pkpPublicKey: string,
  ) {
    const compressedPoint = ecc.pointCompress(
      Buffer.from(pkpPublicKey.replace("0x", ""), "hex"),
      true,
    );
    const signature = Buffer.from(litSignature.r + litSignature.s, "hex");

    const validSignature = validator(
      Buffer.from(compressedPoint),
      hashForSig,
      signature,
    );

    if (!validSignature) throw new Error("Invalid signature");
    const compiledSignature = bitcoin.script.compile([
      bitcoin.script.signature.encode(
        signature,
        bitcoin.Transaction.SIGHASH_ALL,
      ),
      Buffer.from(compressedPoint.buffer),
    ]);

    const transaction = bitcoin.Transaction.fromHex(transactionString);

    transaction.setInputScript(0, compiledSignature);
    return transaction.toHex();
  }

  /**
   * Broadcasts a signed transaction to the Bitcoin network
   * @param {bitcoin.Transaction} transaction - Signed transaction
   * @returns {Promise<string>} Transaction ID
   * @example
   * const signedTransaction = sdk.signFirstBtcUtxo({
   *  pkpPublicKey: "0x043fd854ac22b8c80eadd4d8354ab8e74325265a065e566d82a21d578da4ef4d7af05d27e935d38ed28d5fda657e46a0dc4bab62960b4ad586b9c22d77f786789a",
   *  fee: 24,
   *  recipientAddress: "1JwSSubhmg6iPtRjtyqhUYYH7bZg3Lfy1T",
   * })
   * const txId = await sdk.broadcastBtcTransaction(signedTransaction)
   */
  async broadcastBtcTransaction(
    transaction: bitcoin.Transaction,
  ): Promise<string> {
    try {
      const txHex = transaction.toHex();
      const response = await fetch(
        `${this.btcApiEndpoint}/${this.btcTestNet ? "testnet/" : null}api/tx`,
        {
          method: "POST",
          body: txHex,
        },
      );
      const data = await response.text();
      return data;
    } catch (err) {
      console.log(err);
      throw new Error("Error broadcasting transaction: " + err);
    }
  }

  private async safeParseJSON(response: any) {
    const body = await response.text();
    try {
      return JSON.parse(body);
    } catch (err) {
      console.error("Error:", err);
      console.error("Response body:", body);
      throw new Error("Error parsing response body");
    }
  }

  private async connect() {
    try {
      await this.litClient.connect();
    } catch (err) {
      throw new Error(`Error connecting with LitJsSDK: ${err}`);
    }
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

  public generateEVMNativeSwapCondition(conditionParams: {
    chain: string;
    amount: string;
  }): LitEVMNativeSwapCondition {
    return {
      //conditionType: "evmBasic",
      contractAddress: "",
      standardContractType: "",
      chain: "ethereum",
      method: "eth_getBalance",
      parameters: ["address"],
      returnValueTest: {
        comparator: ">=",
        value: ethers.utils.parseEther(conditionParams.amount).toString(),
      },
    };
  }

  /**
   * Utility function for generating an unsigned ERC20 transaction.
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
      gasLimit: "50000",
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

  generateUnsignedEVMNativeTransaction(transactionParams: {
    counterPartyAddress: string;
    chain: string;
    amount: string;
    from?: string;
    nonce?: number;
  }): LitUnsignedTransaction {
    return {
      to: transactionParams.counterPartyAddress,
      nonce: transactionParams.nonce ? transactionParams.nonce : 0,
      chainId: LitChainIds[transactionParams.chain],
      gasLimit: "21000",
      from: transactionParams.from
        ? transactionParams.from
        : "{{pkpPublicKey}}",
      value: transactionParams.amount,
      type: 2,
    };
  }

  /**
   *
   * @param {string} code - The Lit Action code to be uploaded to IPFS
   * @returns {string} The IPFS CID to locate your record
   */
  async uploadToIPFS(code: string): Promise<string> {
    try {
      const { path } = await uploadToIPFS(code);
      return path;
    } catch (err) {
      throw new Error(`Error uploading to IPFS: ${err}`);
    }
  }

  /**
   *
   * @param code - The Lit Action code to be hashed
   * @returns The IPFS CID
   */
  async getIPFSHash(code: string): Promise<string> {
    try {
      return await Hash.of(code);
    } catch (err) {
      throw new Error(`Error hashing Lit Action code: ${err}`);
    }
  }

  /**
   * Mints a PKP NFT on the Polygon Mumbai network using the provided signer
   * @returns {Promise<{tokenId: string; publicKey: string; address: string}>} tokenId, publicKey, and address of the minted NFT
   * @throws Error if signer not set
   * @throws Error if signer provider not set
   * @example
   * const { tokenId, publicKey, address } = await litClient.mintPkp();
   */
  async mintPkp(): Promise<{
    tokenId: string;
    publicKey: string;
    address: string;
  }> {
    if (!this.signer) {
      throw new Error("Signer not set");
    }
    if (!this.signer.provider) {
      throw new Error("Signer provider not set, required to get gas info");
    }
    try {
      const feeData = await this.signer.provider.getFeeData();
      const mintPkpTx = await this.pkpContract.mintNext(2, {
        value: ethers.BigNumber.from("1"),
        gasPrice: ethers.BigNumber.from("1000000"),
      });
      const minedMintPkpTx = await mintPkpTx.wait();
      const pkpTokenId = ethers.BigNumber.from(
        minedMintPkpTx.logs[0].topics[3],
      ).toString();
      const publicKey = await this.getPubKeyByPKPTokenId(pkpTokenId);
      return {
        tokenId: pkpTokenId,
        publicKey: publicKey,
        address: ethers.utils.computeAddress(publicKey),
      };
    } catch (err) {
      throw new Error(`Error minting PKP: ${err}`);
    }
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
      const minedMintGrantBurnTx = await mintGrantBurnTx.wait();
      const pkpTokenId = ethers.BigNumber.from(
        minedMintGrantBurnTx.logs[4].topics[3],
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
      return await this.pkpContract.mintGrantAndBurnNext(
        2,
        getBytesFromMultihash(ipfsCID),
        {
          value: ethers.BigNumber.from("1"),
          gasPrice: ethers.BigNumber.from("1000000"),
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

  async runBtcEthSwapLitAction({
    pkpPublicKey,
    code,
    authSig,
    ethGasConfig,
    btcFeeRate,
    ethParams,
    btcParams,
    isEthClawback = false,
  }: {
    pkpPublicKey: string;
    code: string;
    authSig?: any;
    ethGasConfig: GasConfig;
    btcFeeRate: number;
    btcParams: LitBtcSwapParams;
    ethParams: LitEthSwapParams;
    isEthClawback?: boolean;
  }): Promise<LitBtcEthSwapResponse> {
    try {
      let successHash, clawbackHash, utxo, successTxHex, clawbackTxHex;
      if (!isEthClawback) {
        ({ successHash, clawbackHash, utxo, successTxHex, clawbackTxHex } =
          await this.prepareBtcSwapTransactions(
            btcParams,
            ethParams,
            code,
            pkpPublicKey,
            btcFeeRate,
          ));
      }
      await this.connect();
      const response = await this.litClient.executeJs({
        code: code,
        authSig: authSig ? authSig : await this.generateAuthSig(),
        jsParams: {
          pkpAddress: ethers.utils.computeAddress(pkpPublicKey),
          pkpBtcAddress: this.generateBtcAddress(pkpPublicKey),
          pkpPublicKey: pkpPublicKey,
          authSig: authSig ? authSig : await this.generateAuthSig(),
          ethGasConfig: ethGasConfig,
          btcFeeRate: btcFeeRate,
          successHash: successHash,
          clawbackHash: clawbackHash,
          passedInUtxo: utxo,
          successTxHex,
          clawbackTxHex,
        },
      });
      return response;
    } catch (e) {
      throw new Error(`Error running btc eth swap lit action: ${e}`);
    }
  }

  private async prepareBtcSwapTransactions(
    btcParams: LitBtcSwapParams,
    ethParams: LitEthSwapParams,
    code: string,
    pkpPublicKey: string,
    btcFeeRate: number,
  ) {
    try {
      const checksum = await this.getIPFSHash(
        await this.generateBtcEthSwapLitActionCode(btcParams, ethParams),
      );
      const codeChecksum = await this.getIPFSHash(code);
      if (checksum !== codeChecksum) {
        throw new Error(
          "IPFS CID does not match generated Lit Action code.  You may have the incorrect parameters.",
        );
      }
      const btcAddress = this.generateBtcAddress(pkpPublicKey);
      const utxo = await this.getUtxoByAddress(btcAddress);
      const btcSuccessTransaction = this.prepareTransactionForSignature({
        utxo,
        recipientAddress: ethParams.btcAddress,
        fee: btcFeeRate,
      });
      const successHash = btcSuccessTransaction.hashForSignature(
        0,
        toOutputScript(
          btcAddress,
          this.btcTestNet ? bitcoin.networks.testnet : bitcoin.networks.bitcoin,
        ),
        bitcoin.Transaction.SIGHASH_ALL,
      );
      const btcClawbackTransaction = this.prepareTransactionForSignature({
        utxo,
        recipientAddress: btcParams.counterPartyAddress,
        fee: btcFeeRate,
      });
      const clawbackHash = btcClawbackTransaction.hashForSignature(
        0,
        toOutputScript(
          btcAddress,
          this.btcTestNet ? bitcoin.networks.testnet : bitcoin.networks.bitcoin,
        ),
        bitcoin.Transaction.SIGHASH_ALL,
      );
      return {
        successTxHex: btcSuccessTransaction.toHex(),
        successHash,
        clawbackTxHex: btcClawbackTransaction.toHex(),
        clawbackHash,
        utxo,
      };
    } catch (err) {
      throw new Error(`Error in runBtcEthSwapLitAction: ${err}`);
    }
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
  async runErc20SwapLitAction({
    pkpPublicKey,
    ipfsCID,
    code,
    authSig,
    chainAGasConfig,
    chainBGasConfig,
  }: {
    pkpPublicKey: string;
    ipfsCID?: string;
    code?: string;
    authSig?: any;
    chainAGasConfig: GasConfig;
    chainBGasConfig: GasConfig;
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
          chainAGasConfig,
          chainBGasConfig,
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

  public generateBtcEthSwapLitActionCode = async (
    btcParams: LitBtcSwapParams,
    ethParams: LitEthSwapParams,
    fileName?: string,
  ) => {
    const evmConditions = this.generateEVMNativeSwapCondition(ethParams);
    const unsignedEthTransaction = this.generateUnsignedEVMNativeTransaction({
      counterPartyAddress: btcParams.ethAddress,
      chain: ethParams.chain,
      amount: ethParams.amount,
    });
    const unsignedEthClawbackTransaction =
      this.generateUnsignedEVMNativeTransaction({
        counterPartyAddress: ethParams.counterPartyAddress,
        chain: ethParams.chain,
        amount: ethParams.amount,
      });

    const variablesToReplace = {
      btcSwapParams: JSON.stringify(btcParams),
      ethSwapParams: JSON.stringify(ethParams),
      evmConditions: JSON.stringify(evmConditions),
      unsignedEthTransaction: JSON.stringify(unsignedEthTransaction),
      unsignedEthClawbackTransaction: JSON.stringify(
        unsignedEthClawbackTransaction,
      ),
    };

    return await this.loadActionCode(variablesToReplace, fileName);
  };

  private async loadActionCode(
    variables: Record<string, string>,
    fileName?: string,
  ): Promise<string> {
    const resolvedFilename = fileName ? fileName : "BtcEthSwap.bundle.js";
    const filePath = path.join(__dirname, "javascript", resolvedFilename);
    try {
      const code = await new Promise<string>((resolve, reject) => {
        fs.readFile(filePath, "utf8", (err, data) => {
          if (err) {
            reject(err);
          } else {
            resolve(data);
          }
        });
      });

      return this.replaceCodeVariables(code, variables);
    } catch (err) {
      console.log(`Error loading Lit action code: ${err}`);
      return "";
    }
  }

  /* 
  example usage: 
  const variables = {
    hardEthPrice: "42069",
    hardEthPayoutAddress: "0x48F9E3AD6fe234b60c90dAa2A4f9eb5a247a74C3",
  };
  replaceVariables(code, variables);
  */
  private replaceCodeVariables(content: string, variables: any) {
    let result = content;
    for (const key in variables) {
      const placeholder = `"{{${key}}}"`;
      const value = variables[key];
      result = result.split(placeholder).join(value);
    }
    return result;
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
        let chainATransaction = ${JSON.stringify(chainATransaction)}
        let chainBTransaction = ${JSON.stringify(chainBTransaction)}
        let chainAClawbackTransaction = ${JSON.stringify(
          chainAClawbackTransaction,
        )}
        let chainBClawbackTransaction = ${JSON.stringify(
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

        chainATransaction = {...chainATransaction, ...chainAGasConfig}
        chainBTransaction = {...chainBTransaction, ...chainBGasConfig}
        chainAClawbackTransaction = {...chainAClawbackTransaction, ...chainAGasConfig}
        chainBClawbackTransaction = {...chainBClawbackTransaction, ...chainBGasConfig}
        
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
          if (chainBNonce === "0x1") {
            await generateSwapTransactions();
            return;
          }
          if (!threeDaysHasPassed) {
            Lit.Actions.setResponse({ response: JSON.stringify({ response: "Conditions for swap not met!" })});
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
          if (chainANonce === "0x1") {
            await generateSwapTransactions();
            return;
          }
          if (!threeDaysHasPassed) {
            Lit.Actions.setResponse({ response: JSON.stringify({ response: "Conditions for swap not met!" })});
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
        Lit.Actions.setResponse({ response: JSON.stringify({ response: "Conditions for swap not met!" })});
      }
    go();
    `;
  };
}
