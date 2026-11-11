import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { edicaoMaisRecente } from "@/lib/conteudo";
import { LOGO_CURSO, LOGO_ESCOLA } from "@/lib/marca";

/** Imagem que aparece ao compartilhar o link (WhatsApp, redes sociais). Gerada no build. */
export const alt = "Catálogo dos Jogos: LEVEL UP, Mostra Cultural do CEEP Hércules Maymone";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-static";

const raiz = process.cwd();

/** O gerador de imagem não lê WebP: o logo vira PNG, já no tamanho usado. */
async function logo(arquivo: string, lado: number) {
  const png = await sharp(path.join(raiz, "public", arquivo))
    .resize(lado, lado, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString("base64")}`;
}

/** As mesmas fontes do site, guardadas em src/app/fontes (licença OFL). */
const fonte = (arquivo: string) => readFile(path.join(raiz, "src/app/fontes", arquivo));

export default async function ImagemDeCompartilhamento() {
  const { ano } = edicaoMaisRecente();
  const [escola, curso, press, pixelify] = await Promise.all([
    logo(LOGO_ESCOLA.grande, 170),
    logo(LOGO_CURSO.grande, 210),
    fonte("PressStart2P-Regular.ttf"),
    fonte("PixelifySans-Medium.ttf"),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#cdebfa",
      }}
    >
      <div
        style={{
          width: 1080,
          height: 510,
          display: "flex",
          alignItems: "center",
          gap: 56,
          padding: "0 64px",
          background: "#fbf5e8",
          border: "8px solid #4a2a18",
          borderRadius: 16,
          color: "#2a1a12",
          fontFamily: "Pixelify Sans",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 20 }}>
          <img src={escola} width={170} height={170} alt="" />
          <img src={curso} width={210} height={210} alt="" />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, flex: 1 }}>
          <div style={{ display: "flex", fontSize: 30, letterSpacing: 4, color: "#8a3a1c" }}>MOSTRA CULTURAL</div>
          <div
            style={{
              display: "flex",
              fontFamily: "Press Start 2P",
              fontSize: 72,
              lineHeight: 1.2,
              color: "#5a1a10",
              textShadow: "6px 6px 0 #f0b55a",
            }}
          >
            LEVEL UP
          </div>
          <div style={{ display: "flex", fontFamily: "Press Start 2P", fontSize: 36, letterSpacing: 8, color: "#2a1406" }}>
            {ano}
          </div>
          <div style={{ display: "flex", marginTop: 16, fontSize: 46, color: "#2a1406" }}>Catálogo dos Jogos</div>
          <div style={{ display: "flex", fontSize: 28, color: "#5b4636" }}>
            Programação de Jogos Digitais • CEEP Hércules Maymone
          </div>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "Press Start 2P", data: press, style: "normal", weight: 400 },
        { name: "Pixelify Sans", data: pixelify, style: "normal", weight: 400 },
      ],
    },
  );
}
