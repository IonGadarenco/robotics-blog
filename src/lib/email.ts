// src/lib/email.ts
// Wrapper Resend pentru trimiterea email-urilor.
// Dacă RESEND_API_KEY lipsește sau trimiterea eșuează, NU aruncăm eroare —
// fallback la console.log, care permite continuarea flow-ului în development.

import { Resend } from 'resend';

const apiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.EMAIL_FROM || 'RoboLab <onboarding@resend.dev>';

// Inițializăm Resend o singură dată; dacă nu e key, lăsăm null și fallback.
const resend = apiKey ? new Resend(apiKey) : null;

interface EmailParams {
  to: string;
  subject: string;
  html: string;
  text: string; // versiune text-only pentru clienți care nu interpretează HTML
}

export async function sendEmail(params: EmailParams): Promise<{ sent: boolean; error?: string }> {
  if (!resend) {
    console.log('[EMAIL] RESEND_API_KEY lipsește — fallback la consolă.');
    console.log('To:     ', params.to);
    console.log('Subject:', params.subject);
    console.log('Body:   ', params.text);
    return { sent: false, error: 'no_api_key' };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromAddress,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      text: params.text,
    });

    if (error) {
      // Resend returnează eroare structurată — o logăm dar nu o aruncăm.
      console.error('[EMAIL] Resend error:', error);
      return { sent: false, error: error.message || 'send_failed' };
    }

    console.log(`[EMAIL] Trimis cu succes către ${params.to}, id=${data?.id}`);
    return { sent: true };
  } catch (err: any) {
    console.error('[EMAIL] Excepție la trimitere:', err);
    return { sent: false, error: err?.message || 'exception' };
  }
}

// Template HTML simplu pentru email-ul de reset parolă.
// Stil inline (necesar — clienții de email nu suportă <style>/<link>).
export function buildResetPasswordEmail(resetUrl: string): { html: string; text: string } {
  const text = [
    'Ai cerut resetarea parolei pe RoboLab.',
    '',
    'Folosește link-ul de mai jos pentru a seta o parolă nouă:',
    resetUrl,
    '',
    'Link-ul e valabil 1 oră și poate fi folosit o singură dată.',
    'Dacă nu tu ai cerut resetarea, ignoră acest email — contul rămâne neschimbat.',
    '',
    '— Echipa RoboLab',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="ro">
<body style="margin:0;padding:0;background:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#e5e5e5">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;padding:32px 16px">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#171717;border:1px solid #262626">
        <tr><td style="padding:32px">
          <div style="font-family:monospace;font-size:12px;color:#06b6d4;margin-bottom:8px">// RESET_PAROLĂ</div>
          <h1 style="margin:0 0 24px 0;font-size:28px;color:#f5f5f5">Resetare parolă</h1>
          <p style="font-size:16px;line-height:1.5;color:#a3a3a3;margin:0 0 24px 0">
            Ai cerut resetarea parolei pentru contul tău <strong style="color:#ff8c42">RoboLab</strong>.
            Apasă pe butonul de mai jos pentru a seta o parolă nouă.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:24px 0">
            <tr><td style="background:#ff6b1a;padding:0">
              <a href="${resetUrl}" style="display:inline-block;padding:14px 28px;color:#0a0a0a;text-decoration:none;font-family:monospace;font-weight:bold;text-transform:uppercase;letter-spacing:1px;font-size:14px">
                Setează parolă nouă
              </a>
            </td></tr>
          </table>
          <p style="font-size:13px;color:#737373;margin:24px 0 0 0;line-height:1.5">
            Sau copiază link-ul în browser:<br>
            <span style="font-family:monospace;font-size:12px;color:#22d3ee;word-break:break-all">${resetUrl}</span>
          </p>
          <hr style="border:none;border-top:1px solid #262626;margin:32px 0">
          <p style="font-size:12px;color:#525252;line-height:1.5;margin:0">
            Link-ul e valabil <strong>1 oră</strong> și poate fi folosit o singură dată.<br>
            Dacă nu tu ai cerut resetarea, ignoră acest email — contul tău rămâne neschimbat.
          </p>
        </td></tr>
      </table>
      <p style="margin:16px 0;font-size:11px;color:#404040;font-family:monospace">
        RoboLab — Platformă educațională robotică
      </p>
    </td></tr>
  </table>
</body>
</html>`;

  return { html, text };
}
