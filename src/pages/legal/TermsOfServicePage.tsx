import { useTranslation } from 'react-i18next';
import { NavigationHeader } from '@/components/layout/NavigationHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsOfServicePage() {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-[hsl(var(--section-tint))] to-background">
      <NavigationHeader title="Terms of Service" showBackButton={true} />
      
      <div className="max-w-3xl mx-auto p-4 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground">Last updated: December 2024</p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4">
            <section>
              <h2 className="text-lg font-semibold">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground">
                By accessing and using Family Huddle ("the App"), you accept and agree to be bound by these 
                Terms of Service. If you do not agree to these terms, please do not use the App.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">2. Description of Service</h2>
              <p className="text-muted-foreground">
                Family Huddle is a family task management application that allows family members to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Create and assign tasks to family members</li>
                <li>Track progress through a gamified character and badge system</li>
                <li>Set and achieve family goals</li>
                <li>Communicate through family chat</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">3. User Accounts</h2>
              <p className="text-muted-foreground">
                You are responsible for maintaining the confidentiality of your account credentials and for 
                all activities that occur under your account. You must provide accurate information when 
                creating your account.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">4. Family Groups</h2>
              <p className="text-muted-foreground">
                Family groups are created using invite codes. You are responsible for who you invite to your 
                family group. All members of a family group can see tasks, goals, and chat messages within 
                that group.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">5. Acceptable Use</h2>
              <p className="text-muted-foreground">
                You agree not to:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                <li>Use the App for any unlawful purpose</li>
                <li>Share inappropriate content in family chats</li>
                <li>Attempt to gain unauthorized access to other users' accounts</li>
                <li>Interfere with or disrupt the App's services</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">6. Content Ownership</h2>
              <p className="text-muted-foreground">
                You retain ownership of content you create within the App (tasks, messages, etc.). By using 
                the App, you grant us a license to store and display this content to provide our services.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">7. Disclaimers</h2>
              <p className="text-muted-foreground">
                The App is provided "as is" without warranties of any kind. We do not guarantee that the 
                App will be uninterrupted or error-free.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">8. Limitation of Liability</h2>
              <p className="text-muted-foreground">
                To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, 
                special, or consequential damages arising from your use of the App.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">9. Changes to Terms</h2>
              <p className="text-muted-foreground">
                We may modify these Terms at any time. Continued use of the App after changes constitutes 
                acceptance of the modified Terms.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">10. Termination</h2>
              <p className="text-muted-foreground">
                We reserve the right to suspend or terminate your account if you violate these Terms or 
                engage in harmful behavior.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">11. Contact</h2>
              <p className="text-muted-foreground">
                For questions about these Terms, please contact us through the app's support channels.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
