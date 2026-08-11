import { prisma } from '../config/db.js';

// recipientId: null broadcasts to every Administrator/Sub-Administrator (there's
// no per-recipient read-receipt table, so marking a broadcast notification read
// marks it read for everyone - an accepted limitation of this schema, not a bug).
export async function notifyAdmins(opts: { type: string; message: string; recipientId?: string | null }) {
  await prisma.notification.create({
    data: {
      recipientType: 'ADMIN',
      recipientId: opts.recipientId ?? null,
      type: opts.type,
      message: opts.message,
    },
  });
}

// Always targeted at one specific seller - unlike notifyAdmins there's no
// broadcast case here, a seller should only ever see warnings about their
// own listings.
export async function notifySeller(opts: { sellerId: string; type: string; message: string }) {
  await prisma.notification.create({
    data: {
      recipientType: 'SELLER',
      recipientId: opts.sellerId,
      type: opts.type,
      message: opts.message,
    },
  });
}
