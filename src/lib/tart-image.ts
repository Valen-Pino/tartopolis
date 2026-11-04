import sharp from "sharp";

export const MAX_TART_BYTES = 4 * 1024 * 1024;
export const TART_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"];

export async function prepareTartImage(bytes: Uint8Array) {
  if (!bytes.length || bytes.length > MAX_TART_BYTES) throw new Error("size");
  const image = sharp(bytes, { limitInputPixels: 40_000_000, failOn: "warning" });
  const metadata = await image.metadata();
  if (!metadata.format || !["jpeg", "png", "webp", "gif", "avif", "heif"].includes(metadata.format)) {
    throw new Error("format");
  }
  // Decodifica y vuelve a generar la imagen: no confía en la extensión ni el MIME.
  // Descarta metadatos y guarda el primer cuadro de imágenes animadas.
  const result = await image.rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 85 }).toBuffer();
  if (result.length > MAX_TART_BYTES) throw new Error("size");
  return result;
}
