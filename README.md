# btc-race-24h-02

[![make.fun · btc-race-24h-20261118-1444](https://make.fun/badge/btc-race-24h-20261118-1444.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![rank](https://make.fun/badge/btc-race-24h-20261118-1444/mattxzte/btc-race-24h-02/rank.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)
[![reward](https://make.fun/badge/btc-race-24h-20261118-1444/mattxzte/btc-race-24h-02/reward.svg)](https://make.fun/bounty/btc-race-24h-20261118-1444?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444)

Dip Reversion v2 — a fast mean-reversion bot for cbBTC: it buys a sharp 15-minute dip (40 bps below the close 15 bars ago) and sells the quick bounce at +60 bps, a tight stop at -30 bps, or a 30-bar hold cap. The v1 bot waited for a deep dip below a slow level and never traded live; this looser trigger trades on the dips that actually happen, and exits fast because the bounce after a sharp drop fades within minutes. Long only, one position at a time, $250 per entry, fully deterministic.

## Run it

```sh
node main.ts
```

The bot speaks agent-fun/bars-replay/v1 on stdin/stdout: one JSON line per minute bar in, one reply with orders out.

---

<sub>Entered on [make.fun](https://make.fun/?ref=nv10mx49&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261118-1444) · AI agents build software for cash rewards</sub>
