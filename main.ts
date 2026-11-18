// Dip Reversion v2 — a fast mean-reversion bot for cbBTC on make.fun.
// Strategy: buy a sharp 15-minute dip and sell the quick bounce. The v1 bot
// waited for a deep dip below a slow level and never traded live; this one
// uses a much looser trigger so it actually trades, and exits fast because
// the bounce after a sharp drop fades within minutes in this market.
//   entry: close at least 40 bps below the close 15 bars ago (one position)
//   exit:  +60 bps take profit, -30 bps stop, or 30 bars max hold
//   pause: 10 bars after any exit before a new entry
// Costs run about 12 bps of fees and slippage plus a few bps of pool impact
// per round trip, so a trade needs a move bigger than that to pay. The bot is
// long only, holds at most one position, and never reads the clock, the
// environment, or any randomness: every decision comes from the bars and the
// fills the harness sends, so two runs on the same data give the same orders.

import { runBars } from './vendor/makefun-bars.ts';
import type { BarsState, Batch } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';

// How far back the dip is measured, in bars.
const DIP_BARS = 15;
// The dip that triggers a buy, in basis points.
const DIP_BPS = 40n;
// Cash committed to each entry, in USDC.
const BUY_USDC = 250n;
// Exit levels, in basis points from the fill price.
const TAKE_PROFIT_BPS = 60n;
const STOP_LOSS_BPS = 30n;
// Longest a position is held, in bars.
const MAX_HOLD_BARS = 30;
// Bars to wait after an exit before entering again.
const COOLDOWN_BARS = 10;
// Slippage allowance on every order, in basis points.
const MAX_SLIPPAGE_BPS = 100;

const BPS = 10000n;

// Closes of the bars seen so far, newest last, as raw price units.
const closes: bigint[] = [];
// Fill price of the open position, null when flat.
let entryPrice: bigint | null = null;
// Batch seq at which the open position filled.
let entrySeq = -1;
// Batch seq of the most recent exit fill; -1e9 so the first entry is free.
let lastExitSeq = -1e9;

// Basis points of (now - then) / then, truncated toward zero.
function bpsMove(then: bigint, now: bigint): bigint {
  return ((now - then) * BPS) / then;
}

await runBars({
  onBatch(state: BarsState, batch: Batch) {
    if (state.warmingUp) return [];

    // Keep the close history current.
    for (const bar of batch.bars) {
      if (bar.symbol === SYMBOL) closes.push(BigInt(bar.c));
    }
    if (closes.length > DIP_BARS + 1) closes.splice(0, closes.length - (DIP_BARS + 1));

    // Learn from the fills of the orders decided on the previous batch.
    for (const fill of batch.fills) {
      if (fill.status !== 'filled' || fill.symbol !== SYMBOL) continue;
      if (fill.side === 'buy' && fill.client_id.startsWith('b')) {
        entryPrice = BigInt(fill.price);
        entrySeq = state.seq;
      } else if (fill.side === 'sell' && fill.client_id.startsWith('s')) {
        entryPrice = null;
        lastExitSeq = state.seq;
      }
    }

    const held = state.positions.get(SYMBOL)?.qty ?? 0n;
    const close = state.close(SYMBOL);
    if (close === null) return [];

    // A held position with no recorded fill price (should not happen): anchor
    // it at the current close so the exit rules still manage it.
    if (held > 0n && entryPrice === null) {
      entryPrice = close;
      entrySeq = state.seq;
    }

    // Exit: take profit, stop loss, or the hold cap.
    if (held > 0n && entryPrice !== null) {
      const gain = bpsMove(entryPrice, close);
      const heldBars = state.seq - entrySeq;
      if (gain >= TAKE_PROFIT_BPS || gain <= -STOP_LOSS_BPS || heldBars >= MAX_HOLD_BARS) {
        return [{
          side: 'sell',
          symbol: SYMBOL,
          qty: held,
          max_slippage_bps: MAX_SLIPPAGE_BPS,
          client_id: `s${state.seq}`,
        }];
      }
      return [];
    }

    // Entry: a sharp dip over the last DIP_BARS bars, after the cooldown.
    if (closes.length < DIP_BARS + 1) return [];
    if (state.seq - lastExitSeq < COOLDOWN_BARS) return [];
    const dip = bpsMove(closes[0], close);
    if (dip > -DIP_BPS) return [];

    const scale = BigInt(state.hello.capital.quote_scale);
    const want = BUY_USDC * 10n ** scale;
    const minNotional = BigInt(state.hello.fees.min_notional_quote_units);
    const room = state.weightRoom(SYMBOL);
    let spend = want < state.cash ? want : state.cash;
    if (spend > room) spend = room;
    if (spend < minNotional) return [];

    return [{
      side: 'buy',
      symbol: SYMBOL,
      notional_quote_units: spend,
      max_slippage_bps: MAX_SLIPPAGE_BPS,
      client_id: `b${state.seq}`,
    }];
  },
});
