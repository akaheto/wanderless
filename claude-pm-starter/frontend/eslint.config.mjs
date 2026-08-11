import { FlatCompat } from "@eslint/eslintrc";

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // Add project-specific overrides here, not in CLAUDE.md —
      // the linter is the source of truth.
    },
  },
];

export default eslintConfig;
