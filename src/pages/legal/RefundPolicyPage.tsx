import { useTranslation } from 'react-i18next';
import { NavigationHeader } from '@/components/layout/NavigationHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function RefundPolicyPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--section-tint))] to-background">
      <NavigationHeader title={t('legal.refundPolicy')} showBackButton={true} />
      
      <div className="max-w-3xl mx-auto p-4 space-y-6 pb-12">
        <Card>
          <CardHeader>
            <CardTitle>Refund Policy – Family Huddle</CardTitle>
            <p className="text-sm text-muted-foreground">Last updated: 31 January 2026</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">
              Thank you for using Family Huddle.
            </p>
            <p className="text-muted-foreground">
              This Refund Policy explains when you may be eligible for a refund for payments made for Family Huddle Premium subscriptions.
            </p>

            <section>
              <h2 className="text-lg font-semibold">1. Subscriptions and Billing</h2>
              <p className="text-muted-foreground">
                Family Huddle Premium is billed on a recurring monthly basis. The current price is $4.90 USD per month (price may vary by region, currency, or promotion). Subscriptions renew automatically at the end of each billing period unless cancelled.
              </p>
              <p className="text-muted-foreground">
                You can cancel your subscription at any time through the platform where you subscribed (for example, in-app store, web payment page, or payment provider account). After cancellation, you will continue to have access to Premium features until the end of your current paid billing period.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">2. Free Trial</h2>
              <p className="text-muted-foreground">
                New Premium subscriptions may include a free trial period (currently four (4) days). During the trial you have full access to all Premium features without limitations.
              </p>
              <p className="text-muted-foreground">
                If you cancel during the free trial, you will not be charged. If you do not cancel before the trial ends, your subscription will automatically start and your payment method will be charged at the then-current monthly price.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">3. General Refund Policy</h2>
              <p className="text-muted-foreground">
                As a general rule, we do not provide refunds for:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>partial billing periods (for example, if you cancel in the middle of a month),</li>
                <li>unused time, or</li>
                <li>forgetting to cancel before the next renewal date.</li>
              </ul>
              <p className="text-muted-foreground">
                You can cancel at any time to prevent future charges.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">4. Billing Errors and Exceptional Cases</h2>
              <p className="text-muted-foreground">
                If you believe you have been incorrectly charged (for example, due to technical issues, duplicate payments, or unauthorized charges), please contact us as soon as possible.
              </p>
              <p className="text-muted-foreground">
                We will review your request and, where appropriate, work with the payment provider or app store to correct the issue. In some cases this may include issuing a refund or credit, in our reasonable discretion and subject to the policies of the relevant payment provider or app store.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">5. Legal Rights</h2>
              <p className="text-muted-foreground">
                Nothing in this Refund Policy affects any rights you may have under applicable consumer protection laws. If the law in your country or region requires a refund in specific circumstances, we will follow those legal requirements.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">6. How to Contact Us</h2>
              <p className="text-muted-foreground">
                If you have questions about this Refund Policy or need help with a payment issue, please contact:
              </p>
              <ul className="list-none pl-0 text-muted-foreground space-y-1">
                <li><strong>Owner:</strong> Yana Sklyar</li>
                <li><strong>Location:</strong> Tel Aviv, Israel</li>
                <li><strong>Email:</strong> support@familyhuddletasks.com</li>
              </ul>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
