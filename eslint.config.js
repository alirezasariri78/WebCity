import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-non-null-assertion': 'off',
      eqeqeq: ['error', 'always'],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
    },
  },
  {
    files: ['src/core/**', 'src/site/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['**/ui/**', '**/game/**', '**/render/**'],
              message: 'core/ and site/ must stay pure: no UI, game state or rendering imports.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['src/game/**'],
    rules: {
      'no-restricted-imports': ['error', { patterns: [{ group: ['**/ui/**'], message: 'game/ must not depend on the UI.' }] }],
    },
  },
  { files: ['tests/**', '*.config.*'], languageOptions: { globals: { ...globals.node } } },
  prettier,
);
