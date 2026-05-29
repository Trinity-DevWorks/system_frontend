import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.js");

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Lowers peak Webpack memory during dev/build (Next.js 15+).
    webpackMemoryOptimizations: true,
    // Tree-shake heavy UI packages instead of pulling full barrels.
    optimizePackageImports: ["antd", "@ant-design/icons"],
  },
};

export default withNextIntl(nextConfig);
