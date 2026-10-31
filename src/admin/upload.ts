import JSZip from 'jszip';
import { supabase, BUCKET } from '@/lib/supabase';

export type PreparedFile = { path: string; blob: Blob; type: string };
export type Prepared = { entry: string; files: PreparedFile[]; totalBytes: number };

const TYPES: Record<string, string> = {
  html: 'text/html', htm: 'text/html', css: 'text/css', js: 'text/javascript', mjs: 'text/javascript', json: 'application/json',
  svg: 'image/svg+xml', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif', webp: 'image/webp', avif: 'image/avif', ico: 'image/x-icon',
  mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg', m4a: 'audio/mp4', aac: 'audio/aac', webm: 'audio/webm', mp4: 'video/mp4',
  woff: 'font/woff', woff2: 'font/woff2', ttf: 'font/ttf', otf: 'font/otf', txt: 'text/plain',
};
const typeOf = (path: string) => TYPES[path.split('.').pop()?.toLowerCase() ?? ''] ?? 'application/octet-stream';
const MAX_BYTES = 45 * 1024 * 1024;

/** Turn an uploaded .html or .zip into a list of files plus the entry page. */
export async function prepareUpload(file: File): Promise<Prepared> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.html') || lower.endsWith('.htm')) {
    return { entry: 'index.html', files: [{ path: 'index.html', blob: file, type: 'text/html' }], totalBytes: file.size };
  }
  if (!lower.endsWith('.zip')) throw new Error('Please choose a .html or .zip file.');

  const zip = await JSZip.loadAsync(file);
  let names = Object.values(zip.files)
    .filter((f) => !f.dir)
    .map((f) => f.name)
    .filter((n) => !n.startsWith('__MACOSX/') && !/(^|\/)(\.DS_Store|Thumbs\.db)$/.test(n));
  if (!names.length) throw new Error('The zip is empty.');

  // If everything sits inside one top folder, drop that folder from the paths.
  const tops = new Set(names.map((n) => (n.includes('/') ? n.split('/')[0] : '')));
  const strip = tops.size === 1 && !tops.has('') ? `${[...tops][0]}/` : '';
  const files: PreparedFile[] = [];
  let total = 0;
  for (const n of names) {
    const path = n.slice(strip.length);
    if (path.includes('..')) continue;
    const blob = await zip.files[n].async('blob');
    total += blob.size;
    files.push({ path, blob: new Blob([blob], { type: typeOf(path) }), type: typeOf(path) });
  }
  if (total > MAX_BYTES) throw new Error('The zip is larger than 45 MB. Please compress sounds or images.');
  names = files.map((f) => f.path);
  const entry =
    names.find((n) => n.toLowerCase() === 'index.html') ??
    names.find((n) => !n.includes('/') && /\.html?$/i.test(n)) ??
    names.find((n) => /\.html?$/i.test(n));
  if (!entry) throw new Error('No .html file was found in the zip.');
  return { entry, files, totalBytes: total };
}

/** Upload into puzzles/<number>/v<version>/… ; returns the folder. */
export async function uploadPrepared(number: number, version: number, prepared: Prepared, onProgress?: (done: number, total: number) => void) {
  const folder = `${number}/v${version}`;
  let done = 0;
  for (const f of prepared.files) {
    const { error } = await supabase!.storage
      .from(BUCKET)
      .upload(`${folder}/${f.path}`, f.blob, { contentType: f.type, upsert: true, cacheControl: '31536000' });
    if (error) throw new Error(`Upload failed for ${f.path}: ${error.message}`);
    done += 1;
    onProgress?.(done, prepared.files.length);
  }
  return folder;
}

/** Remove every stored file of a puzzle (all versions). */
export async function removePuzzleFiles(number: number) {
  const root = String(number);
  const { data: versions } = await supabase!.storage.from(BUCKET).list(root, { limit: 1000 });
  for (const v of versions ?? []) {
    const paths: string[] = [];
    const walk = async (prefix: string) => {
      const { data } = await supabase!.storage.from(BUCKET).list(prefix, { limit: 1000 });
      for (const item of data ?? []) {
        const p = `${prefix}/${item.name}`;
        if (item.id) paths.push(p);
        else await walk(p);
      }
    };
    await walk(`${root}/${v.name}`);
    if (paths.length) await supabase!.storage.from(BUCKET).remove(paths);
  }
}
