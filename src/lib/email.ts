// src/lib/email.ts
// Gmail SMTP email sender for OTP and notifications

import nodemailer from 'nodemailer';

// Create reusable transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

// Verify transporter on startup (dev only)
if (process.env.NODE_ENV !== 'production') {
  transporter.verify((error) => {
    if (error) {
      console.error('❌ Gmail SMTP config error:', error.message);
    } else {
      console.log('✅ Gmail SMTP ready');
    }
  });
}

// ═══════════════════════════════════════════════════════════
// Send OTP email
// ═══════════════════════════════════════════════════════════
export async function sendOtpEmail(email: string, code: string) {
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f5; margin: 0; padding: 40px 20px; }
        .container { max-width: 480px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .header { background: #0a0a0a; color: white; padding: 32px; text-align: center; }
        .logo { font-size: 11px; letter-spacing: 2px; font-weight: 700; color: #888; margin-bottom: 8px; }
        .brand { font-size: 20px; font-weight: 800; }
        .content { padding: 40px 32px; }
        .greeting { font-size: 16px; color: #333; margin-bottom: 8px; }
        .subtitle { font-size: 14px; color: #666; margin-bottom: 32px; }
        .code-box { background: #f8f8f8; border: 2px dashed #e0e0e0; border-radius: 10px; padding: 24px; text-align: center; margin: 24px 0; }
        .code { font-size: 36px; font-weight: 800; letter-spacing: 12px; color: #0a0a0a; font-family: 'Courier New', monospace; }
        .expires { font-size: 12px; color: #888; margin-top: 12px; }
        .note { font-size: 13px; color: #666; line-height: 1.6; margin-top: 24px; padding-top: 24px; border-top: 1px solid #f0f0f0; }
        .footer { background: #fafafa; padding: 20px; text-align: center; font-size: 11px; color: #999; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">COMMAND CENTER</div>
          <div class="brand">Dart Marketing</div>
        </div>
        <div class="content">
          <div class="greeting">Your login code</div>
          <div class="subtitle">Use this code to sign in to your account.</div>
          
          <div class="code-box">
            <div class="code">${code}</div>
            <div class="expires">Expires in 10 minutes</div>
          </div>

          <div class="note">
            <strong>⚠️ Security Notice:</strong><br>
            If you didn't request this code, you can safely ignore this email. 
            Someone may have typed your email by mistake. Your account remains secure.
          </div>
        </div>
        <div class="footer">
          Dart Marketing © 2026 · command.dartmarketing.io
        </div>
      </div>
    </body>
    </html>
  `;

  const text = `
Dart Command Center — Login Code

Your code: ${code}

This code expires in 10 minutes.

If you didn't request this, you can safely ignore this email.
  `.trim();

  try {
    const info = await transporter.sendMail({
      from: `"Dart Command Center" <${process.env.GMAIL_USER}>`,
      to: email,
      subject: `${code} is your Dart login code`,
      text,
      html,
    });

    console.log('✅ OTP email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error: any) {
    console.error('❌ Failed to send OTP email:', error.message);
    throw new Error('Failed to send email. Please try again.');
  }
}

// ═══════════════════════════════════════════════════════════
// Generate a random 6-digit OTP
// ═══════════════════════════════════════════════════════════
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}