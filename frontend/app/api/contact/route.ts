import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

/**
 * In-memory rate limiter for contact form submissions.
 * 5 submissions per 15 minutes per IP.
 */
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const MAX_REQUESTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }

  record.count++;
  return record.count > MAX_REQUESTS;
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetAt) rateLimitMap.delete(ip);
  }
}, 5 * 60 * 1000);

function sanitize(input: string, maxLength: number): string {
  return input.trim().replace(/[\x00-\x1F\x7F]/g, '').slice(0, maxLength);
}

function isValidEmail(email: string): boolean {
  if (email.length > 254) return false;
  if (/\.\./.test(email)) return false;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return false;
  const tld = email.split('.').pop();
  if (!tld || tld.length < 2) return false;
  return true;
}

export async function POST(request: NextRequest) {
  // Rate limiting
  const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
  if (isRateLimited(ip)) {
    return NextResponse.json(
      { error: 'Too many contact submissions. Please wait before trying again.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const { name, email, subject, message, _honeypot } = body;

    // Honeypot spam check
    if (_honeypot) {
      return NextResponse.json({ success: true, message: 'Message sent successfully.' });
    }

    // Validation
    if (!name || !email || !subject || !message) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 });
    }

    const sanitizedName = sanitize(String(name), 100);
    const sanitizedEmail = sanitize(String(email), 254).toLowerCase();
    const sanitizedSubject = sanitize(String(subject), 150);
    const sanitizedMessage = sanitize(String(message), 1000);

    if (sanitizedName.length < 2) {
      return NextResponse.json({ error: 'Name must be at least 2 characters.' }, { status: 400 });
    }
    if (!/^[a-zA-Z\s\-]+$/.test(sanitizedName)) {
      return NextResponse.json({ error: 'Name can only contain letters, spaces, and hyphens.' }, { status: 400 });
    }
    if (!isValidEmail(sanitizedEmail)) {
      return NextResponse.json({ error: 'Please enter a valid email address.' }, { status: 400 });
    }
    if (sanitizedSubject.length < 5) {
      return NextResponse.json({ error: 'Subject must be at least 5 characters.' }, { status: 400 });
    }
    if (sanitizedMessage.length < 10) {
      return NextResponse.json({ error: 'Message must be at least 10 characters.' }, { status: 400 });
    }

    // SMTP config
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const contactEmail = process.env.CONTACT_EMAIL || 'nakulan07022007@gmail.com';

    if (!smtpUser || !smtpPass) {
      console.error('[Contact] SMTP credentials not configured');
      return NextResponse.json({ error: 'Email service is not configured.' }, { status: 503 });
    }

    // Create transporter using Gmail service
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const timestamp = new Date().toISOString();

    const emailHtml = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #D4AF37; border-bottom: 1px solid #333; padding-bottom: 12px;">
          New Contact Form Submission — Sphynx
        </h2>
        <table style="width: 100%; border-collapse: collapse; margin-top: 16px;">
          <tr><td style="padding: 8px 12px; font-weight: bold; color: #888; width: 120px;">Name</td><td style="padding: 8px 12px;">${sanitizedName}</td></tr>
          <tr><td style="padding: 8px 12px; font-weight: bold; color: #888;">Email</td><td style="padding: 8px 12px;">${sanitizedEmail}</td></tr>
          <tr><td style="padding: 8px 12px; font-weight: bold; color: #888;">Subject</td><td style="padding: 8px 12px;">${sanitizedSubject}</td></tr>
          <tr><td style="padding: 8px 12px; font-weight: bold; color: #888;">Timestamp</td><td style="padding: 8px 12px;">${timestamp}</td></tr>
        </table>
        <div style="margin-top: 20px; padding: 16px; background: #f5f5f5; border-radius: 8px;">
          <p style="color: #888; font-size: 12px; margin: 0 0 8px 0; text-transform: uppercase; letter-spacing: 1px;">Message</p>
          <p style="color: #333; white-space: pre-wrap; margin: 0; line-height: 1.6;">${sanitizedMessage}</p>
        </div>
        <p style="margin-top: 20px; font-size: 11px; color: #999;">Sent via Sphynx Contact Form • ${timestamp}</p>
      </div>
    `;

    const emailText = `New Contact — Sphynx\nName: ${sanitizedName}\nEmail: ${sanitizedEmail}\nSubject: ${sanitizedSubject}\nTimestamp: ${timestamp}\n\nMessage:\n${sanitizedMessage}`;

    await transporter.sendMail({
      from: `"Sphynx Contact" <${smtpUser}>`,
      to: contactEmail,
      replyTo: sanitizedEmail,
      subject: `[Sphynx Contact] ${sanitizedSubject}`,
      text: emailText,
      html: emailHtml,
    });

    console.log(`[Contact] Email sent from ${sanitizedEmail} — ${sanitizedSubject}`);
    return NextResponse.json({ success: true, message: 'Message sent successfully.' });

  } catch (error: any) {
    console.error('[Contact] Error:', error.message, error.code);
    return NextResponse.json({ error: 'Failed to send message. Please try again later.' }, { status: 500 });
  }
}
