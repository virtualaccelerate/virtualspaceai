import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Loader2, CheckCircle2, QrCode } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { submitDemoRequest } from "@/lib/demo-request.functions";
import demoQr from "@/assets/mentor-demo-qr.png";

type Props = {
  mentorName: string;
  rate?: string | null;
  children: ReactNode;
};

export function MentorBookingDialog({ mentorName, rate, children }: Props) {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"form" | "pay">("form");
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !contact.trim()) return;
    setLoading(true);
    try {
      await submitDemoRequest({
        data: {
          name: name.trim(),
          contact: contact.trim(),
          company: `Mentor: ${mentorName}`,
          language: i18n.language,
        },
      });
      setStep("pay");
    } catch {
      toast.error(t("mentors.bookError", "Could not send the request. Please try again."));
    } finally {
      setLoading(false);
    }
  }

  function onOpenChange(v: boolean) {
    setOpen(v);
    if (!v) {
      setStep("form");
      setName("");
      setContact("");
    }
  }

  const inputCls =
    "w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-primary/50 transition";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="glass-strong border-white/10 sm:max-w-md">
        {step === "form" ? (
          <>
            <DialogHeader>
              <DialogTitle className="font-display text-xl text-white">
                {t("mentors.bookTitle", "Book a session")}
              </DialogTitle>
              <DialogDescription className="text-white/55">
                {mentorName}
                {rate ? ` · ${rate}` : ""}
                {" — "}
                {t("mentors.bookHint", "leave your contacts and we will confirm the time.")}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={onSubmit} className="mt-2 space-y-3">
              <input
                className={inputCls}
                placeholder={t("mentors.formName", "Your name")}
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                maxLength={120}
              />
              <input
                className={inputCls}
                placeholder={t("mentors.formContact", "Phone, email or Telegram")}
                value={contact}
                onChange={(e) => setContact(e.target.value)}
                required
                maxLength={200}
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-primary text-primary-foreground px-6 py-3 text-sm font-semibold hover:bg-primary/90 transition disabled:opacity-60"
              >
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {t("mentors.formSubmit", "Send request")}
              </button>
            </form>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display text-xl text-white">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                {t("mentors.bookDone", "Request sent")}
              </DialogTitle>
              <DialogDescription className="text-white/55">
                {t("mentors.bookDoneBody", "We will contact you shortly to confirm the session.")}
              </DialogDescription>
            </DialogHeader>

            <div className="mt-2 rounded-2xl border border-white/10 bg-white/5 p-5 text-center">
              <p className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-white/50">
                <QrCode className="h-3.5 w-3.5" />
                {t("mentors.payQr", "Payment QR (demo)")}
              </p>
              <img
                src={demoQr}
                alt={t("mentors.payQr", "Payment QR (demo)")}
                className="mx-auto mt-4 h-44 w-44 rounded-xl bg-white p-2"
              />
              {rate && <p className="mt-4 text-sm text-white/80 font-semibold">{rate}</p>}
              <p className="mt-2 text-xs text-white/45 leading-relaxed">
                {t("mentors.payQrNote", "Demo QR code — real payment will be enabled soon.")}
              </p>
            </div>

            <button
              onClick={() => onOpenChange(false)}
              className="mt-1 w-full rounded-full border border-white/15 px-6 py-3 text-sm text-white/75 hover:text-white hover:border-white/30 transition"
            >
              {t("mentors.close", "Close")}
            </button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
