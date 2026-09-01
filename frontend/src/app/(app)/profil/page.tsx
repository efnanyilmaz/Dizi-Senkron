"use client";

import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { ClapperLoader } from "@/components/clapper-loader";
import { TicketField } from "@/components/ticket-field";
import { FieldError } from "@/components/field-error";
import { apiFetch } from "@/lib/api";
import { getErrorMessage } from "@/lib/get-error-message";

type Me = { id: string; email: string; displayName: string; emailVerified: boolean };

function Row({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[200px_1fr] gap-8 py-7 max-[640px]:grid-cols-1 max-[640px]:gap-3">
      <div>
        <div className="text-[15px] font-medium text-text-primary">{title}</div>
        {description && (
          <p className="mt-1 max-w-[26ch] text-[13px] leading-relaxed text-text-muted">
            {description}
          </p>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export default function ProfilPage() {
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsAuth, setNeedsAuth] = useState(false);

  const [displayName, setDisplayName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSaved, setNameSaved] = useState(false);

  const [changingEmail, setChangingEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [emailChangePassword, setEmailChangePassword] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [confirmEmailLink, setConfirmEmailLink] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [verifyLink, setVerifyLink] = useState<string | null>(null);
  const [verifyEmailSent, setVerifyEmailSent] = useState(false);
  const [resending, setResending] = useState(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  const [deleteConfirming, setDeleteConfirming] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<Me | null>("/auth/me")
      .then((data) => {
        if (!data) {
          setNeedsAuth(true);
          return;
        }
        setMe(data);
        setDisplayName(data.displayName);
      })
      .catch(() => setNeedsAuth(true))
      .finally(() => setLoading(false));
  }, []);

  async function handleNameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNameError(null);
    setSavingName(true);
    try {
      const updated = await apiFetch<Me>("/auth/me", {
        method: "PATCH",
        body: JSON.stringify({ displayName: displayName.trim() }),
      });
      setMe(updated);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 2000);
    } catch (err) {
      setNameError(getErrorMessage(err));
    } finally {
      setSavingName(false);
    }
  }

  async function handlePasswordSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPasswordError(null);
    setSavingPassword(true);
    try {
      await apiFetch("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      setCurrentPassword("");
      setNewPassword("");
      setPasswordSaved(true);
      setTimeout(() => setPasswordSaved(false), 2000);
    } catch (err) {
      setPasswordError(getErrorMessage(err));
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setEmailError(null);
    setSavingEmail(true);
    try {
      const data = await apiFetch<{ pendingEmail: string; confirmLink?: string }>(
        "/auth/change-email",
        {
          method: "POST",
          body: JSON.stringify({ password: emailChangePassword, newEmail: newEmail.trim() }),
        },
      );
      setPendingEmail(data.pendingEmail);
      setConfirmEmailLink(data.confirmLink ?? null);
      setChangingEmail(false);
      setEmailChangePassword("");
      setNewEmail("");
    } catch (err) {
      setEmailError(getErrorMessage(err));
    } finally {
      setSavingEmail(false);
    }
  }

  async function handleResendVerification() {
    setResending(true);
    setVerifyError(null);
    try {
      const data = await apiFetch<{ verifyLink?: string }>("/auth/resend-verification", {
        method: "POST",
      });
      if (data.verifyLink) {
        setVerifyLink(data.verifyLink);
      } else {
        setVerifyEmailSent(true);
      }
    } catch (err) {
      setVerifyError(getErrorMessage(err));
    } finally {
      setResending(false);
    }
  }

  async function handleDeleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setDeleteError(null);
    setDeleting(true);
    try {
      await apiFetch("/auth/me", {
        method: "DELETE",
        body: JSON.stringify({ password: deletePassword }),
      });
      // Sert yönlendirme kasıtlı: layout'taki SiteHeader oturum durumunu
      // sadece mount olduğunda kontrol ediyor, router.push bunu tetiklemez.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/";
    } catch (err) {
      setDeleteError(getErrorMessage(err));
      setDeleting(false);
    }
  }

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch {
      // Çerez zaten geçersizse de kullanıcıyı ana sayfaya gönder.
    } finally {
      // Sert yönlendirme kasıtlı: layout'taki SiteHeader oturum durumunu
      // sadece mount olduğunda kontrol ediyor, router.push bunu tetiklemez.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/";
    }
  }

  if (loading) {
    return (
      <main className="mx-auto w-full max-w-[720px] px-8 py-16">
        <ClapperLoader />
      </main>
    );
  }

  if (needsAuth || !me) {
    return (
      <main className="mx-auto w-full max-w-[720px] px-8 py-16">
        <p className="mb-4 text-danger">Bu sayfayı görmek için giriş yapman gerekiyor.</p>
        <Link href="/giris" className="font-mono text-xs text-text-muted hover:text-text-primary">
          Giriş yap →
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[720px] px-8 py-16">
      <div className="mb-2 font-mono text-xs tracking-[0.16em] text-text-muted uppercase">
        Hesap ayarları
      </div>

      <div className="mb-4 flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="mb-1.5 font-display text-[clamp(28px,4vw,38px)] text-text-primary">
            {me.displayName}
          </h1>
          <div className="flex flex-wrap items-center gap-2.5 font-mono text-[13px] text-text-muted">
            {me.email}
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] tracking-[0.04em] uppercase ${
                me.emailVerified ? "bg-sync-soft text-sync" : "bg-signal-soft text-signal"
              }`}
            >
              {me.emailVerified ? "doğrulandı" : "doğrulanmadı"}
            </span>
            {!me.emailVerified && !verifyEmailSent && !verifyLink && (
              <button
                onClick={handleResendVerification}
                disabled={resending}
                className="text-xs text-text-muted underline underline-offset-2 hover:text-text-primary disabled:opacity-60"
              >
                {resending ? "Gönderiliyor…" : "Doğrulama bağlantısı gönder"}
              </button>
            )}
          </div>
          {!me.emailVerified && verifyEmailSent && (
            <p className="mt-2 text-[13px] text-text-secondary">
              Doğrulama bağlantısını {me.email} adresine gönderdik — gelen kutunu kontrol et.
            </p>
          )}
          {!me.emailVerified && verifyLink && (
            <div className="mt-2 rounded border border-dashed border-screen-line px-4 py-3">
              <p className="mb-2 font-mono text-[11px] tracking-[0.06em] text-text-muted uppercase">
                Test modu — e-posta servisi bağlı değil
              </p>
              <Link
                href={verifyLink}
                className="text-[13px] font-medium text-text-primary underline underline-offset-2"
              >
                Doğrulama bağlantına git →
              </Link>
            </div>
          )}
          {verifyError && <div className="mt-2"><FieldError>{verifyError}</FieldError></div>}
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="font-mono text-xs tracking-[0.06em] text-text-muted transition-colors hover:text-text-primary disabled:opacity-60"
        >
          {loggingOut ? "Çıkış yapılıyor…" : "Çıkış yap"}
        </button>
      </div>

      <div className="divide-y divide-dashed divide-screen-line border-t border-dashed border-screen-line">
        <Row title="Görünen ad">
          <form onSubmit={handleNameSubmit} className="flex flex-wrap items-end gap-4">
            <TicketField
              label="Görünen ad"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              minLength={2}
              className="max-w-xs flex-1"
            />
            <button
              type="submit"
              disabled={savingName}
              className="rounded-[3px] border border-dashed border-screen-line px-4 py-2.5 font-mono text-[13px] tracking-[0.04em] text-text-primary transition-colors hover:border-signal hover:bg-signal-soft disabled:opacity-60"
            >
              {savingName ? "Kaydediliyor…" : "Kaydet"}
            </button>
            {nameSaved && <span className="pb-2.5 font-mono text-xs text-sync">Kaydedildi</span>}
          </form>
          {nameError && <div className="mt-3"><FieldError>{nameError}</FieldError></div>}
        </Row>

        <Row title="E-posta">
          {pendingEmail ? (
            <div className="space-y-2">
              <p className="text-sm text-text-secondary">
                <span className="font-medium text-text-primary">{pendingEmail}</span> adresine bir
                onay bağlantısı gönderildi. Onaylayana kadar e-postan değişmez.
              </p>
              {confirmEmailLink && (
                <div className="rounded border border-dashed border-screen-line px-4 py-3">
                  <p className="mb-2 font-mono text-[11px] tracking-[0.06em] text-text-muted uppercase">
                    Test modu — e-posta servisi bağlı değil
                  </p>
                  <Link
                    href={confirmEmailLink}
                    className="text-[13px] font-medium text-text-primary underline underline-offset-2"
                  >
                    Onay bağlantısına git →
                  </Link>
                </div>
              )}
              <button
                onClick={() => {
                  setPendingEmail(null);
                  setConfirmEmailLink(null);
                  setChangingEmail(true);
                }}
                className="font-mono text-xs text-text-muted hover:text-text-primary"
              >
                Farklı bir adres dene
              </button>
            </div>
          ) : changingEmail ? (
            <form onSubmit={handleEmailSubmit} className="flex flex-wrap items-end gap-4">
              <TicketField
                label="Yeni e-posta"
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                required
                className="max-w-[220px]"
              />
              <TicketField
                label="Şifreni onayla"
                type="password"
                value={emailChangePassword}
                onChange={(e) => setEmailChangePassword(e.target.value)}
                required
                className="max-w-[160px]"
              />
              <button
                type="submit"
                disabled={savingEmail}
                className="rounded-[3px] border border-dashed border-screen-line px-4 py-2.5 font-mono text-[13px] tracking-[0.04em] text-text-primary transition-colors hover:border-signal hover:bg-signal-soft disabled:opacity-60"
              >
                {savingEmail ? "Gönderiliyor…" : "Onay bağlantısı gönder"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setChangingEmail(false);
                  setEmailError(null);
                  setNewEmail("");
                  setEmailChangePassword("");
                }}
                className="font-mono text-[13px] text-text-muted hover:text-text-primary"
              >
                Vazgeç
              </button>
            </form>
          ) : (
            <div className="flex flex-wrap items-center gap-4">
              <span className="font-mono text-sm text-text-primary">{me.email}</span>
              <button
                onClick={() => setChangingEmail(true)}
                className="font-mono text-xs text-text-muted hover:text-text-primary"
              >
                Değiştir
              </button>
            </div>
          )}
          {emailError && <div className="mt-3"><FieldError>{emailError}</FieldError></div>}
        </Row>

        <Row title="Şifre">
          <form onSubmit={handlePasswordSubmit} className="flex flex-wrap items-end gap-4">
            <TicketField
              label="Mevcut şifre"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              className="max-w-[160px]"
            />
            <TicketField
              label="Yeni şifre"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              minLength={8}
              className="max-w-[160px]"
            />
            <button
              type="submit"
              disabled={savingPassword}
              className="rounded-[3px] border border-dashed border-screen-line px-4 py-2.5 font-mono text-[13px] tracking-[0.04em] text-text-primary transition-colors hover:border-signal hover:bg-signal-soft disabled:opacity-60"
            >
              {savingPassword ? "Değiştiriliyor…" : "Değiştir"}
            </button>
            {passwordSaved && (
              <span className="pb-2.5 font-mono text-xs text-sync">Şifre değiştirildi</span>
            )}
          </form>
          {passwordError && <div className="mt-3"><FieldError>{passwordError}</FieldError></div>}
        </Row>
      </div>

      <div className="mt-10">
        <div className="rounded-lg border border-danger/30 px-5 py-5">
          {deleteConfirming ? (
            <form onSubmit={handleDeleteAccount} className="space-y-4">
              <p className="text-sm text-danger">
                Hesabın ve tüm verilerin (gruplar, mesajlar, favoriler) kalıcı olarak silinecek. Bu
                işlem geri alınamaz.
              </p>
              <TicketField
                label="Şifreni onayla"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                required
                className="max-w-xs"
              />
              <div className="flex flex-wrap items-center gap-4">
                <button
                  type="submit"
                  disabled={deleting}
                  className="rounded-[3px] border border-dashed border-danger/50 px-4 py-2.5 font-mono text-[13px] tracking-[0.04em] text-danger transition-colors hover:bg-danger/10 disabled:opacity-60"
                >
                  {deleting ? "Siliniyor…" : "Evet, hesabımı sil"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDeleteConfirming(false);
                    setDeletePassword("");
                    setDeleteError(null);
                  }}
                  className="font-mono text-[13px] text-text-muted hover:text-text-primary"
                >
                  Vazgeç
                </button>
              </div>
              {deleteError && <FieldError>{deleteError}</FieldError>}
            </form>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-4">
              <p className="max-w-[38ch] text-[13px] leading-relaxed text-text-muted">
                Hesabını ve tüm verilerini kalıcı olarak sil.
              </p>
              <button
                type="button"
                onClick={() => setDeleteConfirming(true)}
                className="shrink-0 rounded-[3px] border border-dashed border-danger/50 px-4 py-2.5 font-mono text-[13px] tracking-[0.04em] text-danger transition-colors hover:bg-danger/10"
              >
                Hesabımı sil
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
