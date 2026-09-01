import nodemailer from "nodemailer";
import { env } from "./env.js";

const isConfigured = Boolean(env.smtpHost && env.smtpUser && env.smtpPass);

// SMTP ayarlanmamışsa (yerel geliştirmede yaygın) gerçek gönderim yapılmaz —
// çağıran taraf bunu kontrol edip bağlantıyı API yanıtında döndürmeye devam
// edebilir (auth.ts'deki mevcut "test modu" davranışı). Ayarlandığında ise
// gerçek bir e-posta gider ve bağlantı yanıtta hiç yer almaz.
const transporter = isConfigured
  ? nodemailer.createTransport({
      host: env.smtpHost!,
      port: env.smtpPort,
      secure: env.smtpPort === 465,
      auth: { user: env.smtpUser!, pass: env.smtpPass! },
    })
  : null;

export function isMailerConfigured() {
  return isConfigured;
}

function wrapEmail(title: string, bodyHtml: string) {
  return `
    <div style="background:#221430;padding:32px 16px;font-family:Arial,Helvetica,sans-serif;">
      <div style="max-width:480px;margin:0 auto;background:#f5e6c8;border-radius:12px;overflow:hidden;">
        <div style="background:#4a2f52;height:8px;"></div>
        <div style="padding:32px 28px;color:#241522;">
          <div style="font-size:12px;letter-spacing:2px;color:#6b5865;text-transform:uppercase;margin-bottom:8px;">
            Dizi Senkron
          </div>
          <h1 style="font-size:22px;margin:0 0 16px;color:#241522;">${title}</h1>
          ${bodyHtml}
        </div>
        <div style="background:#4a2f52;height:8px;"></div>
      </div>
    </div>
  `;
}

function button(href: string, label: string) {
  return `
    <a href="${href}" style="display:inline-block;margin-top:20px;padding:12px 24px;background:#241522;color:#f5e6c8;text-decoration:none;border-radius:8px;font-weight:600;">
      ${label}
    </a>
  `;
}

async function sendMail(to: string, subject: string, html: string) {
  if (!transporter) return;
  await transporter.sendMail({ from: env.mailFrom ?? env.smtpUser!, to, subject, html });
}

export async function sendVerificationEmail(to: string, displayName: string, verifyPath: string) {
  const link = `${env.frontendUrl}${verifyPath}`;
  const html = wrapEmail(
    "E-postanı doğrula",
    `<p style="font-size:15px;line-height:1.6;">Merhaba ${displayName}, Dizi Senkron'a hoş geldin. Hesabını aktifleştirmek için aşağıdaki bağlantıya tıkla. Bağlantı 24 saat içinde geçerliliğini yitirir.</p>${button(
      link,
      "E-postamı doğrula →",
    )}<p style="font-size:12px;color:#6b5865;margin-top:24px;">Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin.</p>`,
  );
  await sendMail(to, "Dizi Senkron — e-postanı doğrula", html);
}

export async function sendEmailChangeConfirmation(
  to: string,
  displayName: string,
  confirmPath: string,
) {
  const link = `${env.frontendUrl}${confirmPath}`;
  const html = wrapEmail(
    "E-posta değişikliğini onayla",
    `<p style="font-size:15px;line-height:1.6;">Merhaba ${displayName}, hesabının e-posta adresini bu adresle değiştirmek istedin. Onaylamak için aşağıdaki bağlantıya tıkla. Bağlantı 24 saat içinde geçerliliğini yitirir.</p>${button(
      link,
      "E-postamı değiştir →",
    )}<p style="font-size:12px;color:#6b5865;margin-top:24px;">Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin, hesabında bir değişiklik olmayacak.</p>`,
  );
  await sendMail(to, "Dizi Senkron — e-posta değişikliğini onayla", html);
}

export async function sendPasswordResetEmail(to: string, displayName: string, resetPath: string) {
  const link = `${env.frontendUrl}${resetPath}`;
  const html = wrapEmail(
    "Şifreni sıfırla",
    `<p style="font-size:15px;line-height:1.6;">Merhaba ${displayName}, şifreni sıfırlamak için aşağıdaki bağlantıya tıkla. Bağlantı 1 saat içinde geçerliliğini yitirir.</p>${button(
      link,
      "Şifremi sıfırla →",
    )}<p style="font-size:12px;color:#6b5865;margin-top:24px;">Bu isteği sen yapmadıysan bu e-postayı yok sayabilirsin, hesabında bir değişiklik olmayacak.</p>`,
  );
  await sendMail(to, "Dizi Senkron — şifre sıfırlama", html);
}
