/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // @react-pdf/renderer embarque des deps natives (fontkit, yoga) qui ne
    // doivent pas être bundlées par Next → on les garde externes côté serveur.
    serverComponentsExternalPackages: ["@react-pdf/renderer"],
  },
};

export default nextConfig;
