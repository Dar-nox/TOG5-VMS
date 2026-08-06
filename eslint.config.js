import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import tseslint from "typescript-eslint";

export default tseslint.config(
  // target/ holds Rust build output, including JavaScript Tauri generates
  // for its own use. It is not ours to lint.
  { ignores: ["dist", "target", "src-tauri/target"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // Service worker code. It runs in a worker rather than a page, so `self` and
  // the rest of the worker globals are what it has instead of `window`.
  {
    files: ["public/sw-*.js"],
    languageOptions: {
      globals: { self: "readonly", clients: "readonly" },
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
    },
  },
);
