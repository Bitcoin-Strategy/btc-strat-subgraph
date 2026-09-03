import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

// Loads the deployed WASM and checks its globals: graph-ts <= 0.38.0 corrupted them during startup.
// Host arenas are 10,000 bytes, as in graph-node.
test('Treasury globals initialize through the host with their strings intact', () => {
  const filename = process.env.TREASURY_WASM ?? 'build/Treasury/Treasury.wasm';
  const module = new WebAssembly.Module(readFileSync(filename));
  let wasm;
  let arena = 0;
  let arenaEnd = 0;

  function readString(pointer) {
    const memory = Buffer.from(wasm.memory.buffer);
    const length = memory.readUInt32LE(pointer - 4);
    assert.ok(pointer + length <= memory.length, 'string exceeds WASM memory');
    return memory.subarray(pointer, pointer + length).toString('utf16le');
  }

  function allocate(bytes, type) {
    // AS objects have a 20-byte header and are aligned to 16 bytes.
    const size = (bytes.length + 20 + 15) & ~15;
    if (arena + size > arenaEnd) {
      const arenaSize = Math.max(10_000, size + 12);
      arena = wasm.allocate(arenaSize) + 12;
      arenaEnd = arena + arenaSize - 12;
    }
    const pointer = arena + 20;
    arena += size;
    const memory = Buffer.from(wasm.memory.buffer);
    memory.fill(0, pointer - 20, pointer + bytes.length);
    memory.writeUInt32LE(wasm.id_of_type(wasm[`TypeId.${type}`].value), pointer - 8);
    memory.writeUInt32LE(bytes.length, pointer - 4);
    memory.set(bytes, pointer);
    return pointer;
  }

  function byteArray(bytes) {
    const buffer = allocate(bytes, 'ArrayBuffer');
    const fields = Buffer.alloc(12);
    fields.writeUInt32LE(buffer, 0);
    fields.writeUInt32LE(buffer, 4);
    fields.writeUInt32LE(bytes.length, 8);
    return allocate(fields, 'Uint8Array');
  }

  const imports = {};
  for (const entry of WebAssembly.Module.imports(module)) {
    imports[entry.module] ??= {};
    imports[entry.module][entry.name] = () => {
      throw new Error(`Unexpected host call: ${entry.module}.${entry.name}`);
    };
  }

  const expectedAddresses = new Set(
    readFileSync('src/generated-config/addresses.ts', 'utf8')
      .match(/0x[0-9a-fA-F]{40}/g)
      .map((a) => a.toLowerCase()),
  );
  const seenAddresses = [];
  imports.conversion['typeConversion.stringToH160'] = (pointer) => {
    const address = readString(pointer);
    assert.match(address, /^0x[0-9a-fA-F]{40}$/);
    assert.ok(
      expectedAddresses.has(address.toLowerCase()),
      `global address came out as ${address}`,
    );
    seenAddresses.push(address.toLowerCase());
    return byteArray(Buffer.from(address.slice(2), 'hex'));
  };

  const expectedNumbers = new Set(['1000000000000000000', '10000000000']);
  const seenNumbers = [];
  imports.numbers['bigInt.fromString'] = (pointer) => {
    const text = readString(pointer);
    assert.ok(expectedNumbers.has(text), `global BigInt came out as ${text}`);
    seenNumbers.push(text);
    let value = BigInt(text);
    const bytes = [];
    do {
      bytes.push(Number(value & 255n));
      value >>= 8n;
    } while (value);
    bytes.push(0); // Positive signed little-endian BigInt.
    return byteArray(bytes);
  };

  wasm = new WebAssembly.Instance(module, imports).exports;
  wasm._start();

  // Guards against a lazy init skipping the checks above.
  assert.deepEqual([...new Set(seenNumbers)].sort(), ['10000000000', '1000000000000000000']);
  assert.ok(seenAddresses.length >= 3, `only ${seenAddresses.length} addresses initialized`);
  assert.equal(new Set(seenAddresses).size, seenAddresses.length, 'an address initialized twice');
});
