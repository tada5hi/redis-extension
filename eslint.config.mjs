import config from '@tada5hi/eslint-config';

export default config(
    { typescript: true },
    { ignores: ['**/dist/**', '**/*.d.ts', '**/coverage/**'] },
    {
        rules: {
            'class-methods-use-this': 'off',
            'no-shadow': 'off',
            'no-use-before-define': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
        },
    },
);
