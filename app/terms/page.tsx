import { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Lock, FileText, Users, Mail, Calendar, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Terms of Service - AnRye',
  description: 'Terms of Service for AnRye - Your secure note-taking and learning platform',
};

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-main">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-primary mb-4">Terms of Service</h1>
          <p className="text-lg text-gray-300">Last updated: {new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
          <div className="flex justify-center items-center gap-4 mt-4">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Shield className="h-4 w-4" />
              <span>Legal Protection</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Lock className="h-4 w-4" />
              <span>User Rights</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <FileText className="h-4 w-4" />
              <span>Clear Terms</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="bg-secondary rounded-lg shadow-sm p-4 mb-8">
          <h2 className="text-lg font-semibold mb-3 text-primary">Quick Navigation</h2>
          <div className="flex flex-wrap gap-2">
            {[
              { href: '#introduction', label: 'Introduction' },
              { href: '#acceptance', label: 'Acceptance' },
              { href: '#services', label: 'Services' },
              { href: '#user-accounts', label: 'User Accounts' },
              { href: '#acceptable-use', label: 'Acceptable Use' },
              { href: '#intellectual-property', label: 'Intellectual Property' },
              { href: '#privacy', label: 'Privacy' },
              { href: '#disclaimers', label: 'Disclaimers' },
              { href: '#limitation-liability', label: 'Limitation of Liability' },
              { href: '#termination', label: 'Termination' },
              { href: '#changes', label: 'Changes to Terms' },
              { href: '#contact', label: 'Contact Us' }
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="px-3 py-1 bg-main text-primary rounded-full text-sm hover:bg-gray-700 transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>
        </nav>

        {/* Content */}
        <div className="bg-secondary rounded-lg shadow-sm p-8 space-y-8">
          
          {/* Introduction */}
          <section id="introduction">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-400" />
              Introduction
            </h2>
            <div className="prose prose-gray max-w-none">
              <p className="text-gray-300 leading-relaxed">
                Welcome to AnRye ("we," "our," or "us"). These Terms of Service ("Terms") govern your use of our note-taking and learning platform, including all features, content, and services available through our website and applications.
              </p>
              <p className="text-gray-300 leading-relaxed mt-4">
                By accessing or using AnRye, you agree to be bound by these Terms. If you do not agree to these Terms, please do not use our services.
              </p>
            </div>
          </section>

          {/* Acceptance */}
          <section id="acceptance">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
              <CheckCircle className="h-6 w-6 text-green-400" />
              Acceptance of Terms
            </h2>
            <div className="space-y-4">
              <p className="text-gray-300 leading-relaxed">
                By using our services, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service.
              </p>
              <div className="bg-main p-4 rounded-lg border border-gray-600">
                <h3 className="font-semibold text-gray-300 mb-2">Key Points:</h3>
                <ul className="text-gray-400 space-y-1">
                  <li>• You must be at least 13 years old to use our services</li>
                  <li>• You are responsible for maintaining the security of your account</li>
                  <li>• You agree to use our services only for lawful purposes</li>
                  <li>• We reserve the right to modify these terms at any time</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Services */}
          <section id="services">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-400" />
              Description of Services
            </h2>
            <div className="space-y-4">
              <p className="text-gray-300 leading-relaxed">
                AnRye provides a comprehensive note-taking and learning platform with the following features:
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-main p-4 rounded-lg border border-gray-600">
                  <h3 className="font-semibold text-blue-400 mb-2">Core Features</h3>
                  <ul className="text-gray-300 space-y-1">
                    <li>• Rich text note creation and editing</li>
                    <li>• Markdown support with syntax highlighting</li>
                    <li>• Code execution and testing</li>
                    <li>• File organization and management</li>
                  </ul>
                </div>
                <div className="bg-main p-4 rounded-lg border border-gray-600">
                  <h3 className="font-semibold text-green-400 mb-2">Advanced Features</h3>
                  <ul className="text-gray-300 space-y-1">
                    <li>• Real-time collaboration</li>
                    <li>• Cloud synchronization</li>
                    <li>• Export and sharing capabilities</li>
                    <li>• Custom themes and preferences</li>
                  </ul>
                </div>
              </div>
              <div className="bg-yellow-900/20 border-l-4 border-yellow-400 p-4">
                <p className="text-yellow-300 text-sm">
                  <strong>Note:</strong> We may add, modify, or discontinue features at any time. We will notify users of significant changes when possible.
                </p>
              </div>
            </div>
          </section>

          {/* User Accounts */}
          <section id="user-accounts">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-400" />
              User Accounts and Registration
            </h2>
            <div className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">Account Creation</h3>
                  <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4">
                    <li>You must provide accurate and complete information when creating an account</li>
                    <li>You are responsible for maintaining the confidentiality of your login credentials</li>
                    <li>You must notify us immediately of any unauthorized use of your account</li>
                    <li>One account per person is allowed</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">Account Security</h3>
                  <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4">
                    <li>You are responsible for all activities that occur under your account</li>
                    <li>We recommend using strong, unique passwords</li>
                    <li>Enable two-factor authentication when available</li>
                    <li>Never share your login credentials with others</li>
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">Account Termination</h3>
                  <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4">
                    <li>You may delete your account at any time through your account settings</li>
                    <li>We may suspend or terminate accounts that violate these Terms</li>
                    <li>Account deletion will permanently remove your data</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Acceptable Use */}
          <section id="acceptable-use">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-400" />
              Acceptable Use Policy
            </h2>
            <div className="space-y-4">
              <p className="text-gray-300 leading-relaxed">
                You agree to use our services only for lawful purposes and in accordance with these Terms.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-green-900/20 p-4 rounded-lg border border-green-400">
                  <h3 className="font-semibold text-green-400 mb-2 flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Permitted Uses
                  </h3>
                  <ul className="text-gray-300 space-y-1 text-sm">
                    <li>• Creating and organizing personal notes</li>
                    <li>• Educational and learning purposes</li>
                    <li>• Professional documentation</li>
                    <li>• Collaborative projects with consent</li>
                    <li>• Sharing content with proper attribution</li>
                  </ul>
                </div>
                
                <div className="bg-red-900/20 p-4 rounded-lg border border-red-400">
                  <h3 className="font-semibold text-red-400 mb-2 flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    Prohibited Uses
                  </h3>
                  <ul className="text-gray-300 space-y-1 text-sm">
                    <li>• Illegal or harmful content</li>
                    <li>• Harassment or abuse of others</li>
                    <li>• Spam or unsolicited messages</li>
                    <li>• Attempting to hack or disrupt services</li>
                    <li>• Violating intellectual property rights</li>
                  </ul>
                </div>
              </div>
              
              <div className="bg-main p-4 rounded-lg border border-gray-600">
                <h3 className="font-semibold text-gray-300 mb-2">Content Guidelines</h3>
                <p className="text-gray-400 text-sm">
                  You retain ownership of your content, but you grant us a license to store and display it as part of our services. You are responsible for ensuring your content does not violate any laws or third-party rights.
                </p>
              </div>
            </div>
          </section>

          {/* Intellectual Property */}
          <section id="intellectual-property">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
              <FileText className="h-6 w-6 text-blue-400" />
              Intellectual Property Rights
            </h2>
            <div className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">Your Content</h3>
                  <p className="text-gray-400 leading-relaxed">
                    You retain all rights to your original content. By using our services, you grant us a limited, non-exclusive license to store, display, and process your content solely for the purpose of providing our services.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">Our Content</h3>
                  <p className="text-gray-400 leading-relaxed">
                    The AnRye platform, including its design, code, and original content, is protected by copyright, trademark, and other intellectual property laws. You may not copy, modify, or distribute our proprietary content without permission.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">Third-Party Content</h3>
                  <p className="text-gray-400 leading-relaxed">
                    Our services may include third-party content, tools, or libraries. Such content is subject to their respective licenses and terms of use.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Privacy */}
          <section id="privacy">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
              <Lock className="h-6 w-6 text-blue-400" />
              Privacy and Data Protection
            </h2>
            <div className="space-y-4">
              <p className="text-gray-300 leading-relaxed">
                Your privacy is important to us. Our collection and use of personal information is governed by our Privacy Policy.
              </p>
              <div className="bg-main p-4 rounded-lg border border-gray-600">
                <h3 className="font-semibold text-gray-300 mb-2">Data Protection</h3>
                <ul className="text-gray-400 space-y-1">
                  <li>• We implement appropriate security measures to protect your data</li>
                  <li>• We do not sell your personal information to third parties</li>
                  <li>• You have rights to access, correct, and delete your data</li>
                  <li>• We comply with applicable data protection laws</li>
                </ul>
              </div>
              <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-400">
                <p className="text-blue-300 text-sm">
                  <strong>Privacy Policy:</strong> For detailed information about how we handle your data, please read our{' '}
                  <Link href="/privacy" className="underline hover:text-blue-200">
                    Privacy Policy
                  </Link>.
                </p>
              </div>
            </div>
          </section>

          {/* Disclaimers */}
          <section id="disclaimers">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
              <AlertTriangle className="h-6 w-6 text-yellow-400" />
              Disclaimers
            </h2>
            <div className="space-y-4">
              <div className="space-y-4">
                <div className="bg-main p-4 rounded-lg border border-gray-600">
                  <h3 className="font-semibold text-gray-300 mb-2">Service Availability</h3>
                  <p className="text-gray-400 text-sm">
                    We strive to provide reliable service, but we cannot guarantee uninterrupted access. Our services are provided "as is" and "as available."
                  </p>
                </div>
                <div className="bg-main p-4 rounded-lg border border-gray-600">
                  <h3 className="font-semibold text-gray-300 mb-2">Content Accuracy</h3>
                  <p className="text-gray-400 text-sm">
                    We are not responsible for the accuracy, completeness, or usefulness of any content created by users. Users are responsible for their own content.
                  </p>
                </div>
                <div className="bg-main p-4 rounded-lg border border-gray-600">
                  <h3 className="font-semibold text-gray-300 mb-2">Third-Party Services</h3>
                  <p className="text-gray-400 text-sm">
                    Our services may integrate with third-party services. We are not responsible for the availability, accuracy, or content of third-party services.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Limitation of Liability */}
          <section id="limitation-liability">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-400" />
              Limitation of Liability
            </h2>
            <div className="space-y-4">
              <p className="text-gray-300 leading-relaxed">
                To the maximum extent permitted by law, AnRye shall not be liable for any indirect, incidental, special, consequential, or punitive damages.
              </p>
              <div className="bg-main p-4 rounded-lg border border-gray-600">
                <h3 className="font-semibold text-gray-300 mb-2">Liability Limits</h3>
                <ul className="text-gray-400 space-y-1">
                  <li>• Our total liability shall not exceed the amount you paid for our services</li>
                  <li>• We are not liable for data loss or corruption</li>
                  <li>• We are not liable for third-party actions or content</li>
                  <li>• Some jurisdictions do not allow liability limitations</li>
                </ul>
              </div>
              <div className="bg-yellow-900/20 border-l-4 border-yellow-400 p-4">
                <p className="text-yellow-300 text-sm">
                  <strong>Important:</strong> These limitations apply to the fullest extent permitted by applicable law. Some jurisdictions may not allow certain limitations.
                </p>
              </div>
            </div>
          </section>

          {/* Termination */}
          <section id="termination">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
              <XCircle className="h-6 w-6 text-red-400" />
              Termination
            </h2>
            <div className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">Your Rights</h3>
                  <p className="text-gray-400 leading-relaxed">
                    You may terminate your account at any time by deleting it through your account settings or contacting us.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">Our Rights</h3>
                  <p className="text-gray-400 leading-relaxed">
                    We may terminate or suspend your access to our services immediately, without prior notice, for any reason, including violation of these Terms.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">Effect of Termination</h3>
                  <p className="text-gray-400 leading-relaxed">
                    Upon termination, your right to use our services will cease immediately. We may delete your account and data, though we may retain certain information as required by law.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Changes to Terms */}
          <section id="changes">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-blue-400" />
              Changes to Terms
            </h2>
            <div className="space-y-4">
              <p className="text-gray-300 leading-relaxed">
                We reserve the right to modify these Terms at any time. We will notify users of significant changes by posting the updated Terms on our website and updating the "Last updated" date.
              </p>
              <div className="bg-yellow-900/20 border-l-4 border-yellow-400 p-4">
                <p className="text-yellow-300 text-sm">
                  <strong>Important:</strong> Your continued use of our services after any changes to these Terms constitutes acceptance of the updated terms.
                </p>
              </div>
              <div className="bg-main p-4 rounded-lg border border-gray-600">
                <h3 className="font-semibold text-gray-300 mb-2">Notification Methods</h3>
                <ul className="text-gray-400 space-y-1">
                  <li>• Email notifications for significant changes</li>
                  <li>• In-app notifications when possible</li>
                  <li>• Updated terms posted on our website</li>
                  <li>• "Last updated" date clearly displayed</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Contact Us */}
          <section id="contact">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
              <Mail className="h-6 w-6 text-blue-400" />
              Contact Us
            </h2>
            <div className="space-y-4">
              <p className="text-gray-300 leading-relaxed">
                If you have any questions about these Terms of Service, please contact us:
              </p>
              <div className="bg-main p-6 rounded-lg border border-gray-600">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-semibold text-gray-300">Email</p>
                      <p className="text-gray-400">
                        soranryenyn.2208@gmail.com
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-semibold text-gray-300">Response Time</p>
                      <p className="text-gray-400">We aim to respond within 48 hours</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="bg-blue-900/20 p-4 rounded-lg border border-blue-400">
                <p className="text-blue-300 text-sm">
                  <strong>Legal Inquiries:</strong> For legal matters or copyright concerns, please contact our legal team at legal@anrye.com
                </p>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="border-t border-gray-600 pt-8 mt-8">
            <div className="text-center text-gray-400">
              <p className="mb-2">Thank you for using AnRye. We appreciate your trust in our platform.</p>
              <Link href="/" className="text-blue-400 hover:text-blue-300 font-medium">
                ← Back to AnRye
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 