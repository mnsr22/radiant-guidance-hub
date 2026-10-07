// Automatic member emails for admin decisions. Never blocks the admin action:
// if the email fails, the admin sees a warning but the decision still stands.
import { toast } from "sonner";
import { getToken } from "@/lib/api";
import { sendAdminEmails } from "@/lib/email.functions";

type Event =
  | { kind: "verification"; type: "phone" | "identity" | "photo"; status: "verified" | "rejected" | "resubmissionRequired"; reason?: string }
  | { kind: "photo"; status: "approved" | "rejected"; reason?: string }
  | { kind: "withdrawal"; status: "approved" | "paid" | "rejected"; amount: number; reference?: string; reason?: string };

const LABEL = { phone: "phone number", identity: "ID document", photo: "verification selfie" };

function build(e: Event): { subject: string; heading: string; body: string } {
  const why = (r?: string) => (r ? `\n\nReason: ${r}` : "");
  if (e.kind === "verification") {
    const what = LABEL[e.type];
    if (e.status === "verified")
      return { subject: `Your ${what} is verified`, heading: "You're verified ✓", body: `Hi {{name}},\n\nGood news — we've reviewed and approved your ${what}. Your profile now shows this verification.\n\nJazakAllahu khayran for helping keep Halal Connect safe.` };
    if (e.status === "resubmissionRequired")
      return { subject: `Please resubmit your ${what}`, heading: "We need a clearer submission", body: `Hi {{name}},\n\nWe couldn't complete the review of your ${what}. Please open the app and submit it again.${why(e.reason)}` };
    return { subject: `Your ${what} wasn't approved`, heading: "Verification not approved", body: `Hi {{name}},\n\nWe reviewed your ${what} but couldn't approve it.${why(e.reason)}\n\nYou can submit again from the app at any time.` };
  }
  if (e.kind === "photo")
    return e.status === "approved"
      ? { subject: "Your photo is approved", heading: "Photo approved", body: "Hi {{name}},\n\nYour photo has been approved and is now visible on your profile." }
      : { subject: "Your photo wasn't approved", heading: "Photo not approved", body: `Hi {{name}},\n\nOne of your photos didn't meet our community guidelines and has been removed.${why(e.reason)}\n\nYou can upload a different photo from the app.` };
  const amt = `${e.amount.toLocaleString()} UGX`;
  if (e.status === "paid")
    return { subject: "Your withdrawal has been paid", heading: "Payment sent", body: `Hi {{name}},\n\nWe've sent your withdrawal of ${amt}.${e.reference ? `\n\nTransfer reference: ${e.reference}` : ""}\n\nIt should reach you shortly.` };
  if (e.status === "approved")
    return { subject: "Your withdrawal is approved", heading: "Withdrawal approved", body: `Hi {{name}},\n\nYour withdrawal request of ${amt} has been approved and the payment is being processed.` };
  return { subject: "Your withdrawal wasn't approved", heading: "Withdrawal not approved", body: `Hi {{name}},\n\nYour withdrawal request of ${amt} wasn't approved, and the amount has been returned to your balance.${why(e.reason)}` };
}

export async function notifyMember(to: { email?: string; name?: string }, e: Event) {
  if (!to.email || !to.email.includes("@")) return;
  const token = getToken();
  if (!token) return;
  try {
    const msg = build(e);
    const r = await sendAdminEmails({
      data: { adminToken: token, messages: [{ to: to.email, name: to.name, template: "branded", ...msg }] },
    });
    if (r.sent) toast.success(`Email sent to ${to.email}`);
    else toast.warning(`Couldn't email ${to.email}: ${r.failed[0]?.error ?? "unknown error"}`);
  } catch (err) {
    toast.warning(`Couldn't email the member: ${err instanceof Error ? err.message : "unknown error"}`);
  }
}
