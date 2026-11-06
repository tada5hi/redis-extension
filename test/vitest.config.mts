import { defineConfig } from 'vitest/config';

export default defineConfig({
    "test": {
        "include": [
            "test/unit/**/*.{js,jsx,ts,tsx}",
            "test/**/*.{test,spec}.{js,jsx,ts,tsx}"
        ],
        "exclude": ["**/node_modules/**", "**/dist/**", "test/unit/mock-util.ts"],
        "coverage": {
            "provider": "v8",
            "reportsDirectory": "writable/coverage",
            "include": [
                "src/**/*.{ts,tsx,js,jsx}"
            ],
            "exclude": [
                "src/**/*.d.ts",
                "src/driver/**/*.{ts,js}"
            ],
            "thresholds": {
                "branches": 65,
                "functions": 65,
                "lines": 65,
                "statements": 65
            }
        },
        "globalSetup": "./test/setup.js"
    }
});
