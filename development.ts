import * as jest from "jest-mock";

export const mockLitActionSetResponse = jest.fn((options: any) => {
  return options;
});

export const mockLitActionSignEcdsa = jest.fn((options: any) => {
  return options;
});

export const mockLitActionGetLatestNonce = jest.fn((options: any) => {
  return options;
});

export const mockLitActionCheckConditions = jest.fn((options: any) => {
  return options;
});

let memoizedAddress = () => "";
export const setLitActionAuthAddress = (address = "") => {
  memoizedAddress = () => address;
};

// Fake Lit implementation
const fakeLit: {
  Actions: Action;
  Auth: Auth;
  LitActions: LitActions;
} = {
  Actions: {
    setResponse: (options: { response: string }) => {
      mockLitActionSetResponse(options);
    },
    signEcdsa: (options: {
      toSign: Uint8Array;
      publicKey: string;
      sigName: string;
    }) => {
      mockLitActionSignEcdsa(options);
    },
    getLatestNonce: (options: { address: string; chain: string }) =>
      mockLitActionGetLatestNonce(options),
    checkConditions: (options: {
      conditions: any[];
      authSig: string;
      chain: string;
    }) => mockLitActionCheckConditions(options),
  },
  get Auth() {
    return { authSigAddress: memoizedAddress() };
  },
  LitActions: {
    signEcdsa: (options: {
      toSign: Uint8Array;
      publicKey: string;
      sigName: string;
    }) => {
      console.log("Fake signEcdsa called with:", options);
    },
  },
};

(global as any).Lit = fakeLit;

// Import and set ethers as a global variable
import { ethers } from "ethers";
(global as any).ethers = ethers;

(global as any).passedInUtxo = {
  txid: "49651be70ec111977e440f4e83b07277da4858664dcaf6af33cec0e505719017",
  vout: 0,
  value: 8000,
};
