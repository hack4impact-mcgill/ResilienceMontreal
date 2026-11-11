import { createHash, timingSafeEqual } from "node:crypto";
import { Resend } from "resend";
import { z } from "zod";
import { env } from "~/env";
import { parseGrantMeta } from "~/lib/grant-meta";
import { db } from "~/server/db";

const grantEmailSchema = z.email();

function isAuthorized(authorization: string | null, secret: string): boolean {
  const expected = Buffer.from(`Bearer ${secret}`);
  const actual = Buffer.from(authorization ?? "");
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatExpiryDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function GET(request: Request) {
  if (!env.CRON_SECRET) {
    return Response.json(
      { error: "Grant reminder cron is not configured" },
      { status: 503 },
    );
  }

  if (!isAuthorized(request.headers.get("authorization"), env.CRON_SECRET)) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!env.RESEND_API_KEY || !env.RESEND_FROM_EMAIL) {
    return Response.json(
      { error: "Grant reminder email is not configured" },
      { status: 503 },
    );
  }

  const now = new Date();
  const targetDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 7),
  );
  const followingDate = new Date(targetDate);
  followingDate.setUTCDate(followingDate.getUTCDate() + 1);
  const grants = await db.grant.findMany({
    where: {
      status: "APPROVED",
      endDate: { gte: targetDate, lt: followingDate },
      expiryReminderSentAt: null,
    },
    select: {
      id: true,
      title: true,
      endDate: true,
      description: true,
    },
  });

  const resend = new Resend(env.RESEND_API_KEY);
  let sent = 0;
  let skipped = 0;
  const failures: number[] = [];

  for (const grant of grants) {
    const email = parseGrantMeta(grant.description).email;
    const parsedEmail = grantEmailSchema.safeParse(email);
    if (!grant.endDate || !parsedEmail.success) {
      skipped += 1;
      continue;
    }

    const expiryDate = formatExpiryDate(grant.endDate);
    const organization = escapeHtml(grant.title);
    const { data, error } = await resend.emails.send(
      {
        from: env.RESEND_FROM_EMAIL,
        to: parsedEmail.data,
        subject: `Grant expiry reminder / Rappel d’expiration de subvention: ${grant.title}`,
        text: [
          `This is a reminder that the grant for ${grant.title} expires on ${expiryDate}.`,
          `Veuillez noter que la subvention pour ${grant.title} expire le ${expiryDate}.`,
        ].join("\n\n"),
        html: [
          `<p>This is a reminder that the grant for <strong>${organization}</strong> expires on <strong>${expiryDate}</strong>.</p>`,
          `<p>Veuillez noter que la subvention pour <strong>${organization}</strong> expire le <strong>${expiryDate}</strong>.</p>`,
        ].join(""),
      },
      {
        idempotencyKey: `grant-expiry-${grant.id}-${expiryDate}-${createHash("sha256").update(parsedEmail.data).digest("hex")}`,
      },
    );

    if (error || !data) {
      console.error("Failed to send grant expiry reminder", {
        grantId: grant.id,
        error,
      });
      failures.push(grant.id);
      continue;
    }

    const marked = await db.grant.updateMany({
      where: {
        id: grant.id,
        endDate: grant.endDate,
        description: grant.description,
        expiryReminderSentAt: null,
      },
      data: { expiryReminderSentAt: new Date() },
    });
    if (marked.count === 1) sent += 1;
    else skipped += 1;
  }

  return Response.json(
    { sent, skipped, failed: failures.length },
    { status: failures.length ? 500 : 200 },
  );
}
