import { UTXO, UtxoResponse } from "./@types/yacht-lit-sdk";

const btcSwapParams = "{{btcSwapParams}}" as any;
const evmConditions = "{{evmConditions}}" as any;
const evmTransaction = "{{evmTransaction}}" as any;
const evmClawbackTransaction = "{{evmClawbackTransaction}}" as any;
const btcTransaction = "{{btcTransaction}}";
const btcClawbackTransaction = "{{btcClawbackTransaction}}";

evmTransaction.from = evmClawbackTransaction.from = pkpAddress;

const pkpOriginTime = originTime ? originTime : Date.now();

const hashTransaction = (tx: any) => {
  return ethers.utils.arrayify(
    ethers.utils.keccak256(
      ethers.utils.arrayify(ethers.utils.serializeTransaction(tx)),
    ),
  );
};

function checkHasThreeDaysPassed(previousTime: number) {
  const currentTime = Date.now();
  const difference = currentTime - previousTime;
  return difference / (1000 * 3600 * 24) >= 3 ? true : false;
}

async function validateUtxo(passedInUtxo: UTXO) {
  const utxoResponse = await fetch(
    `https://mempool.space/api/address/${pkpBtcAddress}/utxo`,
  );
  const fetchUtxo = (await utxoResponse.json()) as UtxoResponse;
  if (fetchUtxo.length === 0) {
    return false;
  }
  const utxoToSpend = fetchUtxo[0];
  if (utxoToSpend.value !== btcSwapParams.value) {
    return false;
  }
  if (
    utxoToSpend.txid !== passedInUtxo.txid ||
    utxoToSpend.vout !== passedInUtxo.vout
  ) {
    return false;
  }
  return true;
}

async function didSendBtc(address: string) {
  const response = await fetch(
    `https://mempool.space/api/address/${address}/txs`,
  );
  const transactions = await response.json();
  return transactions.length > 0;
}

export async function go() {
  try {
    let response: Record<any, any> = {};
    const utxoIsValid = await validateUtxo(passedInUtxo);
    const didSendBtcFromPkp = await didSendBtc(pkpBtcAddress);
    const evmConditionsPass = await Lit.Actions.checkConditions({
      conditions: [evmConditions],
      authSig,
      chain: evmConditions.chain,
    });
    const evmNonce = await Lit.Actions.getLatestNonce({
      address: pkpAddress,
      chain: evmConditions.chain,
    });

    if (utxoIsValid) {
      if (evmConditionsPass || evmNonce === "0x1") {
        await Lit.Actions.signEcdsa({
          toSign: hashTransaction(evmTransaction),
          publicKey: pkpPublicKey,
          sigName: "ethSignature",
        });
        await Lit.Actions.signEcdsa({
          toSign: successHash,
          publicKey: pkpPublicKey,
          sigName: "btcSignature",
        });
        response = {
          ...response,
          evmTransaction,
          btcTransaction,
        };
      } else if (checkHasThreeDaysPassed(originTime)) {
        await Lit.Actions.signEcdsa({
          toSign: clawbackHash,
          publicKey: pkpPublicKey,
          sigName: "btcSignature",
        });
        response = {
          ...response,
          btcTransaction: btcClawbackTransaction,
        };
      } else {
        response = {
          ...response,
          error: "Swap conditions not met",
        };
      }
    } else if (evmConditionsPass) {
      if (didSendBtcFromPkp) {
        await Lit.Actions.signEcdsa({
          toSign: hashTransaction(evmTransaction),
          publicKey: pkpPublicKey,
          sigName: "ethSignature",
        });
        await Lit.Actions.signEcdsa({
          toSign: successHash,
          publicKey: pkpPublicKey,
          sigName: "btcSignature",
        });
        response = {
          ...response,
          evmTransaction,
          btcTransaction,
        };
      } else if (checkHasThreeDaysPassed(originTime)) {
        await Lit.Actions.signEcdsa({
          toSign: hashTransaction(evmClawbackTransaction),
          publicKey: pkpPublicKey,
          sigName: "ethSignature",
        });
        response = {
          ...response,
          evmTransaction: evmClawbackTransaction,
        };
      } else {
        response = {
          ...response,
          error: "Swap conditions not met",
        };
      }
    } else {
      response = {
        ...response,
        error: "Swap conditions not met",
      };
    }

    Lit.Actions.setResponse({
      response: JSON.stringify({ response: response }),
    });
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
