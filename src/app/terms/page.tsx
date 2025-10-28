
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';

export default function TermsOfServicePage() {
  return (
    <div className="bg-background min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="text-3xl font-headline text-gradient">Terms of Service</CardTitle>
            <p className="text-muted-foreground">Last Updated: {new Date().toLocaleDateString()}</p>
          </CardHeader>
          <CardContent className="prose prose-invert max-w-none text-muted-foreground">
            <p>
              Welcome to MyOvae! This is a placeholder for your Terms of Service. You should consult with a legal professional to draft a document that is appropriate for your specific application and jurisdiction.
            </p>

            <h2 className="text-foreground">1. Acceptance of Terms</h2>
            <p>
              By accessing or using the MyOvae application ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you disagree with any part of the terms, then you may not access the Service.
            </p>

            <h2 className="text-foreground">2. Medical Disclaimer</h2>
            <p>
              <strong>MyOvae is not a medical device and does not provide medical advice.</strong> The information and AI-generated content provided by the Service are for informational purposes only. It is not a substitute for professional medical advice, diagnosis, or treatment. Always seek the advice of your physician or other qualified health provider with any questions you may have regarding a medical condition.
            </p>

            <h2 className="text-foreground">3. User Accounts</h2>
            <p>
              When you create an account with us, you must provide information that is accurate, complete, and current at all times. You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.
            </p>

            <h2 className="text-foreground">4. User-Generated Content</h2>
            <p>
              You are responsible for the content that you post to the Service, including its legality, reliability, and appropriateness. We reserve the right to remove content that we determine to be unlawful, offensive, or otherwise in violation of our community guidelines.
            </p>

            <h2 className="text-foreground">5. Prohibited Uses</h2>
            <p>
              You agree not to use the Service:
            </p>
            <ul>
              <li>In any way that violates any applicable national or international law or regulation.</li>
              <li>For the purpose of exploiting, harming, or attempting to exploit or harm minors in any way.</li>
              <li>To transmit, or procure the sending of, any advertising or promotional material, including any "junk mail", "chain letter," "spam," or any other similar solicitation.</li>
            </ul>

            <h2 className="text-foreground">6. Termination</h2>
            <p>
              We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms.
            </p>
            
            <h2 className="text-foreground">7. Limitation of Liability</h2>
            <p>
                In no event shall MyOvae, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
            </p>

            <h2 className="text-foreground">Contact Us</h2>
            <p>
              If you have any questions about these Terms, please contact us at: [Your Contact Email]
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
