import { createMockedFunction, newMockEvent } from 'matchstick-as';
import { BigInt, ethereum } from '@graphprotocol/graph-ts';

import { TreasuryUpdated } from '../generated/Treasury/Treasury';

import {
  BTC_TOKEN,
  PROTOCOL_ORACLE,
  STRAT_TOKEN,
  TREASURY,
} from '../src/generated-config/addresses';

// Emitted from the Treasury address, since the handler reads the oracle on its behalf.
export function treasuryUpdated(
  btcBalance: BigInt,
  backingSupply: BigInt,
): TreasuryUpdated {
  const event = changetype<TreasuryUpdated>(newMockEvent());
  event.address = TREASURY;
  event.parameters = new Array();
  event.parameters.push(
    new ethereum.EventParam(
      'btcBalance',
      ethereum.Value.fromUnsignedBigInt(btcBalance),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      'backingSupply',
      ethereum.Value.fromUnsignedBigInt(backingSupply),
    ),
  );
  event.parameters.push(
    new ethereum.EventParam(
      'timestamp',
      ethereum.Value.fromUnsignedBigInt(BigInt.fromI32(1000)),
    ),
  );
  return event;
}

export function mockOracle(oracleReady: boolean): void {
  const price = createMockedFunction(
    PROTOCOL_ORACLE,
    'getPriceWad',
    'getPriceWad(address,address):(uint256)',
  ).withArgs([
    ethereum.Value.fromAddress(STRAT_TOKEN),
    ethereum.Value.fromAddress(BTC_TOKEN),
  ]);
  if (oracleReady) {
    price.returns([
      ethereum.Value.fromUnsignedBigInt(BigInt.fromString('2500000000000')),
    ]);
  } else {
    price.reverts();
  }
}
