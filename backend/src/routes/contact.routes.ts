import { Router, Request, Response } from 'express';
import nodemailer from 'nodemailer';

const router = Router();

/**
 * In-memory rate limiter specifically for the contact endpoint.
 * Stricter than the global limiter: 5 submissions per 15 minutes per IP.
 */
interface ContactRateRecord {
  count: number;
  resetAt: number;
}
const contactRateCache = new Map<string, ContactRateRecord>();

const CONTACT_MAX_REQUESTS = 5;
const CONTACT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function contactRateLimiter(req: Request, res: Response): boolean {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const now = Date.now();

  if (!contactRateCache.has(ip)) {
    contactRateCache.set(ip, { count: 1, resetAt: now + CONTACT_WINDOW_MS });
    return true;
  }

  const record = contactRateCache.get(ip)!;

  if (now > record.resetAt) {
    record.count = 1;
    record.resetAt = now + CONTACT_WINDOW_MS;
    return true;
  }

  record.count++;
  if (record.count > CONTACT_MAX_REQUESTS) {
    res.status(429).json({
      error: 'Too many contact submissions. Please wait before trying again.',
    });
    return false;
  }

  return true;
}

// Garbage collection for contact rate limiter
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of contactRateCache.entries()) {
    if (now > record.resetAt) {
      contactRateCache.delete(ip);
    }
  }
}, 5 * 60 * 1000);

/**
 * Sanitize input string: trim, remove control characters, limit length.
 */
function sanitize(input: string, maxLength: number): string {
  return input
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .slice(0, maxLength);
}

/**
 * Validate email format.
 */
function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

/**
 * POST /api/contact
 * 
 * Receives contact form submissions, validates and sanitizes input,
 * then sends an email to the configured recipient.
 */
router.post('/', async (req: Request, res: Response) => {
  // Rate limiting check
  if (!contactRateLimiter(req, res)) return;

  try {
    const { name, email, subject, message } = req.body;

    // --- Validation ---
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    const sanitizedName = sanitize(String(name), 100);
    const sanitizedEmail = sanitize(String(email), 254);
    const sanitizedSubject = sanitize(String(subject), 200);
    const sanitizedMessage = sanitize(String(message), 5000);

    if (sanitizedName.length < 1) {
      return res.status(400).json({ error: 'Name is required.' });
    }

    if (!isValidEmail(sanitizedEmail)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    if (sanitizedSubject.length < 1) {
      return res.status(400).json({ error: 'Subject is required.' });
    }

    if (sanitizedMessage.length < 10) {
      return res.status(400).json({ error: 'Message must be at least 10 characters.' });
    }

    // --- Spam prevention: honeypot check ---
    if (req.body._honeypot) {
      // Silently accept but don't send (bot detected)
      return res.status(200).json({ success: true, message: 'Message sent successfully.' });
    }

    // --- Email Configuration ---
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const contactRecipient = process.env.CONTACT_EMAIL || 'nakulan07022007@gmail.com';

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.error('[Contact] SMTP not configured. Missing SMTP_HOST, SMTP_USER, or SMTP_PASS.');
      return res.status(503).json({ error: 'Email service is not configured. Please try again later.' });
    }

    // --- Create Transporter ---
    const transporter = nodemailer.createTransport({
      service: smtpHost === 'smtp.gmail.com' ? 'gmail' : undefined,
      host: smtpHost === 'smtp.gmail.com' ? undefined : smtpHost,
      port: smtpHost === 'smtp.gmail.com' ? undefined : smtpPort,
      secure: smtpHost === 'smtp.gmail.com' ? undefined : smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // Verify SMTP connection
    try {
      await transporter.verify();
    } catch (verifyErr: any) {
      console.error('[Contact] SMTP verification failed:', verifyErr.message, verifyErr.code);
      return res.status(503).json({ error: 'Email service authentication failed. Please contact the administrator.' });
    }

    // --- Compose Email ---
    const timestamp = new Date().toISOString();

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #D4AF37; border-bottom: 1px solid #333; padding-bottom: 12px;">
          New Contact Form Submission — Sphynx
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #888; width: 120px;">Name</td>
            <td style="padding: 8px 12px; color: #fff;">${sanitizedName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #888;">Email</td>
            <td style="padding: 8px 12px; color: #fff;">${sanitizedEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #888;">Subject</td>
            <td style="padding: 8px 12px; color: #fff;">${sanitizedSubject}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; font-weight: bold; color: #888;">Timestamp</td>
            <td style="padding: 8px 12px; color: #fff;">${timestamp}</td>
          </tr>
        </table>
        <div style="margin-top: 20px; padding: 16px; background: #111; border-radius: 8px; border: 1px solid #333;">
          <p style="color: #888; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Message</p>
          <p style="color: #eee; white-space: pre-wrap; margin: 0; line-height: 1.6;">${sanitizedMessage}</p>
        </div>
        <p style="margin-top: 20px; font-size: 11px; color: #666;">
          Sent via Sphynx Contact Form • ${timestamp}
        </p>
      </div>
    `;

    const emailText = `
New Contact Form Submission — Sphynx
=====================================
Name: ${sanitizedName}
Email: ${sanitizedEmail}
Subject: ${sanitizedSubject}
Timestamp: ${timestamp}

Message:
${sanitizedMessage}

---
Sent via Sphynx Contact Form
    `.trim();

    // --- Send Email ---
    await transporter.sendMail({
      from: `"Sphynx Contact" <${smtpUser}>`,
      to: contactRecipient,
      replyTo: sanitizedEmail,
      subject: `[Sphynx Contact] ${sanitizedSubject}`,
      text: emailText,
      html: emailHtml,
    });

    console.log(`[Contact] Email sent successfully from ${sanitizedEmail} — Subject: ${sanitizedSubject}`);

    return res.status(200).json({
      success: true,
      message: 'Message sent successfully.',
    });
  } catch (error: any) {
    console.error('[Contact] Failed to send email:', error.message, error.code, error.response);
    return res.status(500).json({
      error: 'Failed to send message. Please try again later.',
    });
  }
});

export default router;
