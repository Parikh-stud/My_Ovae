
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function PrivacyPolicyPage() {
  return (
    <div className="bg-background min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-3xl font-headline text-gradient">Privacy Policy</CardTitle>
            <p className="text-muted-foreground">Last Updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none text-muted-foreground">
            <p>
              This is a placeholder for your Privacy Policy. It's essential to outline how you collect, use, and protect your users' data. This is particularly important for a health application like MyOvae.
            </p>

            <h2 className="text-foreground">1. Information We Collect</h2>
            <p>
              You should detail the types of information you collect. This might include:
            </p>
            <ul>
              <li><strong>Personal Information:</strong> Name, email address, etc., provided during sign-up.</li>
              <li><strong>Health Data:</strong> Information about menstrual cycles, symptoms, mood, nutrition, fitness, and other health markers that the user logs.</li>
              <li><strong>Usage Data:</strong> How users interact with the app, feature usage, device information, and IP addresses.</li>
              <li><strong>Cookies and Tracking Technologies:</strong> Explain what cookies you use and why.</li>
            </ul>

            <h2 className="text-foreground">2. How We Use Your Information</h2>
            <p>
              Describe the purposes for collecting data, such as:
            </p>
            <ul>
              <li>To provide, operate, and maintain our service.</li>
              <li>To improve, personalize, and expand our service (e.g., AI-powered insights).</li>
              <li>To understand and analyze how you use our service.</li>
              <li>To communicate with you, for customer service, and for marketing purposes.</li>
              <li>For compliance, fraud prevention, and safety.</li>
              <li>For anonymous research, if the user has opted in.</li>
            </ul>

            <h2 className="text-foreground">3. Data Sharing and Disclosure</h2>
            <p>
              Be transparent about when and with whom you might share user data:
            </p>
            <ul>
              <li><strong>With Healthcare Providers:</strong> Only if the user explicitly initiates sharing.</li>
              <li><strong>For Research:</strong> Only anonymized and aggregated data, if the user has opted in.</li>
              <li><strong>Service Providers:</strong> Third-party vendors who help operate the app (e.g., hosting, analytics). Ensure they have strong privacy protections.</li>
              <li><strong>Legal Requirements:</strong> If required by law, such as in response to a subpoena.</li>
            </ul>

            <h2 className="text-foreground">4. Data Security</h2>
            <p>
              Explain the measures you take to protect user data, such as encryption (in transit and at rest), access controls, and regular security audits. Mention your use of secure cloud infrastructure like Firebase.
            </p>
            
            <h2 className="text-foreground">5. Your Data Rights</h2>
            <p>
                Inform users of their rights regarding their data, such as the right to access, correct, or delete their personal information. Provide instructions on how they can exercise these rights.
            </p>

            <h2 className="text-foreground">6. Children's Privacy</h2>
            <p>
                State that your service is not intended for individuals under a certain age (e.g., 18) and that you do not knowingly collect data from children.
            </p>

            <h2 className="text-foreground">Contact Us</h2>
            <p>
              If you have any questions about this Privacy Policy, please contact us at: [Your Contact Email]
            </p>

            <div className="text-center mt-8">
              <Link href="/" className="text-primary hover:underline">
                &larr; Back to Home
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
