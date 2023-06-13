import { GasConfig, UTXO } from "./src/";

declare global {
  const ethers: typeof import("ethers");

  const pkpAddress: string;
  const pkpPublicKey: string;
  const pkpBtcAddress: string;
  const authSig: string;
  const ethGasConfig: GasConfig;
  const btcFeeRate: number;
  const successHash: Buffer;
  const clawbackHash: Buffer;
  const passedInUtxo: UTXO;
  const originTime: number;
  const successTxHex: string;
  const clawbackTxHex: string;

  interface Action {
    setResponse: (options: { response: any }) => void;
    signEcdsa: (options: {
      toSign: Uint8Array;
      publicKey: string;
      sigName: string;
    }) => void;
    getLatestNonce: (options: {
      address: string;
      chain: string;
    }) => Promise<string>;
    checkConditions: (options: {
      conditions: any[];
      authSig: string;
      chain: string;
    }) => Promise<boolean>;
  }

  interface LitActions {
    signEcdsa: (options: {
      toSign: Uint8Array;
      publicKey: string;
      sigName: string;
    }) => void;
  }

  interface Auth {
    authSigAddress: string;
  }

  const Lit: {
    Actions: Action;
    Auth: Auth;
    LitActions: LitActions;
  };
}
export {};
