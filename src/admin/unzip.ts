/**
 * Minimal .zip reader with no dependencies.
 * Supports the two methods every zip tool uses: stored (0) and deflate (8),
 * using the browser's built-in DecompressionStream('deflate-raw').
 */
export type ZipEntry = { name: string; data: Blob };

const u16 = (v: DataView, o: number) => v.getUint16(o, true);
const u32 = (v: DataView, o: number) => v.getUint32(o, true);

async function inflateRaw(bytes: Uint8Array): Promise<Blob> {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot open zip files. Please use a recent Chrome, Edge, Safari or Firefox.');
  }
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return await new Response(stream).blob();
}

export async function unzip(file: Blob): Promise<ZipEntry[]> {
  const buf = new Uint8Array(await file.arrayBuffer());
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);

  // Find the End Of Central Directory record (it sits in the last 64 KB + 22 bytes).
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (u32(view, i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('This does not look like a valid .zip file.');

  const count = u16(view, eocd + 10);
  let p = u32(view, eocd + 16); // start of central directory
  const utf8 = new TextDecoder('utf-8');
  const entries: ZipEntry[] = [];

  for (let i = 0; i < count; i++) {
    if (u32(view, p) !== 0x02014b50) throw new Error('The zip file is damaged (central directory).');
    const method = u16(view, p + 10);
    const compSize = u32(view, p + 20);
    const nameLen = u16(view, p + 28);
    const extraLen = u16(view, p + 30);
    const commentLen = u16(view, p + 32);
    const localOffset = u32(view, p + 42);
    const name = utf8.decode(buf.subarray(p + 46, p + 46 + nameLen));
    p += 46 + nameLen + extraLen + commentLen;

    if (name.endsWith('/')) continue; // folder
    if (compSize === 0xffffffff || localOffset === 0xffffffff) throw new Error('Zip files over 4 GB are not supported.');
    if (u32(view, localOffset) !== 0x04034b50) throw new Error(`The zip file is damaged (${name}).`);
    const dataStart = localOffset + 30 + u16(view, localOffset + 26) + u16(view, localOffset + 28);
    const raw = buf.subarray(dataStart, dataStart + compSize);

    let data: Blob;
    if (method === 0) data = new Blob([raw]);
    else if (method === 8) data = await inflateRaw(raw);
    else throw new Error(`${name} uses an unsupported compression method (${method}). Re-zip it with a standard zip tool.`);
    entries.push({ name, data });
  }
  return entries;
}
