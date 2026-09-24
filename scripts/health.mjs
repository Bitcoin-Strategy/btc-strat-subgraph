import assert from 'node:assert/strict';

const endpoint = process.argv[2] ?? process.env.SUBGRAPH_URL;
if (!endpoint) {
  console.error('Usage: npm run health -- <GraphQL URL>');
  process.exit(1);
}

const response = await fetch(endpoint, {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  signal: AbortSignal.timeout(30_000),
  body: JSON.stringify({
    query: `{
      _meta { deployment hasIndexingErrors block { number hash } }
      navPoints(first: 1, orderBy: timestamp, orderDirection: desc) {
        id timestamp navBtcPerStratWad marketBtcPerStratWad
      }
    }`,
  }),
});
assert.ok(response.ok, `GraphQL HTTP ${response.status}`);
const result = await response.json();
assert.ok(!result.errors?.length, JSON.stringify(result.errors));
assert.ok(result.data?._meta, 'Deployment has not started indexing');
assert.equal(result.data._meta.hasIndexingErrors, false, 'Indexing has failed');
// Catches a stalled or restarted index that still answers HTTP 200.
if (process.env.MIN_INDEXED_BLOCK) {
  assert.ok(
    BigInt(result.data._meta.block.number) >= BigInt(process.env.MIN_INDEXED_BLOCK),
    `Index has not reached block ${process.env.MIN_INDEXED_BLOCK}`,
  );
}
console.log(JSON.stringify(result.data, null, 2));
