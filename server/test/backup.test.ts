import { describe, it, expect } from 'vitest';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import path from 'path';
import { app } from '../src/app.js';
import { prisma } from '../src/config/db.js';
import { signToken, type AuthUser } from '../src/middleware/auth.js';

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe('POST /api/audit-logs/backup', () => {
  it('creates a real snapshot file and returns metadata only', async () => {
    const passwordHash = await bcrypt.hash('pw', 10);
    const admin = await prisma.administrator.create({
      data: { email: `backup-admin-${Date.now()}@test.local`, passwordHash, name: 'Backup Admin' },
    });
    const token = signToken({ id: admin.id, email: admin.email, name: admin.name, role: 'ADMINISTRATOR' } as AuthUser);

    const res = await request(app).post('/api/audit-logs/backup').set(auth(token)).send({});

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.fileName).toMatch(/^kigalimarket-backup-.*\.json$/);
    expect(res.body).not.toHaveProperty('tables');

    const filePath = path.resolve('server', 'backups', res.body.fileName);
    const raw = await fs.readFile(filePath, 'utf8');
    const parsed = JSON.parse(raw);
    expect(parsed.format).toBe('kigalimarket-prisma-json-v1');
    expect(parsed.tables.administrators.length).toBeGreaterThan(0);

    await fs.unlink(filePath).catch(() => {});
  });
});
