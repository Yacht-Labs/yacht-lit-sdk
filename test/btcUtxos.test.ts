import {
  getMumbaiPkpPublicKey,
  getMumbaiPrivateKey,
  getMumbaiProviderUrl,
} from "./../src/utils/environment";
import { Wallet, providers } from "ethers";
import { YachtLitSdk } from "../src/sdk";
import { UTXO } from "../src/@types/yacht-lit-sdk";

const wallet = new Wallet(
  getMumbaiPrivateKey(),
  new providers.JsonRpcProvider(getMumbaiProviderUrl()),
);
const sdk = new YachtLitSdk({ signer: wallet, btcTestNet: true });

const stubUTXO: UTXO = {
  txid: "1d126542ec070387cc21b9fb9035a76cc1e12cd4fe021a884cfdabc3ed315a73",
  vout: 0,
  status: {
    confirmed: true,
    block_height: 2425194,
    block_hash:
      "000000000000000e6e0a45601a98694bc2e47736f6b909c04408e4f6f736f96d",
    block_time: 1679324880,
  },
  value: 9328,
};
const mockFetch = jest.fn().mockReturnValue({
  ok: true,
  json: () => {
    return [stubUTXO];
  },
});
jest.mock("node-fetch", () => {
  return jest.fn().mockImplementation(() => mockFetch());
});

describe("Bitcoin UTXOs", () => {
  const FEE = 25;
  const recipientAddress = "mqnvzsHWFNZv5TYVMaSQ4yCfyCVgo3Bgch";

  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReturnValue({
      ok: true,
      json: () => {
        return [stubUTXO];
      },
    });
  });
  it("Should properly fetch UTXOs", async () => {
    const utxo = await sdk.getUtxoByAddress(getMumbaiPkpPublicKey());
    expect(utxo).toEqual(stubUTXO);
  });

  it("Should properly error on API error", async () => {
    mockFetch.mockReturnValue({
      ok: false,
      json: () => {
        return { error: "error" };
      },
    });
    expect(async () => {
      await sdk.getUtxoByAddress(getMumbaiPkpPublicKey());
    }).rejects.toThrow();
  });

  it("Should properly error if no UTXOs are found", async () => {
    mockFetch.mockReturnValue({
      ok: true,
      json: () => {
        return [];
      },
    });
    expect(async () => {
      await sdk.getUtxoByAddress(getMumbaiPkpPublicKey());
    }).rejects.toThrow();
  });

  it("Should validate that a transaction was signed with the proper public key", async () => {
    expect(async () => {
      await sdk.signFirstBtcUtxo({
        pkpPublicKey: getMumbaiPkpPublicKey(),
        fee: FEE,
        recipientAddress: recipientAddress,
      });
    }).not.toThrow();
  });

  it("Should error if the transaction was not signed with the proper public key", async () => {
    expect(async () => {
      await sdk.signFirstBtcUtxo({
        pkpPublicKey: "wrong",
        fee: FEE,
        recipientAddress: recipientAddress,
      });
    }).rejects.toThrow();
  });
});
