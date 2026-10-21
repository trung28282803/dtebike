import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Prisma Client là native binary — không bundle vào serverless output.
  serverExternalPackages: ["@prisma/client", ".prisma/client"],
  // Có package-lock.json ở thư mục cha nên Next đoán sai workspace root → khóa lại.
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
