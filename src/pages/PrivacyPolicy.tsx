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
              </ul>
            </section>

            <section className="glass-card p-6 md:p-8 rounded-2xl space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">7. Contact Us</h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have any questions about this Privacy Policy, please contact us at:
              </p>
              <div className="text-muted-foreground">
                <p><strong className="text-foreground">Young Innovators Club</strong></p>
                <p>Dharmapala Vidyalaya, Pannipitiya</p>
                <p>Email: innovators@dharmapala.edu.lk</p>
              </div>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PrivacyPolicy;
