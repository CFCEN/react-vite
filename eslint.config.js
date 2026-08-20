import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import importPlugin from 'eslint-plugin-import';
import promise from 'eslint-plugin-promise';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

/**
 * Flat config for ESLint 10.
 *
 * Migration notes vs the removed legacy `.eslintrc.cjs`:
 * - Dropped unavailable packages (@tencent/eslint-config-tencent, eslint-plugin-react,
 *   eslint-plugin-simple-import-sort, eslint-plugin-prettier) — not in package.json.
 * - eslint-plugin-node has no flat-config support and targets ESLint <=8; skipped.
 *   Node globals covered via `globals.node` for tooling files.
 * - Formatting left to Prettier; no style/layout rules here.
 * - Type-aware rules deferred (non-type-aware recommended set) for speed/simplicity.
 */
export default defineConfig([
  globalIgnores([
    'dist/**',
    'build/**',
    'coverage/**',
    'node_modules/**',
    '.history/**',
    'public/**',
    '**/*.d.ts',
    // Frozen / do-not-touch areas
    'src/pages/card/**',
    'src/router/card/**',
    'src/assets/hero.png',
  ]),

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    files: ['**/*.{js,mjs,cjs,ts,tsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
      },
    },
    plugins: {
      import: importPlugin,
      promise,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    settings: {
      'import/resolver': {
        node: {
          extensions: ['.js', '.jsx', '.ts', '.tsx'],
        },
      },
      'import/parsers': {
        '@typescript-eslint/parser': ['.ts', '.tsx'],
      },
    },
    rules: {
      // --- react-hooks: classic bug-finders only ---
      // React Compiler rules in v7 recommended are noisy without the compiler; keep off.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',

      // --- react-refresh (Vite) ---
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],

      // --- import ---
      // eslint-plugin-import@2 is not fully ESLint 10 compatible:
      // import/order's autofix calls removed SourceCode APIs and crashes the run.
      // No eslint-import-resolver-typescript installed → unresolved checks would
      // false-positive on @/* aliases. Keep duplicate detection only.
      'import/no-unresolved': 'off',
      'import/named': 'off',
      'import/order': 'off',
      'import/no-duplicates': 'warn',

      // --- promise (keep high-signal subset; drop noisy style-ish ones) ---
      'promise/param-names': 'error',
      'promise/no-return-wrap': 'error',
      'promise/no-new-statics': 'error',
      'promise/no-return-in-finally': 'warn',
      'promise/valid-params': 'warn',
      'promise/catch-or-return': 'off',
      'promise/always-return': 'off',
      'promise/no-nesting': 'off',
      'promise/avoid-new': 'off',
      'promise/no-promise-in-callback': 'off',
      'promise/no-callback-in-promise': 'off',

      // --- typescript-eslint adjustments (carry over useful old intent) ---
      '@typescript-eslint/no-empty-function': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      '@typescript-eslint/no-inferrable-types': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-duplicate-enum-values': 'off',
      // naming-convention is noisy for this codebase; leave off
      '@typescript-eslint/naming-convention': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],

      // --- core ---
      'array-callback-return': 'error',
      'no-unsafe-optional-chaining': 'off',
      'no-empty-pattern': 'off',
      // Formatting / style → Prettier (.prettierrc: singleQuote, trailingComma es5)
      'max-len': 'off',
      'operator-linebreak': 'off',
      semi: 'off',
      quotes: 'off',
      indent: 'off',
      'comma-dangle': 'off',
      'object-curly-spacing': 'off',
      'arrow-parens': 'off',
    },
  },

  // JSX / React source
  {
    files: ['**/*.{tsx,jsx}'],
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
  },

  // Tooling configs (vite etc.) — Node globals already merged above
  {
    files: ['vite.config.ts', 'eslint.config.js'],
    languageOptions: {
      globals: globals.node,
    },
  },

  // Entry file hosts bridge/theme wrappers; Fast Refresh on them is irrelevant
  {
    files: ['src/main.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
]);
