import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { requireAuth } from '../middleware/auth.js';
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

function randomFilename(originalname: string): string {
  const ext = path.extname(originalname).toLowerCase() || '.jpg';
  return `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
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

uploadsRouter.post('/', requireAuth, (req, res) => {
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

    const filename = randomFilename(req.file.originalname);

    try {
      if (supabase) {
        await ensureBucketReady();
        const { error } = await supabase.storage
          .from(BUCKET)
          .upload(filename, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
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
