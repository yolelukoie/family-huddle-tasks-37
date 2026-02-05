import { useTranslation } from 'react-i18next';
import { NavigationHeader } from '@/components/layout/NavigationHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function PrivacyPolicyPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--section-tint))] to-background">
      <NavigationHeader title={t('legal.privacyPolicy')} showBackButton={true} />
      
      <div className="max-w-3xl mx-auto p-4 space-y-6 pb-12">
        <Card>
          <CardHeader>
            <CardTitle>Privacy Policy – Family Huddle</CardTitle>
            <p className="text-sm text-muted-foreground">Last updated: 31 January 2026</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-lg font-semibold">1. Information We Collect</h2>
              <p className="text-muted-foreground">
                We collect information you provide directly to us, including:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Account information (email address, display name)</li>
                <li>Profile information (avatar, gender preference for character display, language preference)</li>
                <li>Family and task data you create within the app</li>
                <li>Chat messages shared within your family groups</li>
                <li>Custom images you upload (profile pictures, character images)</li>
                <li>Push notification tokens (if you enable notifications)</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">2. How We Use Your Information</h2>
              <p className="text-muted-foreground">
                We use the information we collect to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Provide, maintain, and improve our family task management services</li>
                <li>Send you notifications about task assignments and family activity (with your permission)</li>
                <li>Track your progress and display achievements within the app</li>
                <li>Respond to your comments, questions, and support requests</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">3. Push Notifications</h2>
              <p className="text-muted-foreground">
                If you enable push notifications, we use Firebase Cloud Messaging (FCM) to deliver notifications 
                about task assignments, completions, and family chat messages. You can disable notifications 
                at any time through your device settings or the app's personal settings page.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">4. Data Storage and Security</h2>
              <p className="text-muted-foreground">
                Your data is stored securely using Supabase, which provides industry-standard security measures 
                including encryption at rest and in transit. We implement row-level security to ensure you can 
                only access data within your own family groups.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">5. Third-Party Services</h2>
              <p className="text-muted-foreground">
                We use the following third-party services:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li><strong>Supabase:</strong> Database and authentication services</li>
                <li><strong>Firebase:</strong> Push notification delivery</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">6. Data Sharing</h2>
              <p className="text-muted-foreground">
                We do not sell, trade, or rent your personal information to third parties. Your family data 
                is only shared with members of your family groups within the app.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">7. Your Rights</h2>
              <p className="text-muted-foreground">
                You have the right to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Access and update your personal information</li>
                <li>Delete your account and associated data through the app's Personal Settings page</li>
                <li>Opt out of push notifications</li>
                <li>Leave family groups at any time</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">8. Children's Privacy</h2>
              <p className="text-muted-foreground">
                Our app is designed for family use. Children under 13 should use the app under parental 
                supervision. Parents or guardians are responsible for managing their children's accounts 
                within family groups.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">9. Contact Us</h2>
              <p className="text-muted-foreground">
                If you have questions about this Privacy Policy, please contact us at{' '}
                <a href="mailto:support@familyhuddletasks.com" className="text-primary hover:underline">
                  support@familyhuddletasks.com
                </a>
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
