import { UtxoResponse } from "./@types/yacht-lit-sdk";
const Lit: any;
export async function go() {
  try {
    const btcSwapParams = "{{btcSwapParams}}" as any;
    const ethSwapParams = "{{ethSwapParams}}" as any;

    let response: Record<any, any> = {};
    const ADDRESS = "0x0000000";
    const utxoResponse = await fetch("https://mempool.space/api/address/1KFHE7w8BhaENAswwryaoccDb6qcT6DbYY/utxo");
    const utxo = await utxoResponse.json() as UtxoResponse;
    if (utxo.length === 0) {
      throw new Error("No UTXOs found on the PKP BTC address");
    }
    const utxoToSpend = utxo[0];
    if (utxoToSpend.value !== btcSwapParams.value) {
      throw new Error(`UTXO ${utxoToSpend.txid} value does not match the expected value`);
    }

  } catch (err) {
    Lit.Actions.setResponse({
      response: JSON.stringify({ error: (err as Error).message }),
    });
  }
  // pass in ETH swap condition as const
  // pass in BTC swap condition as const
  // pass in ETH unsigned transaction as const
  // pass in ETH Clawback transaction as const
  // pass in BTC transaction Info (id, vout, hash to sign) for sending & clawback as jsParam

  // fetch all BTC UTXOs
  // validate the btcTransactionInfo passed in jsParams

  // check if both conditions are met
  // if yes sign both transactions

  // if ETH condition is met:
  // check if there is a transaction that has been sent from the PKP Address
  // if yes sign both transactions

  // if BTC condition is met:
  // check if ETH pkp nonce is greater than 0
  // if yes sign both transactions

  // if ETH condition is met
  // check if clawback time has elapsed
  // if yes sign ETH clawback transaction

  // if BTC condition is met
  // check if clawback time has elapsed
  // if yes sign BTC clawback transaction
}
