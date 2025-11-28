module.exports = {
  env: {
    browser: true,
    es2021: true
  },
  extends: 'standard-with-typescript',
  overrides: [],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
    project: ['./tsconfig.json'],
    tsconfigRootDir: __dirname,
    createDefaultProgram: true
  },
  rules: {
    "@typescript-eslint/strict-boolean-expressions": [
      "error",
      {
        "allowString": true,       
        "allowNullableString": true 
      }
    ]
  }
}
