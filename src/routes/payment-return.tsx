import { createFileRoute } from "@tanstack/react-router";
import { Clock3, ShieldCheck } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/payment-return")({
  head: () => ({
    meta: [
      { title: "Payment return · Halal Connect" },
      {
        name: "description",
        content: "Return from Pesapal while Halal Connect verifies your payment.",
      },
    ],
  }),
  component: PaymentReturnPage,
});

function PaymentReturnPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-lg">
        <CardHeader className="items-center text-center">
          <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
            <ShieldCheck className="h-7 w-7" aria-hidden="true" />
          </div>
          <CardTitle>Payment returned securely</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-sm leading-6 text-muted-foreground">
            Pesapal has returned you to Halal Connect. Your payment status is verified with Pesapal
            before subscription access is updated.
          </p>
          <div className="flex items-center justify-center gap-2 rounded-md bg-muted p-3 text-sm">
            <Clock3 className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>
              Return to the app to check your subscription. If it is still processing, wait briefly
              and check again.
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            This page does not confirm or activate a payment by itself. Please do not submit another
            payment while the app shows it as processing.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
