/**
 * Product listing lifecycle: every listing carries an expiresAt set to
 * (postedDate + 6 months) at creation (see products.routes.ts POST /).
 * This sweep is what actually enforces that:
 *  1. A reminder is sent to the seller during the FINAL WEEK before
 *     expiresAt, once per cycle, asking them to confirm the item is still
 *     in stock.
 *  2. "Confirming it's still in stock" IS the existing seller-facing
 *     POST /:id/renew action (SellerPortal.js already has a "🔄 Renew (6
 *     Months)" button on expiring/expired listings) - it pushes expiresAt
 *     forward another 6 months and resets the reminder flag, so a renewed
 *     listing is naturally excluded from both the reminder and deletion
 *     passes below.
 *  3. A listing that reaches expiresAt with no renewal is hard-deleted -
 *     this is a real product-lifecycle rule, not just a display filter, so
 *     it runs as a periodic sweep independent of anyone viewing the page.
 */
import { prisma } from '../config/db.js';
import { notifySeller } from './notify.js';

const DAY_MS = 1000 * 60 * 60 * 24;
const REMINDER_WINDOW_MS = 7 * DAY_MS;

export async function runProductExpirySweep() {
  const now = new Date();
  const reminderThreshold = new Date(now.getTime() + REMINDER_WINDOW_MS);

  // 1. Last-week reminder - only listings that are still active, due to
  //    expire within 7 days, and haven't already been reminded this cycle.
  const dueForReminder = await prisma.product.findMany({
    where: {
      status: 'ACTIVE',
      expiresAt: { lte: reminderThreshold, gt: now },
      expiryReminderSentAt: null,
    },
  });

  for (const product of dueForReminder) {
    await notifySeller({
      sellerId: product.sellerId,
      type: 'EXPIRY_WARNING',
      message: `Your listing "${product.title}" will be removed on ${product.expiresAt!.toLocaleDateString()} unless you confirm it's still in stock. Renew it from your Seller Dashboard's "Expiring Soon" tab to keep it live for another 6 months.`,
    });
    await prisma.product.update({
      where: { id: product.id },
      data: { expiryReminderSentAt: now },
    });
  }

  // 2. Hard-delete listings that reached the end of their 6-month cycle
  //    with no renewal - no grace period beyond expiresAt itself, since the
  //    full last-week reminder already gave the seller a chance to act.
  const expired = await prisma.product.findMany({
    where: { expiresAt: { lte: now } },
  });

  let deletedCount = 0;
  for (const product of expired) {
    try {
      await prisma.product.delete({ where: { id: product.id } });
      deletedCount++;
      await notifySeller({
        sellerId: product.sellerId,
        type: 'LISTING_EXPIRED',
        message: `Your listing "${product.title}" was automatically removed after 6 months with no confirmation that it was still in stock.`,
      });
    } catch {
      // Already removed by something else between the findMany and here - skip.
    }
  }

  return { remindersSent: dueForReminder.length, deleted: deletedCount };
}
