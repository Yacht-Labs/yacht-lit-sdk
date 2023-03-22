import {
  getMumbaiPrivateKey,
  getMumbaiProviderUrl,
} from "../../src/utils/environment";
import { Wallet, providers, ethers } from "ethers";
import { YachtLitSdk } from "../../src/sdk";
import { UTXO } from "../../src/@types/yacht-lit-sdk";

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

const provider = new providers.JsonRpcProvider(getMumbaiProviderUrl());
const wallet = new Wallet(getMumbaiPrivateKey(), provider);
const sdk = new YachtLitSdk({ signer: wallet, btcTestNet: true });

describe("Fetching Bitcoin UTXOs", () => {
  let btcAddress: string;
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReturnValue({
      ok: true,
      json: () => {
        return [stubUTXO];
      },
    });
    btcAddress = sdk.generateBtcAddress(ethers.Wallet.createRandom().publicKey);
  });

  it("Should properly fetch UTXOs", async () => {
    const utxo = await sdk.getUtxoByAddress(btcAddress);
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
      await sdk.getUtxoByAddress(btcAddress);
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
      await sdk.getUtxoByAddress(btcAddress);
    }).rejects.toThrow();
  });
});
