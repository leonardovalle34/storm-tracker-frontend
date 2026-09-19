import js from '@eslint/js'
import prettier from 'eslint-config-prettier'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...pluginVue.configs['flat/recommended'],
  {
    files: ['**/*.vue'],
    languageOptions: { parserOptions: { parser: tseslint.parser } },
  },
  {
    files: ['**/*.{ts,vue}'],
    languageOptions: { globals: { ...globals.browser } },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports' }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'vue/multi-word-component-names': 'off',
      'vue/block-order': ['error', { order: ['script', 'template', 'style'] }],
    },
  },
  {
    files: ['*.config.{js,ts}'],
    languageOptions: { globals: { ...globals.node } },
  },
  {
    files: ['**/*.spec.ts', 'src/test/**'],
    rules: { '@typescript-eslint/no-explicit-any': 'off', '@typescript-eslint/no-non-null-assertion': 'off' },
  },
  prettier, // last: turns off formatting rules that would fight Prettier
)
