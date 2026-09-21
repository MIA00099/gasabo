import { Router } from 'express';
import path from 'path';
import fs from 'fs/promises';
import sharp from 'sharp';
import { env } from '../config/env.js';

export const imagesRouter = Router();

const UPLOAD_DIR = path.resolve('server', 'uploads');
const MIN_WIDTH = 48;
const MAX_WIDTH = 1800;
const DEFAULT_WIDTH = 640;
const MIN_QUALITY = 45;
const MAX_QUALITY = 90;
const DEFAULT_QUALITY = 74;
const LOCAL_OPTIMIZABLE_EXT = /\.(?:jpe?g|png|webp)$/i;

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function supabaseOrigin(): string | null {
  try {
    return env.SUPABASE_URL ? new URL(env.SUPABASE_URL).origin : null;
  } catch {
    return null;
  }
}

function sourcePathname(src: string): string | null {
  try {
    if (/^https?:\/\//i.test(src)) return new URL(src).pathname;
    return new URL(src, 'https://kigalimarket.local').pathname;
  } catch {
    return null;
  }
}

function localUploadPath(src: string): string | null {
  const pathname = sourcePathname(src);
  if (!pathname?.startsWith('/uploads/') || !LOCAL_OPTIMIZABLE_EXT.test(pathname)) return null;

  const relative = decodeURIComponent(pathname.slice('/uploads/'.length));
  const filePath = path.resolve(UPLOAD_DIR, relative);
  if (!filePath.startsWith(`${UPLOAD_DIR}${path.sep}`)) return null;
  return filePath;
}

function allowedSupabaseImage(src: string): URL | null {
  const origin = supabaseOrigin();
  if (!origin || !/^https?:\/\//i.test(src)) return null;

  try {
    const url = new URL(src);
    const isConfiguredStorage = url.origin === origin;
    const isProductImage = url.pathname.startsWith('/storage/v1/object/public/product-images/');
    return isConfiguredStorage && isProductImage && LOCAL_OPTIMIZABLE_EXT.test(url.pathname) ? url : null;
  } catch {
    return null;
  }
}

async function sourceBuffer(src: string): Promise<Buffer | null> {
  const localPath = localUploadPath(src);
  if (localPath) return fs.readFile(localPath);

  const remote = allowedSupabaseImage(src);
  if (!remote) return null;

  const response = await fetch(remote, { signal: AbortSignal.timeout(8000) });
  if (!response.ok) return null;
  const type = response.headers.get('content-type') || '';
  if (!/^image\/(?:jpeg|png|webp)\b/i.test(type)) return null;
  return Buffer.from(await response.arrayBuffer());
}

imagesRouter.get('/optimized', async (req, res, next) => {
  try {
    const src = String(req.query.src || '');
    const width = clampNumber(req.query.w, MIN_WIDTH, MAX_WIDTH, DEFAULT_WIDTH);
    const quality = clampNumber(req.query.q, MIN_QUALITY, MAX_QUALITY, DEFAULT_QUALITY);
    if (!src) return res.status(400).json({ error: 'Image source is required.' });

    const input = await sourceBuffer(src);
    if (!input) return res.status(404).json({ error: 'Image source cannot be optimized.' });

    let pipeline = sharp(input, { animated: false })
      .rotate()
      .resize({ width, withoutEnlargement: true });

    // WebP keeps the payload small without the heavy AVIF encode delay that
    // made gallery next/previous clicks appear stuck on large real-estate photos.
    pipeline = pipeline.webp({ quality });
    res.type('image/webp');

    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.send(await pipeline.toBuffer());
  } catch (err) {
    next(err);
  }
});
