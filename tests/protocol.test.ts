import {
  afterEach,
  assert,
  clearStore,
  describe,
  test,
} from 'matchstick-as/assembly/index';
import { BigInt } from '@graphprotocol/graph-ts';

import { handleTreasuryUpdated } from '../src/nav';

import { mockOracle, treasuryUpdated } from './helpers';

const TREASURY_BTC = BigInt.fromI32(1840000);
const BACKING = BigInt.fromString('5000000000000000000000000');
const WAD = BigInt.fromString('1000000000000000000');
const BTC_TO_WAD = BigInt.fromString('10000000000');

function nav(btc: BigInt, backing: BigInt): BigInt {
  return btc.times(BTC_TO_WAD).times(WAD).div(backing);
}

describe('the backing curve', () => {
  afterEach(() => {
    clearStore();
  });

  test('a snapshot becomes a point, with the market price beside it', () => {
    mockOracle(true);

    handleTreasuryUpdated(treasuryUpdated(TREASURY_BTC, BACKING));

    assert.entityCount('NavPoint', 1);
    assert.fieldEquals(
      'NavPoint',
      '1',
      'navBtcPerStratWad',
      nav(TREASURY_BTC, BACKING).toString(),
    );
    assert.fieldEquals(
      'NavPoint',
      '1',
      'marketBtcPerStratWad',
      '2500000000000',
    );
  });

  test('a point is written with no market price while the oracle cannot answer', () => {
    mockOracle(false);

    handleTreasuryUpdated(treasuryUpdated(TREASURY_BTC, BACKING));

    assert.entityCount('NavPoint', 1);
    assert.fieldEquals(
      'NavPoint',
      '1',
      'navBtcPerStratWad',
      nav(TREASURY_BTC, BACKING).toString(),
    );
    // Matchstick cannot assert an absent field; the market price must stay null, not zero.
  });

  test('the same bitcoin over a smaller backing supply is a higher point', () => {
    mockOracle(true);

    handleTreasuryUpdated(treasuryUpdated(TREASURY_BTC, BACKING));
    const before = nav(TREASURY_BTC, BACKING);

    // A redemption shrinks the backing supply.
    const redeemed = BigInt.fromString('1000000000000000000000000');
    const after = BACKING.minus(redeemed);
    handleTreasuryUpdated(treasuryUpdated(TREASURY_BTC, after));

    assert.fieldEquals(
      'NavPoint',
      '1',
      'navBtcPerStratWad',
      nav(TREASURY_BTC, after).toString(),
    );
    assert.assertTrue(nav(TREASURY_BTC, after).gt(before));
  });

  test('a zero backing supply is a zero point, not a division', () => {
    mockOracle(true);

    handleTreasuryUpdated(treasuryUpdated(TREASURY_BTC, BigInt.zero()));

    assert.entityCount('NavPoint', 1);
    assert.fieldEquals('NavPoint', '1', 'navBtcPerStratWad', '0');
  });
});
