import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { requireAuth, hasModulePermission, type AuthUser } from '../middleware/auth.js';
import { env } from '../config/env.js';

export const uploadsRouter = Router();

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const BUCKET = 'product-images';

// Supabase Storage when configured (SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
// set - see server/src/config/env.ts) - required for any host with an
// ephemeral/ non-shared filesystem (Railway, Render, most PaaS). Falls back
// to local disk (the original behavior) when those aren't set, so a fresh
// local checkout with no Supabase keys still works without extra setup.
const supabase =
  env.SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY
    ? createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
    : null;

let bucketReadyPromise: Promise<void> | null = null;
function ensureBucketReady(): Promise<void> {
  if (!supabase) return Promise.resolve();
  if (!bucketReadyPromise) {
    bucketReadyPromise = (async () => {
      const { data: buckets } = await supabase!.storage.listBuckets();
      const exists = buckets?.some((b) => b.name === BUCKET);
      if (!exists) {
        const { error } = await supabase!.storage.createBucket(BUCKET, {
          public: true,
          fileSizeLimit: 5 * 1024 * 1024,
        });
        // A race between concurrent requests creating the bucket at the same
        // time is fine to ignore - whoever lost the race just uses the one
        // that won.
        if (error && !/already exists/i.test(error.message)) throw error;
      }
    })();
  }
  return bucketReadyPromise;
}

function randomFilename(ext: string): string {
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
}

function detectImage(buffer: Buffer): { mime: string; ext: string } | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { mime: 'image/jpeg', ext: '.jpg' };
  }
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return { mime: 'image/png', ext: '.png' };
  }
  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { mime: 'image/webp', ext: '.webp' };
  }
  if (buffer.length >= 6) {
    const sig = buffer.subarray(0, 6).toString('ascii');
    if (sig === 'GIF87a' || sig === 'GIF89a') return { mime: 'image/gif', ext: '.gif' };
  }
  return null;
}

async function canUpload(user: AuthUser) {
  if (user.role === 'SELLER' || user.role === 'ADMINISTRATOR') return true;
  if (user.role !== 'SUB_ADMINISTRATOR') return false;
  return (await hasModulePermission(user, 'PRODUCTS')) ||
    (await hasModulePermission(user, 'ADVERTISEMENTS')) ||
    (await hasModulePermission(user, 'REAL_ESTATE_CONTENT'));
}

// Local disk fallback (original implementation) - gitignored, runtime user
// content, not source.
const UPLOAD_DIR = path.resolve('server', 'uploads');
function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const upload = multer({
  // Memory storage regardless of backend - Supabase Storage needs the file
  // as a buffer to upload, and for the local-disk fallback path it's cheap
  // enough at 5MB max to just write the buffer out directly rather than
  // maintaining two different multer storage engines.
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      cb(new Error('Only JPEG, PNG, WEBP, or GIF images are allowed.'));
      return;
    }
    cb(null, true);
  },
});

uploadsRouter.post('/', requireAuth, async (req, res) => {
  if (!(await canUpload(req.user!))) {
    return res.status(403).json({ error: 'You do not have permission to upload images.' });
  }

  upload.single('image')(req, res, async (err) => {
    if (err) {
      const message =
        err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE'
          ? 'Image is too large - max size is 5MB.'
          : err.message || 'Upload failed.';
      return res.status(400).json({ error: message });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'No image file was received.' });
    }

    const detected = detectImage(req.file.buffer);
    if (!detected || detected.mime !== req.file.mimetype) {
      return res.status(400).json({ error: 'The uploaded file does not match a supported image format.' });
    }

    const filename = randomFilename(detected.ext);

    try {
      if (supabase) {
        await ensureBucketReady();
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(filename, req.file.buffer, { contentType: detected.mime, upsert: false });
        if (error) throw error;
        const { data } = supabase.storage.from(BUCKET).getPublicUrl(filename);
        return res.status(201).json({ url: data.publicUrl });
      }

      ensureUploadDir();
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), req.file.buffer);
      return res.status(201).json({ url: `/uploads/${filename}` });
    } catch (uploadErr: any) {
      console.error('[Image upload failed]', uploadErr);
      return res.status(502).json({ error: 'Could not store the uploaded image. Please try again.' });
    }
  });
});
