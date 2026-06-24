import { BigInt } from '@graphprotocol/graph-ts';

import { ProtocolOracle } from '../generated/Treasury/ProtocolOracle';
import { TreasuryUpdated } from '../generated/Treasury/Treasury';
import { NavPoint } from '../generated/schema';

import { BTC_TOKEN, PROTOCOL_ORACLE, STRAT_TOKEN } from './generated-config/addresses';

const ZERO = BigInt.zero();
const WAD = BigInt.fromString('1000000000000000000');
// cbBTC has 8 decimals.
const BTC_TO_WAD = BigInt.fromString('10000000000');

// The oracle reverts until the pool has a full TWAP window, so the market price may be missing.
export function handleTreasuryUpdated(event: TreasuryUpdated): void {
  const backing = event.params.backingSupply;
  const navWad = backing.le(ZERO)
    ? ZERO
    : event.params.btcBalance.times(BTC_TO_WAD).times(WAD).div(backing);

  // Keyed by block, so a transaction that emits this more than once leaves one point.
  const point = new NavPoint(event.block.number.toString());
  point.timestamp = event.block.timestamp;
  point.navBtcPerStratWad = navWad;

  const price = ProtocolOracle.bind(PROTOCOL_ORACLE).try_getPriceWad(
    STRAT_TOKEN,
    BTC_TOKEN,
  );
  if (!price.reverted && price.value.gt(ZERO)) {
    point.marketBtcPerStratWad = price.value;
  }

  point.save();
}
