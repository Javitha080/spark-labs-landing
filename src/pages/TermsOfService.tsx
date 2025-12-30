import Header from "@/components/Header";
import Footer from "@/components/Footer";

const TermsOfService = () => {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container-custom section-padding pt-32">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl md:text-5xl font-bold mb-8 gradient-text">
            Terms of Service
          </h1>
          
          <div className="prose prose-lg dark:prose-invert max-w-none space-y-8">
            <p className="text-muted-foreground text-lg">
              Last updated: January 2025
            </p>

            <section className="glass-card p-6 md:p-8 rounded-2xl space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">1. Acceptance of Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing and using the Young Innovators Club website and services, you accept and agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <section className="glass-card p-6 md:p-8 rounded-2xl space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">2. Club Membership</h2>
              <p className="text-muted-foreground leading-relaxed">
                Membership in the Young Innovators Club is open to students of Dharmapala Vidyalaya, Pannipitiya. Members agree to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Actively participate in club activities and projects</li>
                <li>Respect fellow members, advisors, and school property</li>
                <li>Follow school rules and guidelines</li>
                <li>Maintain academic standards</li>
                <li>Contribute positively to the club's mission</li>
              </ul>
            </section>

            <section className="glass-card p-6 md:p-8 rounded-2xl space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">3. Website Use</h2>
              <p className="text-muted-foreground leading-relaxed">
                When using our website, you agree to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Provide accurate and truthful information</li>
                <li>Not attempt to gain unauthorized access to any part of the website</li>
                <li>Not use the website for any unlawful purpose</li>
                <li>Not upload or transmit harmful content or code</li>
                <li>Respect intellectual property rights</li>
              </ul>
            </section>

            <section className="glass-card p-6 md:p-8 rounded-2xl space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">4. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                All content on this website, including text, graphics, logos, images, and software, is the property of the Young Innovators Club or Dharmapala Vidyalaya and is protected by intellectual property laws. You may not reproduce, distribute, or create derivative works without prior written consent.
              </p>
            </section>

            <section className="glass-card p-6 md:p-8 rounded-2xl space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">5. Project Submissions</h2>
              <p className="text-muted-foreground leading-relaxed">
                When submitting projects or content to the club:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>You retain ownership of your original work</li>
                <li>You grant the club permission to display and promote your work</li>
                <li>You confirm the work is your own or properly attributed</li>
                <li>Projects must align with the club's educational mission</li>
              </ul>
            </section>

            <section className="glass-card p-6 md:p-8 rounded-2xl space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">6. Events and Activities</h2>
              <p className="text-muted-foreground leading-relaxed">
                Participation in club events and activities is subject to:
              </p>
              <ul className="list-disc list-inside text-muted-foreground space-y-2 ml-4">
                <li>Parental/guardian consent where required</li>
                <li>Compliance with safety guidelines</li>
                <li>Adherence to event-specific rules</li>
                <li>Appropriate conduct and behavior</li>
              </ul>
            </section>

            <section className="glass-card p-6 md:p-8 rounded-2xl space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">7. Disclaimer</h2>
              <p className="text-muted-foreground leading-relaxed">
                The website and services are provided "as is" without warranties of any kind. We do not guarantee uninterrupted access or error-free operation. We are not liable for any damages arising from the use of our website or services.
              </p>
            </section>

            <section className="glass-card p-6 md:p-8 rounded-2xl space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">8. Changes to Terms</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these Terms of Service at any time. Changes will be posted on this page with an updated revision date. Continued use of our services after changes constitutes acceptance of the new terms.
              </p>
            </section>

            <section className="glass-card p-6 md:p-8 rounded-2xl space-y-4">
              <h2 className="text-2xl font-semibold text-foreground">9. Contact Information</h2>
              <p className="text-muted-foreground leading-relaxed">
                For questions about these Terms of Service, contact us at:
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

export default TermsOfService;
