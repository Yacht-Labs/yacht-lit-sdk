export async function go() {
  let response: Record<any, any> = {};
  // chain A: ETH chain B: BTC
  // pass in chain A swap condition as const
  // pass in chain B swap condition as const
  // pass in chain A unsigned transaction as const
  // pass in chain B utxo as const

  // fetch all chain B UTXOs

  // check if both conditions are met
  // if yes sign both transactions

  // if chain A condition is met:
  // check if there is spent output to chain A wallet
  // if yes sign both transactions

  // if chain B condition is met:
  // check if chain A pkp nonce is greater than 0
  // if yes sign both transactions

  // if chain A condition is met
  // check if clawback time has elapsed
  // if yes sign chain A clawback transaction

  // if chain B condition is met
  // check if clawback time has elapsed
  // if yes sign chain B clawback transaction
}
