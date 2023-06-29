const btcSwapParams = "{{btcSwapParams}}";
const evmConditions = "{{evmConditions}}";
const evmTransaction = "{{evmTransaction}}";
const evmClawbackTransaction = "{{evmClawbackTransaction}}";
evmTransaction.from = evmClawbackTransaction.from = pkpAddress;
evmConditions.parameters = [pkpAddress];
const hashTransaction = (tx) => {
  return ethers.utils.arrayify(
    ethers.utils.keccak256(
      ethers.utils.arrayify(ethers.utils.serializeTransaction(tx)),
    ),
  );
};

function checkHasThreeDaysPassed(previousTime) {
  const currentTime = Date.now();
  const difference = currentTime - previousTime;
  return difference / (1000 * 3600 * 24) >= 3 ? true : false;
}

async function validateUtxo() {
  try {
    const utxoResponse = await fetch(
      `https://ac26-72-80-171-211.ngrok-free.app/utxos?address=${pkpBtcAddress}`,
    );
    const fetchUtxo = await utxoResponse.json();
    if (fetchUtxo.length === 0) {
      return false;
    }
    const utxoToSpend = fetchUtxo[0];
    if (utxoToSpend.value !== btcSwapParams.value) {
      return false;
    }
    // if (
    //   utxoToSpend.txid !== passedInUtxo.txid ||
    //   utxoToSpend.vout !== passedInUtxo.vout
    // ) {
    //   return false;
    // }
    return true;
  } catch (e) {
    throw new Error(`Could not validate UTXO: ${e}`);
  }
}

async function didSendBtc(address) {
  try {
    const response = await fetch(
      `https://ac26-72-80-171-211.ngrok-free.app/txs?address=${pkpBtcAddress}`,
    );
    const transactions = await response.json();
    if (transactions.length === 0) {
      return false;
    }
    return transactions.length > 1;
  } catch (e) {
    throw new Error(`Could not check if BTC was sent: ${e}`);
  }
}

async function go() {
  try {
    let response = {};
    // const utxoIsValid = await validateUtxo();
    //passedInUtxo
    // const didSendBtcFromPkp = await didSendBtc(pkpBtcAddress);
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
          btcTransaction: successTxHex,
        };
      } else if (checkHasThreeDaysPassed(originTime)) {
        await Lit.Actions.signEcdsa({
          toSign: clawbackHash,
          publicKey: pkpPublicKey,
          sigName: "btcSignature",
        });
        response = {
          ...response,
          btcClawbackTransaction: clawbackTxHex,
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
          btcTransaction: successTxHex,
        };
      } else if (checkHasThreeDaysPassed(originTime)) {
        await Lit.Actions.signEcdsa({
          toSign: hashTransaction(evmClawbackTransaction),
          publicKey: pkpPublicKey,
          sigName: "ethSignature",
        });
        response = {
          ...response,
          evmClawbackTransaction: evmClawbackTransaction,
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
      response: JSON.stringify({ error: err.message }),
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

go();
