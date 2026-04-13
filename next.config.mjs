/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "d2xsxph8kpxj0f.cloudfront.net",
      },
    ],
  },
  outputFileTracingIncludes: {
    "/api/quotes/pdf/**": [
      "node_modules/pdfkit/js/data/*.afm",
    ],
  },
};

export default nextConfig;