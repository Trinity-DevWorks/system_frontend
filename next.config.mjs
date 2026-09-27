import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.js");

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enables smaller Docker images (`Dockerfile` copies `.next/standalone`).
  output: "standalone",
  experimental: {
    // Lowers peak Webpack memory during dev/build (Next.js 15+).
    webpackMemoryOptimizations: true,
    // Tree-shake heavy UI packages instead of pulling full barrels.
    optimizePackageImports: ["antd", "@ant-design/icons"],
    // After each Turbopack snapshot, drop the in-memory cache and reload it
    // from disk. Keeps `next dev --turbo` from holding ~10GB until the OS kills it.
    turbopackMemoryEviction: "full",
  },
  transpilePackages: ["@safe-global/protocol-kit", "@safe-global/api-kit"],
};

export default withNextIntl(nextConfig);
