import { defineConfig, globalIgnores } from "eslint/config";
import nextPlugin from "eslint-config-next";

const eslintConfig = defineConfig([
  nextPlugin,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Proyectos nativos de Capacitor: su build/ copia JS generado que no es nuestro.
    "android/**",
    "ios/**",
  ]),
]);

export default eslintConfig;
