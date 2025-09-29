module.exports = {
  env: {
    browser: false,
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'commonjs'
  },
  rules: {
    'no-console': 'off',
    camelcase: 'off',
    'prefer-const': 'error',
    'no-var': 'error',
    semi: ['error', 'always'],
    'no-trailing-spaces': 'error'
  }
};