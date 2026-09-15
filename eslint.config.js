import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
export default tseslint.config(
  { ignores: ['dist/**', 'apps/web/dist/**', 'apps/web/public/ocr/**', 'node_modules/**', 'supabase/.temp/**', '.local/**', '.vercel/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  { languageOptions: { globals: { ...globals.node, ...globals.browser } } }
);
