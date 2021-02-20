module.exports = {
  env: {
    es2020: true,
    node: true,
    browser: true,
    webextensions: true,
  },
  extends: 'eslint:recommended',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
  },
  ignorePatterns: ['**/node_modules'],
  rules: {
    indent: ['error', 2, { SwitchCase: 1 }],
    quotes: ['error', 'single', { avoidEscape: true }],
    'comma-dangle': ['error', 'always-multiline'],
    semi: ['error', 'always'],
    'no-unused-vars': ['error', { 'argsIgnorePattern': '^_' }],
    // 'no-unused-vars': [
    //   'error',
    //   { args: 'none' },
    // ],
    'linebreak-style': ['error', 'unix'],
    'no-extra-parens': ['error', 'all'],
    'no-loss-of-precision': ['error'],
    'space-before-function-paren': ['error', 'never'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never', {
      // arraysInArrays: true,
      // objectsInArrays: true,
    }],
  },
};
