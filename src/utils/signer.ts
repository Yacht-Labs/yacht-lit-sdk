import { anyTypeAnnotation } from "@babel/types";
import { serialize } from "@ethersproject/transactions";
import { BigNumber, BigNumberish, ethers, Wallet } from "ethers";
import { arrayify, joinSignature, keccak256 } from "ethers/lib/utils";
import { generateAuthSig } from "./lit";

export class YachtSigner {
  private static generateTransferCallData(
    counterParty: string,
    amount: string,
  ) {
    const transferInterface = new ethers.utils.Interface([
      "function transfer(address, uint256) returns (bool)",
    ]);
    return transferInterface.encodeFunctionData("transfer", [
      counterParty,
      amount,
    ]);
  }

  private static async serializeTransaction(tx: any, privateKey: string) {
    function getMessage(tx: any) {
      return keccak256(arrayify(serialize(tx)));
    }
    const message = arrayify(getMessage(tx));
    // const authSig = generateAuthSig(privateKey, chainId);
    // need the digest of the signature here

    const signer = new Wallet(privateKey);
    const encodedSignature = await signer.signMessage(message);

    return serialize(tx, encodedSignature);
  }

  static async generateSignedTransferTx(
    privateKey: string,
    tokenAddress: string,
    counterParty: string,
    gasPrice: BigNumber,
    amount: string, //TODO think about decimals
    chainId: number,
  ) {
    const tx = {
      to: tokenAddress,
      nonce: 0,
      // value: 0,
      maxFeePerGas: "1699999972", //ethers.utils.parseUnits("22.2", "gwei"),
      maxPriorityFeePerGas: "159999972",
      gasLimit: 1000000,
      // gasPrice: gasPrice,
      // gasLimit: 100000,
      chainId: chainId,
      data: this.generateTransferCallData(counterParty, amount),
      type: 2,
    };
    return await this.serializeTransaction(tx, privateKey);
  }
}
async function main() {
  const provider = new ethers.providers.JsonRpcProvider(
    "https://polygon-mumbai.g.alchemy.com/v2/Agko3FEsqf1Kez7aSFPZViQnUd8sI3rJ",
  );

  const gasPrice = await provider.getGasPrice();
  console.log(gasPrice.toString());

  const signedTransferTx = await YachtSigner.generateSignedTransferTx(
    "b6d84955bc272c590344b528e4cebc73a72b0fc250b176680ff39807ee272f2b",
    "0xeDb95D8037f769B72AAab41deeC92903A98C9E16",
    "0x96242814208590c563aafb6270d6875a12c5bc45",
    gasPrice,
    "100000000000000000000",
    80001,
  );

  const balance = await provider.getBalance(
    "0x630a5fa5ea0b94daae707fe105404749d52909b9",
  );
  // console.log(balance.toString());

  const tx = await provider.sendTransaction(signedTransferTx);
  const res = tx.wait();
  console.log(res);
}

main();
