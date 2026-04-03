import nodemailer from "nodemailer";

let cached: nodemailer.Transporter | null = null;

export function getMailTransport(): nodemailer.Transporter {
  if (cached) return cached;
  cached = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "127.0.0.1",
    port: Number(process.env.SMTP_PORT ?? 1025),
    secure: false,
  });
  return cached;
}

export async function sendInviteEmail(params: {
  to: string;
  token: string;
  organizationName: string;
}): Promise<void> {
  const appUrl = process.env.APP_PUBLIC_URL ?? "http://localhost:5173";
  const link = `${appUrl}/accept-invite?token=${encodeURIComponent(params.token)}`;
  await getMailTransport().sendMail({
    from: process.env.SMTP_FROM ?? "Rescue Router <noreply@localhost>",
    to: params.to,
    subject: `Invitation to ${params.organizationName} on Rescue Router`,
    text: `You've been invited to join ${params.organizationName}.\n\nAccept: ${link}\n`,
    html: `<p>You've been invited to join <strong>${escapeHtml(params.organizationName)}</strong>.</p><p><a href="${escapeHtml(link)}">Accept invitation</a></p>`,
  });
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
