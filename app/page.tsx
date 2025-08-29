import Link from "next/link";
import { Shield, FileText, Users, BarChart3, CheckCircle, Globe } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="px-6 py-4 flex justify-between items-center bg-white border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">P</span>
          </div>
          <span className="text-xl font-bold text-gray-900">Peach</span>
        </div>
        <div className="flex space-x-4">
          <Link
            href="/auth/login"
            className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
          >
            Sign In
          </Link>
          <Link
            href="/auth/register"
            className="bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors duration-200"
          >
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="px-6 py-20 text-center bg-white">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Streamline Your
            <span className="text-indigo-600"> EAC Management</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Comprehensive environmental assessment certificate management platform. 
            Track compliance, manage documents, and ensure regulatory adherence with ease.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/auth/register"
              className="bg-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition-colors duration-200 shadow-sm hover:shadow-md"
            >
              Start Free Trial
            </Link>
            <Link
              href="/dashboard"
              className="border-2 border-gray-300 text-gray-700 px-8 py-4 rounded-lg text-lg font-semibold hover:border-gray-400 hover:bg-gray-50 transition-colors duration-200"
            >
              View Demo
            </Link>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="px-6 py-20 bg-gray-50">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need for EAC Compliance
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Our platform provides comprehensive tools to manage environmental assessment certificates 
              from application to renewal.
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all duration-200">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <FileText className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Document Management</h3>
              <p className="text-gray-600">
                Centralized storage and organization of all EAC-related documents, 
                certificates, and compliance materials.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all duration-200">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <CheckCircle className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Compliance Tracking</h3>
              <p className="text-gray-600">
                Automated alerts and monitoring to ensure your environmental 
                certificates remain compliant and up-to-date.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all duration-200">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                <BarChart3 className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Analytics & Reporting</h3>
              <p className="text-gray-600">
                Comprehensive insights into your environmental compliance status 
                with detailed reporting and analytics.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all duration-200">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-orange-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Team Collaboration</h3>
              <p className="text-gray-600">
                Multi-user access with role-based permissions for teams 
                working on environmental compliance projects.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all duration-200">
              <div className="w-12 h-12 bg-teal-100 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Secure & Compliant</h3>
              <p className="text-gray-600">
                Enterprise-grade security with audit trails and compliance 
                with environmental data protection standards.
              </p>
            </div>

            <div className="p-6 rounded-xl border border-gray-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all duration-200">
              <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-indigo-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Global Standards</h3>
              <p className="text-gray-600">
                Support for international environmental assessment frameworks 
                and regulatory requirements across jurisdictions.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="px-6 py-20 bg-indigo-600">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Transform Your EAC Management?
          </h2>
          <p className="text-xl text-indigo-100 mb-8">
            Join organizations worldwide who trust Peach for their environmental compliance needs.
          </p>
          <Link
            href="/auth/register"
            className="bg-white text-indigo-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors duration-200 shadow-sm hover:shadow-md inline-block"
          >
            Get Started Today
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="px-6 py-12 bg-gray-900 text-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">P</span>
              </div>
              <span className="text-xl font-bold">Peach</span>
            </div>
            <div className="text-gray-400 text-sm">
              © 2024 Peach. All rights reserved. Environmental compliance made simple.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

