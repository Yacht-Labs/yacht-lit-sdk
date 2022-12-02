import { checkHasThreeDaysPassed, LitAuthSig } from "../src";
import {
  LitActionsSDK,
  LitERC20SwapCondition,
} from "./../src/@types/yacht-lit-sdk";
import { ethers } from "ethers";
export async function testGenerateLitActionCode(
  chainACondition: LitERC20SwapCondition,
  chainBCondition: LitERC20SwapCondition,
  chainATransaction: any,
  chainBTransaction: any,
  LitActions: LitActionsSDK,
  authSig: LitAuthSig,
  jsParams: {
    pkpCompressedPublicKey: string;
    pkpUncompressedPublicKey: string;
  },
  originTimeParam: number,
) {
  const { pkpCompressedPublicKey, pkpUncompressedPublicKey } = jsParams;
  const originTime = originTimeParam;

  const hashTransaction = (tx: any) =>
    ethers.utils.arrayify(
      ethers.utils.keccak256(
        ethers.utils.arrayify(ethers.utils.serializeTransaction(tx)),
      ),
    );

  const generateSwapTransactions = async () => {
    await LitActions.signEcdsa({
      toSign: hashTransaction(chainATransaction),
      publicKey: pkpUncompressedPublicKey,
      sigName: "chainASignature",
    });
    await LitActions.signEcdsa({
      toSign: hashTransaction(chainBTransaction),
      publicKey: pkpUncompressedPublicKey,
      sigName: "chainBSignature",
    });
    LitActions.setResponse({
      response: JSON.stringify({ chainATransaction, chainBTransaction }),
    });
  };

  chainACondition.parameters = chainBCondition.parameters = [
    pkpCompressedPublicKey,
  ];
  chainATransaction.from = chainBTransaction.from = pkpCompressedPublicKey;

  const chainAConditionsPass = await LitActions.checkConditions({
    conditions: [chainACondition],
    authSig,
    chain: chainACondition.chain,
  });

  const chainBConditionsPass = await LitActions.checkConditions({
    conditions: [chainBCondition],
    authSig,
    chain: chainBCondition.chain,
  });

  if (chainAConditionsPass && chainBConditionsPass) {
    await generateSwapTransactions();
    return;
  }

  const threeDaysHasPassed = checkHasThreeDaysPassed(originTime);
  const chainANonce = await LitActions.getLatestNonce(chainACondition.chain);
  const chainBNonce = await LitActions.getLatestNonce(chainBCondition.chain);
  if (chainAConditionsPass) {
    if (chainBNonce === 1) {
      await generateSwapTransactions();
      return;
    }
    if (!threeDaysHasPassed) {
      LitActions.setResponse({ response: "Conditions for swap not met!" });
      return;
    }
    const chainAClawbackTransaction = {
      ...chainATransaction,
      to: chainBTransaction.to,
    };
    await LitActions.signEcdsa({
      toSign: hashTransaction(chainAClawbackTransaction),
      publicKey: pkpUncompressedPublicKey,
      sigName: "chainASignature",
    });
    LitActions.setResponse({
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
      LitActions.setResponse({ response: "Conditions for swap not met!" });
      return;
    }
    const chainBClawbackTransaction = {
      ...chainBTransaction,
      to: chainATransaction.to,
    };
    await LitActions.signEcdsa({
      toSign: hashTransaction(chainBClawbackTransaction),
      publicKey: pkpUncompressedPublicKey,
      sigName: "chainASignature",
    });
    LitActions.setResponse({
      response: JSON.stringify({
        chainATransaction: chainBClawbackTransaction,
      }),
    });
    return;
  }
  LitActions.setResponse({ response: "Conditions for swap not met!" });
  return;
}
