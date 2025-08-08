import { Metadata } from 'next';
import Link from 'next/link';
import { Shield, Lock, Eye, Database, Users, FileText, Mail, Calendar } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Privacy Policy - AnRye',
  description: 'Privacy Policy for AnRye - Your secure note-taking and learning platform',
};

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-main">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-primary mb-4">Privacy Policy</h1>
          <p className="text-lg text-gray-400">Last updated: {new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}</p>
          <div className="flex justify-center items-center gap-4 mt-4">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Shield className="h-4 w-4" />
              <span>Secure & Private</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Lock className="h-4 w-4" />
              <span>GDPR Compliant</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <Eye className="h-4 w-4" />
              <span>Transparent</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="bg-secondary rounded-lg shadow-sm p-4 mb-8">
          <h2 className="text-lg font-semibold mb-3 text-primary">Quick Navigation</h2>
          <div className="flex flex-wrap gap-2">
            {[
              { href: '#introduction', label: 'Introduction' },
              { href: '#information-collection', label: 'Information Collection' },
              { href: '#how-we-use', label: 'How We Use Information' },
              { href: '#information-sharing', label: 'Information Sharing' },
              { href: '#data-security', label: 'Data Security' },
              { href: '#your-rights', label: 'Your Rights' },
              { href: '#cookies', label: 'Cookies' },
              { href: '#third-party', label: 'Third-Party Services' },
              { href: '#children', label: 'Children\'s Privacy' },
              { href: '#changes', label: 'Changes to Policy' },
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
                Welcome to AnRye ("we," "our," or "us"). We are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our note-taking and learning platform.
              </p>
              <p className="text-gray-300 leading-relaxed mt-4">
                By using AnRye, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our service.
              </p>
            </div>
          </section>

          {/* Information Collection */}
          <section id="information-collection">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
              <Database className="h-6 w-6 text-blue-400" />
              Information We Collect
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Personal Information</h3>
                <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4">
                  <li>Email address (for account creation and authentication)</li>
                  <li>Display name or username</li>
                  <li>Profile information you choose to provide</li>
                  <li>Authentication data (when using Google OAuth)</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Usage Information</h3>
                <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4">
                  <li>Notes and content you create</li>
                  <li>Usage patterns and preferences</li>
                  <li>Device information and browser type</li>
                  <li>IP address and location data</li>
                </ul>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-300 mb-2">Technical Information</h3>
                <ul className="list-disc list-inside text-gray-400 space-y-1 ml-4">
                  <li>Log files and analytics data</li>
                  <li>Error reports and performance metrics</li>
                  <li>Cookies and similar tracking technologies</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Information */}
          <section id="how-we-use">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-400" />
              How We Use Your Information
            </h2>
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-main p-4 rounded-lg border border-gray-600">
                  <h3 className="font-semibold text-blue-400 mb-2">Service Provision</h3>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Creating and managing your account</li>
                    <li>• Providing note-taking functionality</li>
                    <li>• Enabling authentication and security</li>
                    <li>• Processing your requests and transactions</li>
                  </ul>
                </div>
                <div className="bg-main p-4 rounded-lg border border-gray-600">
                  <h3 className="font-semibold text-green-400 mb-2">Improvement & Analytics</h3>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Analyzing usage patterns</li>
                    <li>• Improving our services</li>
                    <li>• Developing new features</li>
                    <li>• Ensuring platform stability</li>
                  </ul>
                </div>
                <div className="bg-main p-4 rounded-lg border border-gray-600">
                  <h3 className="font-semibold text-purple-400 mb-2">Communication</h3>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Sending important updates</li>
                    <li>• Responding to your inquiries</li>
                    <li>• Providing customer support</li>
                    <li>• Sending security notifications</li>
                  </ul>
                </div>
                <div className="bg-main p-4 rounded-lg border border-gray-600">
                  <h3 className="font-semibold text-orange-400 mb-2">Security & Compliance</h3>
                  <ul className="text-sm text-gray-300 space-y-1">
                    <li>• Preventing fraud and abuse</li>
                    <li>• Complying with legal obligations</li>
                    <li>• Protecting user safety</li>
                    <li>• Maintaining service integrity</li>
                  </ul>
                </div>
              </div>
            </div>
          </section>

          {/* Information Sharing */}
          <section id="information-sharing">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-400" />
              Information Sharing and Disclosure
            </h2>
            <div className="space-y-4">
              <p className="text-gray-300 leading-relaxed">
                We do not sell, trade, or otherwise transfer your personal information to third parties without your consent, except in the following circumstances:
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h3 className="font-semibold text-gray-300">Service Providers</h3>
                    <p className="text-gray-400 text-sm">We may share information with trusted third-party service providers who assist us in operating our platform, such as hosting providers, analytics services, and customer support tools.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h3 className="font-semibold text-gray-300">Legal Requirements</h3>
                    <p className="text-gray-400 text-sm">We may disclose your information if required by law, court order, or government regulation, or to protect our rights, property, or safety.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h3 className="font-semibold text-gray-300">Business Transfers</h3>
                    <p className="text-gray-400 text-sm">In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the business transaction.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-2 h-2 bg-blue-400 rounded-full mt-2 flex-shrink-0"></div>
                  <div>
                    <h3 className="font-semibold text-gray-300">With Your Consent</h3>
                    <p className="text-gray-400 text-sm">We may share your information with third parties when you explicitly consent to such sharing.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Data Security */}
          <section id="data-security">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
              <Lock className="h-6 w-6 text-blue-400" />
              Data Security
            </h2>
            <div className="space-y-4">
              <p className="text-gray-300 leading-relaxed">
                We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="bg-main p-4 rounded-lg border border-gray-600">
                  <h3 className="font-semibold text-gray-300 mb-2">Technical Measures</h3>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Encryption of data in transit and at rest</li>
                    <li>• Secure authentication protocols</li>
                    <li>• Regular security audits</li>
                    <li>• Access controls and monitoring</li>
                  </ul>
                </div>
                <div className="bg-main p-4 rounded-lg border border-gray-600">
                  <h3 className="font-semibold text-gray-300 mb-2">Organizational Measures</h3>
                  <ul className="text-sm text-gray-400 space-y-1">
                    <li>• Employee training on data protection</li>
                    <li>• Regular policy reviews</li>
                    <li>• Incident response procedures</li>
                    <li>• Vendor security assessments</li>
                  </ul>
                </div>
              </div>
              <div className="bg-yellow-900/20 border-l-4 border-yellow-400 p-4">
                <p className="text-yellow-300 text-sm">
                  <strong>Note:</strong> While we strive to protect your information, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security.
                </p>
              </div>
            </div>
          </section>

          {/* Your Rights */}
          <section id="your-rights">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
              <Shield className="h-6 w-6 text-blue-400" />
              Your Rights and Choices
            </h2>
            <div className="space-y-4">
              <p className="text-gray-300 leading-relaxed">
                You have certain rights regarding your personal information. You can exercise these rights by contacting us.
              </p>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h3 className="font-semibold text-gray-300">Access</h3>
                      <p className="text-gray-400 text-sm">Request access to your personal information</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h3 className="font-semibold text-gray-300">Correction</h3>
                      <p className="text-gray-400 text-sm">Request correction of inaccurate information</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h3 className="font-semibold text-gray-300">Deletion</h3>
                      <p className="text-gray-400 text-sm">Request deletion of your personal information</p>
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h3 className="font-semibold text-gray-300">Portability</h3>
                      <p className="text-gray-400 text-sm">Request a copy of your data in a portable format</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h3 className="font-semibold text-gray-300">Restriction</h3>
                      <p className="text-gray-400 text-sm">Request restriction of processing</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-green-400 rounded-full mt-2 flex-shrink-0"></div>
                    <div>
                      <h3 className="font-semibold text-gray-300">Objection</h3>
                      <p className="text-gray-400 text-sm">Object to processing of your information</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Cookies */}
          <section id="cookies">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
              <Eye className="h-6 w-6 text-blue-400" />
              Cookies and Tracking Technologies
            </h2>
            <div className="space-y-4">
              <p className="text-gray-300 leading-relaxed">
                We use cookies and similar tracking technologies to enhance your experience on our platform.
              </p>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-300 mb-2">Types of Cookies We Use</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-blue-400 rounded-full"></span>
                      <span className="font-medium text-gray-300">Essential Cookies:</span>
                      <span className="text-gray-400 text-sm">Required for basic functionality</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-green-400 rounded-full"></span>
                      <span className="font-medium text-gray-300">Analytics Cookies:</span>
                      <span className="text-gray-400 text-sm">Help us understand usage patterns</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-purple-400 rounded-full"></span>
                      <span className="font-medium text-gray-300">Preference Cookies:</span>
                      <span className="text-gray-400 text-sm">Remember your settings and preferences</span>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-300 mb-2">Managing Cookies</h3>
                  <p className="text-gray-400 text-sm">
                    You can control and manage cookies through your browser settings. However, disabling certain cookies may affect the functionality of our platform.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Third-Party Services */}
          <section id="third-party">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-400" />
              Third-Party Services
            </h2>
            <div className="space-y-4">
              <p className="text-gray-300 leading-relaxed">
                Our platform may integrate with third-party services. These services have their own privacy policies, and we encourage you to review them.
              </p>
              <div className="space-y-3">
                <div className="bg-main p-4 rounded-lg border border-gray-600">
                  <h3 className="font-semibold text-gray-300 mb-2">Google Services</h3>
                  <p className="text-gray-400 text-sm mb-2">We use Google OAuth for authentication. Google's privacy policy applies to the data they collect.</p>
                  <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm">
                    Google Privacy Policy →
                  </a>
                </div>
                <div className="bg-main p-4 rounded-lg border border-gray-600">
                  <h3 className="font-semibold text-gray-300 mb-2">Analytics Services</h3>
                  <p className="text-gray-400 text-sm">We may use analytics services to understand how our platform is used and improve our services.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Children's Privacy */}
          <section id="children">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-400" />
              Children's Privacy
            </h2>
            <div className="space-y-4">
              <p className="text-gray-300 leading-relaxed">
                Our platform is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13.
              </p>
              <div className="bg-blue-900/20 border-l-4 border-blue-400 p-4">
                <p className="text-blue-300 text-sm">
                  If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately. We will take steps to remove such information from our records.
                </p>
              </div>
            </div>
          </section>

          {/* Changes to Policy */}
          <section id="changes">
            <h2 className="text-2xl font-bold text-primary mb-4 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-blue-400" />
              Changes to This Privacy Policy
            </h2>
            <div className="space-y-4">
              <p className="text-gray-300 leading-relaxed">
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last updated" date.
              </p>
              <div className="bg-yellow-900/20 border-l-4 border-yellow-400 p-4">
                <p className="text-yellow-300 text-sm">
                  <strong>Important:</strong> Your continued use of our platform after any changes to this Privacy Policy constitutes acceptance of the updated policy.
                </p>
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
                If you have any questions about this Privacy Policy or our data practices, please contact us:
              </p>
              <div className="bg-main p-6 rounded-lg border border-gray-600">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="font-semibold text-gray-300">Email</p>
                      <p className="text-gray-400">soranryenyn.2208@gmail.com</p>
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
                  <strong>Data Protection Officer:</strong> If you have concerns about data protection, you can also contact our Data Protection Officer at dpo@anrye.com
                </p>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div className="border-t border-gray-600 pt-8 mt-8">
            <div className="text-center text-gray-400">
              <p className="mb-2">Thank you for trusting AnRye with your information.</p>
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