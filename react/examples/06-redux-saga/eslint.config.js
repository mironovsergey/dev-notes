import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import { defineConfig, globalIgnores } from 'eslint/config';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default defineConfig([
  globalIgnores(['**/dist/**', '**/node_modules/**', '**/mockServiceWorker.js']),
  {
    files: ['**/*.{js,ts,tsx}'],
    extends: [js.configs.recommended],
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
  },
  {
    files: ['**/*.{js,ts,tsx}'],
    plugins: { '@stylistic': stylistic },
    rules: {
      // Вертикальный ритм: Prettier пустые строки не расставляет, поэтому их задает линтер.
      '@stylistic/padding-line-between-statements': [
        'error',

        // Пустая строка после объявлений разрешена, но не навязана: только автор знает,
        // закончилась ли мысль объявлением или продолжается в следующей строке.
        { blankLine: 'any', prev: ['const', 'let'], next: '*' },

        // Перед составными операторами и после них.
        { blankLine: 'always', prev: '*', next: ['if', 'for', 'while', 'switch', 'try'] },
        { blankLine: 'always', prev: ['if', 'for', 'while', 'switch', 'try'], next: '*' },

        // Перед возвратом из функции.
        { blankLine: 'always', prev: '*', next: 'return' },
      ],
      '@stylistic/lines-around-comment': [
        'error',
        {
          beforeLineComment: true,
          beforeBlockComment: true,
          allowBlockStart: true,
          allowObjectStart: true,
          allowArrayStart: true,
          allowClassStart: true,
          allowInterfaceStart: true,
          allowTypeStart: true,
          allowEnumStart: true,
          allowModuleStart: true,
        },
      ],
      '@stylistic/lines-between-class-members': [
        'error',
        'always',
        { exceptAfterSingleLine: true },
      ],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [tseslint.configs.recommended, reactHooks.configs.flat.recommended],
    rules: {
      curly: ['error', 'all'],

      // Параметр с подчеркиванием объявлен намеренно: в редьюсерах RTK он
      // задает тип payload, даже когда тело его не читает.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'never' }],
      '@typescript-eslint/ban-ts-comment': [
        'error',
        { 'ts-expect-error': true, 'ts-ignore': true },
      ],
    },
  },
]);
