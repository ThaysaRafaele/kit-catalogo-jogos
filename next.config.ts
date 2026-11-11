import type { NextConfig } from "next";

// Sem "output: export": a área /admin precisa de rotas de API no servidor.
// As páginas públicas continuam estáticas, geradas no build a partir de content/.
const nextConfig: NextConfig = {
  images: { unoptimized: true },
  agentRules: false,
};

export default nextConfig;
