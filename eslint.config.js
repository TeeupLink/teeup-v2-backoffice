import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { ecmaVersion: 2022, globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // UI 규칙: 브라우저 기본 대화상자 대신 ConfirmDialog·Toast 를 쓴다 (REQ-008)
      'no-restricted-globals': ['error', 'confirm', 'alert'],
      'no-restricted-properties': [
        'error',
        { object: 'window', property: 'confirm', message: 'useConfirm() 을 쓰세요' },
        { object: 'window', property: 'alert', message: 'toast() 를 쓰세요' },
      ],
    },
  },
);
