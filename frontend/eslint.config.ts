import eslintJs from '@eslint/js';
import eslintReact from '@eslint-react/eslint-plugin';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default [
    {
        ignores: [
            'dist',
            'node_modules',
            '**/*.d.ts',
            'src/**/*.js',
            'eslint.config.js',
        ],
    },
    eslintJs.configs.recommended,
    ...tseslint.configs.recommended,
    {
        files: ['eslint.config.ts', 'vite.config.ts'],
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                projectService: false,
            },
        },
    },
    {
        files: ['**/*.tsx', '**/*.jsx'],
        plugins: {
            '@eslint-react': eslintReact,
        },
        languageOptions: {
            globals: { ...globals.browser },
            parserOptions: {
                ecmaFeatures: { jsx: true },
            },
        },
        rules: {
            ...eslintReact.configs.recommended.rules,
            '@eslint-react/no-missing-key': 'warn',
        },
    },
    {
        files: ['src/**/*.ts', 'src/**/*.tsx'],
        plugins: {
            '@eslint-react': eslintReact,
        },
        languageOptions: {
            parser: tseslint.parser,
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            ...eslintReact.configs['recommended-typescript'].rules,
            '@eslint-react/no-missing-key': 'warn',
        },
    },
    {
        rules: {
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': [
                'warn',
                { argsIgnorePattern: '^_' },
            ],
        },
    },
];
