/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack(config) {
    // pdfjs-dist references the Node `canvas` package for server-side page
    // rendering. We only use text extraction in the browser, so stub it out
    // and silence webpack's "module not found" error.
    config.resolve = config.resolve ?? {};
    config.resolve.alias = {
      ...(config.resolve.alias ?? {}),
      canvas: false,
    };
    return config;
  },
};

module.exports = nextConfig;
