import globals from "globals";

export default [
    {
        files: ["**/*.ts", "**/*.tsx"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            globals: globals.browser,
        },
        rules: {
            // Kullanılmayan fonksiyonları, değişkenleri ve parametreleri yakalar
            "no-unused-vars": "warn",

            // React için opsiyonel
            "react/react-in-jsx-scope": "off",
        },
    }
];

