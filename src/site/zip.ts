export interface ZipEntry {
  path: string;
  content: string;
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

export function crc32(data: Uint8Array): number {
  let c = 0xffffffff;
  for (const byte of data) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

const UTF8_NAMES = 0x0800;
const VERSION = 20;

function dosDateTime(date: Date) {
  return {
    time: (date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1),
    date: ((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate(),
  };
}

function localHeader(name: Uint8Array, size: number, crc: number, stamp: { time: number; date: number }) {
  const header = new Uint8Array(30 + name.length);
  const v = new DataView(header.buffer);
  v.setUint32(0, 0x04034b50, true);
  v.setUint16(4, VERSION, true);
  v.setUint16(6, UTF8_NAMES, true);
  v.setUint16(10, stamp.time, true);
  v.setUint16(12, stamp.date, true);
  v.setUint32(14, crc, true);
  v.setUint32(18, size, true);
  v.setUint32(22, size, true);
  v.setUint16(26, name.length, true);
  header.set(name, 30);
  return header;
}

function centralHeader(name: Uint8Array, size: number, crc: number, offset: number, stamp: { time: number; date: number }) {
  const header = new Uint8Array(46 + name.length);
  const v = new DataView(header.buffer);
  v.setUint32(0, 0x02014b50, true);
  v.setUint16(4, VERSION, true);
  v.setUint16(6, VERSION, true);
  v.setUint16(8, UTF8_NAMES, true);
  v.setUint16(12, stamp.time, true);
  v.setUint16(14, stamp.date, true);
  v.setUint32(16, crc, true);
  v.setUint32(20, size, true);
  v.setUint32(24, size, true);
  v.setUint16(28, name.length, true);
  v.setUint32(42, offset, true);
  header.set(name, 46);
  return header;
}

function endRecord(count: number, centralSize: number, centralOffset: number) {
  const record = new Uint8Array(22);
  const v = new DataView(record.buffer);
  v.setUint32(0, 0x06054b50, true);
  v.setUint16(8, count, true);
  v.setUint16(10, count, true);
  v.setUint32(12, centralSize, true);
  v.setUint32(16, centralOffset, true);
  return record;
}

/** Builds an uncompressed ("stored") zip archive. */
export function zipBytes(entries: ZipEntry[], date = new Date()): Uint8Array {
  const encoder = new TextEncoder();
  const stamp = dosDateTime(date);
  const parts: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const name = encoder.encode(entry.path);
    const data = encoder.encode(entry.content);
    const crc = crc32(data);
    const local = localHeader(name, data.length, crc, stamp);
    parts.push(local, data);
    central.push(centralHeader(name, data.length, crc, offset, stamp));
    offset += local.length + data.length;
  }

  const centralSize = central.reduce((sum, c) => sum + c.length, 0);
  const all = [...parts, ...central, endRecord(entries.length, centralSize, offset)];
  const out = new Uint8Array(all.reduce((sum, p) => sum + p.length, 0));
  let at = 0;
  for (const part of all) {
    out.set(part, at);
    at += part.length;
  }
  return out;
}

export const makeZip = (entries: ZipEntry[]) => new Blob([zipBytes(entries) as BlobPart], { type: 'application/zip' });
