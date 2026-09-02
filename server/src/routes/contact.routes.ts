import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../config/db.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { rateLimit } from '../middleware/rateLimit.js';
import { notifyAdminsWithModulePermission } from '../utils/notify.js';
import { logAudit } from '../utils/audit.js';
import { sendMail } from '../utils/email.js';
import { env } from '../config/env.js';

export const contactRouter = Router();

const STATUSES = ['NEW', 'READ', 'ARCHIVED'] as const;

function serialize(m: {
  id: string; name: string; email: string; phone: string | null;
  subject: string | null; message: string; status: string; createdAt: Date;
}) {
  return {
    id: m.id,
    name: m.name,
    email: m.email,
    phone: m.phone || null,
    subject: m.subject || null,
    message: m.message,
    status: m.status,
    createdAt: m.createdAt,
  };
}

const contactSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(150),
  phone: z.string().trim().min(6).max(40).optional().or(z.literal('')),
  subject: z.string().trim().max(160).optional().or(z.literal('')),
  message: z.string().trim().min(2).max(2000),
});

// Public. Rate-limited per IP so the form can't be used to flood the admin
// notification feed or the inbox. Matches the generous ceilings on the auth
// limiters (auth.routes.ts) - enough headroom for a real person, a hard stop
// on a script.
const contactLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 20,
  key: (req) => `contact:${req.ip}`,
});

contactRouter.post('/', contactLimiter, async (req, res) => {
  const parsed = contactSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: 'Please enter your name, a valid email address and a message.',
      details: parsed.error.flatten(),
    });
  }

  const data = parsed.data;
  const phone = data.phone ? data.phone : null;
  const subject = data.subject ? data.subject : null;

  const saved = await prisma.contactMessage.create({
    data: {
      name: data.name,
      email: data.email,
      phone,
      subject,
      message: data.message,
      ipAddress: req.ip,
    },
  });

  const heading = subject ? `"${subject}"` : 'a message';
  await notifyAdminsWithModulePermission('REPORTS', {
    type: 'CONTACT_MESSAGE',
    message: `${data.name} (${data.email}) sent ${heading} via the contact form.`,
  });

  // Best-effort; the message is already stored and the admins already notified.
  await sendMail({
    to: env.CONTACT_EMAIL,
    replyTo: data.email,
    subject: `Contact form: ${subject || `message from ${data.name}`}`,
    text: [
      `Name:    ${data.name}`,
      `Email:   ${data.email}`,
      phone ? `Phone:   ${phone}` : null,
      subject ? `Subject: ${subject}` : null,
      '',
      data.message,
    ].filter((line) => line !== null).join('\n'),
  });

  await logAudit({
    actorId: 'public-contact-form',
    actorType: 'SYSTEM',
    actorName: data.name,
    action: 'CONTACT_MESSAGE_SUBMITTED',
    module: 'Contact Messages',
    targetId: saved.id,
    details: { name: data.name, email: data.email, subject },
  });

  res.status(201).json({ success: true, message: 'Thanks - your message has been received.' });
});

// Admin: the Contact Messages panel. Gated on REPORTS (a full Administrator
// always passes; a Sub-Administrator needs the "Reports" permission).
contactRouter.get('/', requireAuth, requirePermission('REPORTS'), async (_req, res) => {
  const messages = await prisma.contactMessage.findMany({ orderBy: { createdAt: 'desc' } });
  res.json({ messages: messages.map(serialize) });
});

const statusSchema = z.object({ status: z.enum(STATUSES) });

contactRouter.patch('/:id', requireAuth, requirePermission('REPORTS'), async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: `Status must be one of: ${STATUSES.join(', ')}.` });
  }

  const existing = await prisma.contactMessage.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Message not found.' });

  const updated = await prisma.contactMessage.update({
    where: { id: existing.id },
    data: { status: parsed.data.status },
  });

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'CONTACT_MESSAGE_STATUS_CHANGED',
    module: 'Contact Messages',
    targetId: existing.id,
    details: `Marked contact message from ${existing.name} as ${parsed.data.status}.`,
  });

  res.json({ message: serialize(updated) });
});

// Direct delete (no approval workflow) - like a banner, this is support
// correspondence, not structural data with things hanging off it.
contactRouter.delete('/:id', requireAuth, requirePermission('REPORTS'), async (req, res) => {
  const existing = await prisma.contactMessage.findUnique({ where: { id: req.params.id } });
  if (!existing) return res.status(404).json({ error: 'Message not found or already deleted.' });

  await prisma.contactMessage.delete({ where: { id: existing.id } });

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'CONTACT_MESSAGE_DELETED',
    module: 'Contact Messages',
    targetId: existing.id,
    details: `Deleted contact message from ${existing.name} (${existing.email}).`,
  });

  res.json({ success: true });
});
