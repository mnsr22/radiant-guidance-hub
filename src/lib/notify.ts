// Automatic member emails for admin decisions. Never blocks the admin action:
// if the email fails, the admin sees a warning but the decision still stands.
import { toast } from "sonner";
import { getToken } from "@/lib/api";
import { sendAdminEmails } from "@/lib/email.functions";

type Event =
  | { kind: "photo"; status: "approved" | "rejected"; reason?: string; count?: number }
  | { kind: "withdrawal"; status: "approved" | "paid" | "rejected"; amount: number; reference?: string; reason?: string };

function build(e: Event): { subject: string; heading: string; body: string } {
  const why = (r?: string) => (r ? `\n\nReason: ${r}` : "");
  if (e.kind === "photo") {
    const count = e.count ?? 1;
    const photos = `${count} photo${count === 1 ? "" : "s"}`;
    return e.status === "approved"
      ? {
          subject: count === 1 ? "Your photo is approved" : "Your photos are approved",
          heading: count === 1 ? "Photo approved" : "Photos approved",
          body: `Hi {{name}},\n\n${count === 1 ? "Your photo has" : `${photos} have`} been approved and ${count === 1 ? "is" : "are"} now visible on your profile.`,
        }
      : {
          subject: count === 1 ? "Your photo wasn't approved" : "Your photos weren't approved",
          heading: count === 1 ? "Photo not approved" : "Photos not approved",
          body: `Hi {{name}},\n\n${count === 1 ? "One of your photos didn't" : `${photos} didn't`} meet our community guidelines and ${count === 1 ? "has" : "have"} been rejected.${why(e.reason)}\n\nYou can upload a different photo from the app.`,
        };
  }
  const amt = `${e.amount.toLocaleString()} UGX`;
  if (e.status === "paid")
    return { subject: "Your withdrawal has been paid", heading: "Payment sent", body: `Hi {{name}},\n\nWe've sent your withdrawal of ${amt}.${e.reference ? `\n\nTransfer reference: ${e.reference}` : ""}\n\nIt should reach you shortly.` };
  if (e.status === "approved")
    return { subject: "Your withdrawal is approved", heading: "Withdrawal approved", body: `Hi {{name}},\n\nYour withdrawal request of ${amt} has been approved and the payment is being processed.` };
  return { subject: "Your withdrawal wasn't approved", heading: "Withdrawal not approved", body: `Hi {{name}},\n\nYour withdrawal request of ${amt} wasn't approved, and the amount has been returned to your balance.${why(e.reason)}` };
}

export async function notifyMember(to: { email?: string; name?: string }, e: Event) {
  if (!to.email || !to.email.includes("@")) {
    toast.warning("Couldn't email the member: no valid email address is on file.");
    return;
  }
  const token = getToken();
  if (!token) {
    toast.warning("Couldn't email the member: your admin session has expired.");
    return;
  }
  try {
    const msg = build(e);
    const r = await sendAdminEmails({
      recipients: [{ email: to.email, name: to.name }],
      template: "branded",
      ...msg,
    });
    if (r.sent) toast.success(`Email accepted by Resend for ${to.email}`);
    else toast.warning(`Couldn't email ${to.email}: ${r.failed[0]?.error ?? "unknown error"}`);
  } catch (err) {
    toast.warning(`Couldn't email the member: ${err instanceof Error ? err.message : "unknown error"}`);
  }
}
