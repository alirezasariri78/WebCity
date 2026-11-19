import { describe, expect, it } from 'vitest';
import { crc32, zipBytes } from '../../src/site';

const encode = (text: string) => new TextEncoder().encode(text);

interface Entry {
  name: string;
  content: string;
}

/** A tiny zip reader for stored (uncompressed) archives, enough to check our output. */
function readZip(bytes: Uint8Array): Entry[] {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const end = bytes.length - 22;
  expect(view.getUint32(end, true)).toBe(0x06054b50);
  const count = view.getUint16(end + 10, true);
  let at = view.getUint32(end + 16, true);
  const entries: Entry[] = [];
  const decoder = new TextDecoder();

  for (let i = 0; i < count; i++) {
    expect(view.getUint32(at, true)).toBe(0x02014b50);
    const size = view.getUint32(at + 20, true);
    const nameLength = view.getUint16(at + 28, true);
    const localOffset = view.getUint32(at + 42, true);
    const name = decoder.decode(bytes.subarray(at + 46, at + 46 + nameLength));

    expect(view.getUint32(localOffset, true)).toBe(0x04034b50);
    const dataStart = localOffset + 30 + view.getUint16(localOffset + 26, true);
    const data = bytes.subarray(dataStart, dataStart + size);
    expect(crc32(data)).toBe(view.getUint32(at + 16, true));

    entries.push({ name, content: decoder.decode(data) });
    at += 46 + nameLength;
  }
  return entries;
}

describe('zip', () => {
  it('computes the standard CRC-32', () => {
    expect(crc32(encode('123456789'))).toBe(0xcbf43926);
    expect(crc32(new Uint8Array())).toBe(0);
  });

  it('round-trips files, including non-English names and text', () => {
    const files = [
      { path: 'index.html', content: '<h1>Hello</h1>' },
      { path: 'سلام.html', content: 'کیک تازه 🍰' },
      { path: 'empty.txt', content: '' },
    ];
    const entries = readZip(zipBytes(files, new Date(2026, 0, 2, 3, 4, 6)));
    expect(entries).toEqual(files.map((f) => ({ name: f.path, content: f.content })));
  });

  it('makes a valid empty archive', () => {
    expect(readZip(zipBytes([]))).toEqual([]);
  });
});
