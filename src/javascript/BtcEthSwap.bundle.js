'use strict';

/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */
/* global Reflect, Promise */


function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

const Lit = null;
function go() {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const btcSwapParams = "{{btcSwapParams}}";
            const ethSwapParams = "{{ethSwapParams}}";
            let response = {};
            const ADDRESS = "0x0000000";
            const utxoResponse = yield fetch("https://mempool.space/api/address/1KFHE7w8BhaENAswwryaoccDb6qcT6DbYY/utxo");
            const utxo = (yield utxoResponse.json());
            if (utxo.length === 0) {
                throw new Error("No UTXOs found on the PKP BTC address");
            }
            const utxoToSpend = utxo[0];
            if (utxoToSpend.value !== btcSwapParams.value) {
                throw new Error(`UTXO ${utxoToSpend.txid} value does not match the expected value`);
            }
        }
        catch (err) {
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
    });
}

exports.go = go;
