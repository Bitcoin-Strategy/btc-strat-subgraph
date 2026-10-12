# BTC Strategy Subgraph

Subgraph for the BTC Strategy protocol on Robinhood Chain. Indexes `TreasuryUpdated` into the NAV history (`NavPoint`) that the app charts; everything else is read live from the contracts.

## Getting started

```bash
npm install
npm run sync -- <contracts-repo> robinhood robinhood-mainnet
npm run check
```

`sync` regenerates `subgraph.yaml`, `networks.json`, the ABIs and `src/generated-config` from a contracts deployment file. `check` runs codegen, the production build and the tests.

## Commands

| Command | Description |
| --- | --- |
| `npm run codegen` | Generate AssemblyScript types |
| `npm run build` | Build the subgraph |
| `npm test` | Matchstick tests |
| `npm run test:wasm` | Runtime test of the built WASM |
| `npm run health -- <url>` | Check a deployed endpoint |

## Deployment

Deployed on Goldsky. The app reads the `prod` tag, so a new version is released by retagging.

```bash
npm run deploy:goldsky -- btc/<version> --path .
goldsky subgraph tag create btc/<version> --tag prod
```

Endpoint: `https://api.goldsky.com/api/public/project_cmp4213fdupdk01zh59u6dv3f/subgraphs/btc/prod/gn`

## License

[MIT](LICENSE)
