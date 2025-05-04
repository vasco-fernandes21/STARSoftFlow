/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
// @ts-nocheck
import "./src/env.js";

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuração do webpack para marcar bcrypt como externo
  webpack: (config) => {
    // Adicionar bcrypt e handlebars à lista de módulos externos
    config.externals = [...(config.externals || []), "bcrypt", "handlebars"];

    // Manter as outras configurações que já tens
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      os: false,
      nock: false,
      "@mswjs/interceptors/presets/node": false,
    };

    // Ignorar ficheiros HTML em node_modules
    config.module.rules.push({
      test: /\.html$/,
      include: /node_modules/,
      use: "null-loader",
    });

    // Configurar handlebars para usar o loader correto
    config.module.rules.push({
      test: /\.handlebars$/,
      loader: "handlebars-loader",
    });

    return config;
  },

  // Configuração mínima do Turbopack
  turbopack: {}
};

export default nextConfig;
