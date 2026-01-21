import Header from "@/components/Header";
import Footer from "@/components/Footer";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container-custom section-padding pt-32">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-8 gradient-text">
            Privacy Policy
          </h1>
          
          <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
            <p className="text-muted-foreground text-lg">
              Last updated: January 2025
            </p>

            <section className="glass-card p-6 md:p-8 rounded-2xl space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">1. Introduction</h2>
              <p className="text-muted-foreground leading-relaxed">
                Welcome to the Young Innovators Club of Dharmapala Vidyalaya, Pannipitiya. We are committed to protecting your personal information and your right to privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you visit our website or interact with our club activities.
              </p>
            </section>

            <section className="glass-card p-6 md:p-8 rounded-2xl space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">2. Information We Collect</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may collect personal information that you voluntarily provide to us when you:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Register for membership in our club</li>
                <li>Subscribe to our newsletter</li>
                <li>Fill out enrollment forms</li>
                <li>Contact us through our website</li>
                <li>Participate in club events or activities</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed">
                This information may include your name, email address, phone number, grade level, and areas of interest in STEM.
              </p>
            </section>

            <section className="glass-card p-6 md:p-8 rounded-2xl space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">3. How We Use Your Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use the information we collect to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Process membership applications and enrollments</li>
                <li>Send updates about club activities and events</li>
                <li>Respond to your inquiries and provide support</li>
                <li>Improve our website and services</li>
                <li>Communicate important announcements</li>
              </ul>
            </section>

            <section className="glass-card p-6 md:p-8 rounded-2xl space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">4. Information Sharing</h2>
              <p className="text-muted-foreground leading-relaxed">
                We do not sell, trade, or otherwise transfer your personal information to outside parties. Your information may be shared only with:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>School administration for official club purposes</li>
                <li>Club advisors and coordinators</li>
                <li>Parents/guardians of student members (where applicable)</li>
              </ul>
            </section>

            <section className="glass-card p-6 md:p-8 rounded-2xl space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">5. Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We implement appropriate security measures to protect your personal information. However, no method of transmission over the Internet or electronic storage is 100% secure, and we cannot guarantee absolute security.
              </p>
            </section>

            <section className="glass-card p-6 md:p-8 rounded-2xl space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">6. Your Rights</h2>
              <p className="text-muted-foreground leading-relaxed">
                You have the right to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Access your personal information</li>
                <li>Request correction of inaccurate data</li>
                <li>Request deletion of your data</li>
                <li>Opt-out of marketing communications</li>
                <li>Data portability (receive your data in a structured format)</li>
                <li>Object to processing of your personal data</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                To exercise any of these rights, please contact us using the details provided in Section 10.
              </p>
            </section>

            <section className="glass-card p-6 md:p-8 rounded-2xl space-y-4 border-2 border-primary/30">
              <h2 className="text-2xl font-semibold text-foreground">7. Data Retention</h2>
              <p className="text-muted-foreground leading-relaxed">
                We retain your personal data only for as long as necessary to fulfill the purposes for which it was collected. Our data retention periods are as follows:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong className="text-foreground">Active enrollments:</strong> Retained while your application is under review (typically 1-4 weeks)</li>
                <li><strong className="text-foreground">Approved applications:</strong> Retained for the duration of your active membership in the club</li>
                <li><strong className="text-foreground">Rejected applications:</strong> Deleted within 30 days of rejection notification</li>
                <li><strong className="text-foreground">Inactive members:</strong> Data retained for 12 months after last activity, then deleted</li>
                <li><strong className="text-foreground">Event participation records:</strong> Retained for 24 months for club records and certificates</li>
                <li><strong className="text-foreground">Communication preferences:</strong> Retained until you withdraw consent or request deletion</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                You may request immediate deletion of your data at any time by contacting us. We will process your request within 30 days unless we are legally required to retain certain information.
              </p>
            </section>

            <section className="glass-card p-6 md:p-8 rounded-2xl space-y-4 border-2 border-primary/30">
              <h2 className="text-2xl font-semibold text-foreground">8. Withdrawing Consent</h2>
              <p className="text-muted-foreground leading-relaxed">
                Where we rely on your consent to process your personal data, you have the right to withdraw that consent at any time. This includes:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li><strong className="text-foreground">Marketing communications:</strong> Unsubscribe via email links or contact us directly</li>
                <li><strong className="text-foreground">Newsletter subscriptions:</strong> Use the unsubscribe link in any email</li>
                <li><strong className="text-foreground">Enrollment data processing:</strong> Contact us to withdraw and delete your application</li>
                <li><strong className="text-foreground">Event photography:</strong> Opt-out of photos by informing event coordinators</li>
              </ul>
              <div className="bg-muted/30 p-4 rounded-lg mt-4">
                <p className="text-sm text-muted-foreground">
                  <strong className="text-foreground">Important:</strong> Withdrawal of consent does not affect the lawfulness of processing carried out before the withdrawal. If you withdraw consent for essential processing (like enrollment evaluation), we may not be able to continue providing certain services to you.
                </p>
              </div>
              <p className="text-muted-foreground leading-relaxed mt-4">
                <strong className="text-foreground">How to withdraw consent:</strong>
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Email us at <a href="mailto:innovators@dharmapala.edu.lk" className="text-primary hover:underline">innovators@dharmapala.edu.lk</a></li>
                <li>Use the unsubscribe link in our emails</li>
                <li>Contact the club coordinator in person</li>
              </ul>
              <p className="text-muted-foreground leading-relaxed mt-4">
                We will process your withdrawal request within 7 business days and confirm the action taken.
              </p>
            </section>

            <section className="glass-card p-6 md:p-8 rounded-2xl space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">9. Children's Privacy</h2>
              <p className="text-muted-foreground leading-relaxed">
                As a school club, we may collect information from students under 18 years of age. We require parental or guardian consent for members under 16 years old. Parents and guardians may review, request deletion of, or refuse further collection of their child's personal information by contacting us.
              </p>
            </section>

            <section className="glass-card p-6 md:p-8 rounded-2xl space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">10. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about this Privacy Policy or wish to exercise your data rights, please contact us at:
              </p>
              <div className="text-muted-foreground bg-muted/30 p-4 rounded-lg">
                <p><strong className="text-foreground">Young Innovators Club</strong></p>
                <p>Dharmapala Vidyalaya, Pannipitiya</p>
                <p>Email: <a href="mailto:innovators@dharmapala.edu.lk" className="text-primary hover:underline">innovators@dharmapala.edu.lk</a></p>
              </div>
              <p className="text-muted-foreground leading-relaxed mt-4">
                For data protection inquiries, we aim to respond within 7 business days. For formal data subject requests (access, deletion, correction), we will respond within 30 days as required by applicable data protection laws.
              </p>
            </section>

            <section className="glass-card p-6 md:p-8 rounded-2xl space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">11. Changes to This Policy</h2>
              <p className="text-muted-foreground leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page and updating the "Last updated" date. We encourage you to review this policy periodically.
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
