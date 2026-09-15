import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { createLocalSigningKey, normalizeLocalSigningKeys } from './local-signing-key.js';

await mkdir('.local', { recursive: true });
let keys: unknown;
try { keys = JSON.parse(await readFile('supabase/signing_keys.json', 'utf8')); }
catch (error) {
  if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
  keys = [await createLocalSigningKey()];
}
await writeFile('supabase/signing_keys.json', JSON.stringify(normalizeLocalSigningKeys(keys)), { mode: 0o600 });
console.log('Chave de assinatura local preparada; conteúdo não exibido.');
