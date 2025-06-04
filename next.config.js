/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
// @ts-nocheck
await import("./src/env.js");

/** @type {import("next").NextConfig} */
const config = {
    images: {
        domains: [
            'lh3.googleusercontent.com',
            'avatars.githubusercontent.com',
            'kd6uxjvo8hyw1ahh.public.blob.vercel-storage.com',
            'img.youtube.com',
            'i.ytimg.com',
        ],
    },

  // Configuração do webpack para marcar bcrypt como externo
  webpack: (config) => {
    // Adicionar bcrypt e handlebars à lista de módulos externos
    config.externals = [...(config.externals || []), "bcrypt", "handlebars", "@sparticuz/chromium"];

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
  turbopack: {},

  experimental: {
    serverActions: {
      bodySizeLimit: '50mb',
    },
  },

  serverRuntimeConfig: {
    // Aumentar o timeout para 60 segundos
    apiResponseTimeout: 60000,
  },

  // O timeout já está configurado em serverRuntimeConfig
};

export default config;