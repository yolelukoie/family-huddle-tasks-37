import { NavigationHeader } from '@/components/layout/NavigationHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--section-tint))] to-background">
      <NavigationHeader title="Terms of Service" showBackButton={true} />
      
      <div className="max-w-3xl mx-auto p-4 space-y-6 pb-12">
        <Card>
          <CardHeader>
            <CardTitle>Terms of Service – Family Huddle</CardTitle>
            <p className="text-sm text-muted-foreground">Last updated: 29 January 2026</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <p className="text-muted-foreground">
              These Terms of Service ("Terms") govern your use of the Family Huddle application and any related services (together, the "Service"). The Service is owned and operated by Yana Sklyar, Tel Aviv, Israel ("we", "us", "our").
            </p>
            <p className="text-muted-foreground">
              By creating an account or using the Service, you agree to these Terms. If you do not agree, please do not use the Service.
            </p>
            <p className="text-muted-foreground italic">
              This document is provided for general information and use of the Service. It is not legal advice.
            </p>

            <section>
              <h2 className="text-lg font-semibold">1. What Family Huddle Is</h2>
              <p className="text-muted-foreground">
                Family Huddle is a family and group task-management app that allows users to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>create, assign, and track tasks and goals,</li>
                <li>collaborate with family members and friends,</li>
                <li>share progress and feedback.</li>
              </ul>
              <p className="text-muted-foreground">
                The Service may evolve over time; features may be added, changed, or removed.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">2. Eligibility</h2>
              <p className="text-muted-foreground">You may use the Service only if:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>you are at least 18 years old, or</li>
                <li>you are a minor using the Service with the permission and supervision of a parent or legal guardian.</li>
              </ul>
              <p className="text-muted-foreground">
                Parents and legal guardians are responsible for the actions of minors who use the Service under their supervision.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">3. Accounts and Security</h2>
              <p className="text-muted-foreground">
                To use Family Huddle, you may need to create an account.
              </p>
              <p className="text-muted-foreground">You agree to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>provide accurate information,</li>
                <li>keep your login credentials secure, and</li>
                <li>be responsible for all activity that occurs under your account.</li>
              </ul>
              <p className="text-muted-foreground">We may suspend or terminate accounts that:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>violate these Terms,</li>
                <li>are used for fraudulent or unlawful purposes, or</li>
                <li>interfere with the operation of the Service.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">4. Subscriptions, Payments, and Refunds</h2>
              <p className="text-muted-foreground">
                Some features of Family Huddle are available only through paid subscriptions ("Premium").
              </p>
              
              <h3 className="text-base font-medium mt-4">4.1 Subscriptions and Renewal</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Subscription prices, billing periods, and what is included in each plan are displayed in the app or on our website.</li>
                <li>Subscriptions are typically billed in advance and renew automatically at the end of each billing period unless cancelled.</li>
                <li>You can cancel your subscription at any time through the platform where you subscribed (for example, in-app stores, web payment page, or payment provider account).</li>
              </ul>

              <h3 className="text-base font-medium mt-4">4.2 Payment Processing</h3>
              <p className="text-muted-foreground">
                Payments are processed by third-party payment providers (for example, payment platforms, app stores, or other billing services). We do not store your full payment card details on our own servers.
              </p>
              <p className="text-muted-foreground">
                Your use of these third-party services may be subject to their own terms and privacy policies in addition to these Terms.
              </p>

              <h3 className="text-base font-medium mt-4">4.3 Refunds and Cancellations</h3>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>No refunds for partial billing periods are provided.</li>
                <li>You may cancel your subscription at any time; after cancellation, you will continue to have access to Premium features until the end of your current paid billing period. After that, access to Premium features will be removed unless you renew.</li>
                <li>Any refunds required by applicable law will be handled in accordance with that law and, where relevant, the policies of the payment provider or app store through which you subscribed.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">5. Acceptable Use</h2>
              <p className="text-muted-foreground">You agree not to use the Service to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>violate any applicable laws or regulations,</li>
                <li>harass, threaten, or harm others,</li>
                <li>share content that is hateful, abusive, obscene, or otherwise inappropriate,</li>
                <li>upload or distribute viruses, malware, or any other harmful code,</li>
                <li>attempt to gain unauthorized access to the Service, other accounts, or our systems,</li>
                <li>reverse-engineer, decompile, or otherwise attempt to obtain the source code of the Service, except where permitted by law.</li>
              </ul>
              <p className="text-muted-foreground">
                We may remove content, restrict features, or suspend accounts that violate these rules or otherwise misuse the Service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">6. User Content</h2>
              <p className="text-muted-foreground">
                "User Content" means any information you or other users submit to the Service, such as task names, notes, comments, profile details, or other data.
              </p>
              <p className="text-muted-foreground">
                You retain ownership of your User Content. By using the Service, you grant us a worldwide, non-exclusive, royalty-free license to store, process, and display your User Content as necessary to operate and improve the Service.
              </p>
              <p className="text-muted-foreground">You are responsible for ensuring that your User Content:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>does not infringe the rights of others,</li>
                <li>does not contain illegal or prohibited material, and</li>
                <li>complies with these Terms and applicable laws.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">7. Privacy (Privacy Policy)</h2>
              <p className="text-muted-foreground">
                This section explains how we handle your personal data when you use Family Huddle.
              </p>

              <h3 className="text-base font-medium mt-4">7.1 Data We Collect</h3>
              <p className="text-muted-foreground">Depending on how you use the Service, we may collect:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li><strong>Account data:</strong> email address, name or nickname, password (stored in hashed form), language preferences.</li>
                <li><strong>Profile and family data:</strong> family or group names, member names or nicknames, roles, and relationships you define in the app.</li>
                <li><strong>Usage data:</strong> tasks you create or complete, schedules, streaks, achievements, app settings, and other in-app activity.</li>
                <li><strong>Technical data:</strong> IP address, device type, operating system, app version, and basic usage analytics (for example, which screens are most used).</li>
                <li><strong>Payment data:</strong> limited information about your subscription status, payment method type, and billing history, as provided by payment processors or app stores. We do not store your full payment card number on our servers.</li>
              </ul>

              <h3 className="text-base font-medium mt-4">7.2 How We Use Your Data</h3>
              <p className="text-muted-foreground">We use your data to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>provide and maintain the Service,</li>
                <li>personalize your experience (for example, language and settings),</li>
                <li>enable collaboration between family members and groups,</li>
                <li>manage subscriptions and verify your access to Premium features,</li>
                <li>monitor and improve performance and reliability of the Service,</li>
                <li>comply with legal obligations (for example, tax or accounting requirements),</li>
                <li>protect our rights, enforce these Terms, and prevent abuse or fraud.</li>
              </ul>

              <h3 className="text-base font-medium mt-4">7.3 Legal Bases (where applicable)</h3>
              <p className="text-muted-foreground">Where required by law (for example, in the EU/EEA), our processing may be based on:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>performance of a contract (providing the Service to you),</li>
                <li>legitimate interests (improving and protecting the Service),</li>
                <li>compliance with legal obligations, or</li>
                <li>your consent (for example, for optional analytics, if applicable).</li>
              </ul>

              <h3 className="text-base font-medium mt-4">7.4 Sharing of Data</h3>
              <p className="text-muted-foreground">We may share data with:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Service providers that help us run the Service (such as hosting, databases, analytics, error monitoring, and customer support).</li>
                <li>Payment processors and app stores that handle your subscription payments.</li>
                <li>Authorities or legal entities where required by law, court order, or to protect our legal rights and users' safety.</li>
              </ul>
              <p className="text-muted-foreground">
                We do not sell your personal data to third parties.
              </p>

              <h3 className="text-base font-medium mt-4">7.5 Data Storage and Retention</h3>
              <p className="text-muted-foreground">
                We store your data on secure servers provided by reputable hosting providers. We keep data for as long as necessary to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>operate the Service,</li>
                <li>comply with legal and accounting requirements, and</li>
                <li>resolve disputes or enforce our agreements.</li>
              </ul>
              <p className="text-muted-foreground">
                If you delete your account, we will remove or anonymize your personal data within a reasonable time, except where we are legally required or permitted to keep certain records.
              </p>

              <h3 className="text-base font-medium mt-4">7.6 Your Rights</h3>
              <p className="text-muted-foreground">Depending on your location, you may have the right to:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>access the personal data we hold about you,</li>
                <li>correct inaccurate data,</li>
                <li>request deletion of your data,</li>
                <li>object to or restrict certain processing,</li>
                <li>request a copy of your data in a portable format, where applicable.</li>
              </ul>
              <p className="text-muted-foreground">
                To exercise these rights, please contact us at the email address provided in the Contact section below. We may need to verify your identity before responding.
              </p>

              <h3 className="text-base font-medium mt-4">7.7 Children's Privacy</h3>
              <p className="text-muted-foreground">
                Family Huddle may be used by families that include children. The Service is intended to be used by minors only with the permission and supervision of a parent or legal guardian. If you believe that we have collected personal data from a child without appropriate consent, please contact us and we will take steps to remove that data where required by law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">8. Changes to the Service and to These Terms</h2>
              <p className="text-muted-foreground">
                We may update or change the Service at any time, including adding or removing features.
              </p>
              <p className="text-muted-foreground">
                We may also update these Terms from time to time. When we make material changes, we will take reasonable steps to inform you (for example, by updating the "Last updated" date, notifying you in the app, or sending an email).
              </p>
              <p className="text-muted-foreground">
                Your continued use of the Service after changes become effective means you accept the updated Terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">9. Termination</h2>
              <p className="text-muted-foreground">
                You may stop using the Service at any time and, if you have an account, you may delete it or request deletion.
              </p>
              <p className="text-muted-foreground">We may suspend or terminate your access to the Service if:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>you seriously or repeatedly violate these Terms,</li>
                <li>your account is used in a way that creates risk or legal exposure for us, or</li>
                <li>continued operation of your account is no longer commercially or technically viable.</li>
              </ul>
              <p className="text-muted-foreground">
                Upon termination, your right to use the Service will end. Some provisions of these Terms (including those on limitation of liability and governing law) will continue to apply even after termination.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">10. Disclaimers</h2>
              <p className="text-muted-foreground">
                The Service is provided on an "as is" and "as available" basis, without any warranties of any kind, whether express or implied.
              </p>
              <p className="text-muted-foreground">We do not guarantee that:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>the Service will be error-free or always available,</li>
                <li>the Service will meet your specific requirements, or</li>
                <li>any defects will be corrected immediately.</li>
              </ul>
              <p className="text-muted-foreground">
                To the maximum extent permitted by law, we disclaim all warranties, including implied warranties of merchantability, fitness for a particular purpose, and non-infringement.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">11. Limitation of Liability</h2>
              <p className="text-muted-foreground">To the maximum extent permitted by law:</p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>we are not liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, profits, or goodwill, arising out of or relating to your use of the Service; and</li>
                <li>our total liability for any claims related to the Service is limited to the amount you paid to us for the Service in the three (3) months immediately before the event giving rise to the claim.</li>
              </ul>
              <p className="text-muted-foreground">
                Some jurisdictions do not allow certain limitations of liability, so parts of this section may not apply to you.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">12. Governing Law and Disputes</h2>
              <p className="text-muted-foreground">
                These Terms are governed by the laws of Israel, without regard to its conflict of laws principles.
              </p>
              <p className="text-muted-foreground">
                Any disputes arising out of or relating to these Terms or the Service will be subject to the exclusive jurisdiction of the competent courts located in Tel Aviv, Israel, unless applicable law requires a different venue.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">13. Contact</h2>
              <p className="text-muted-foreground">
                If you have any questions about these Terms or our privacy practices, you can contact:
              </p>
              <div className="text-muted-foreground mt-2">
                <p><strong>Owner:</strong> Yana Sklyar</p>
                <p><strong>Location:</strong> Tel Aviv, Israel</p>
                <p><strong>Email:</strong> <a href="mailto:y.olelukoie@gmail.com" className="text-primary hover:underline">y.olelukoie@gmail.com</a></p>
              </div>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
