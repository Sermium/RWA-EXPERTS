// src/app/admin/components/AdminDocs.tsx
'use client';

import { useState, ComponentType, Suspense } from 'react';
import { 
  Search, Shield, ChevronRight, Rocket, 
  AlertTriangle, Lock, Code, ExternalLink, Loader2
} from 'lucide-react';
import dynamic from 'next/dynamic';

// Define doc sections matching your folder structure
const docSections = [
  { 
    id: 'compliance', 
    title: 'Compliance', 
    icon: Shield, 
    color: 'green',
    description: 'Regulatory compliance and legal requirements'
  },
  { 
    id: 'deployment', 
    title: 'Deployment', 
    icon: Rocket, 
    color: 'blue',
    description: 'Deployment guides and infrastructure setup'
  },
  { 
    id: 'incident-response', 
    title: 'Incident Response', 
    icon: AlertTriangle, 
    color: 'red',
    description: 'Handling security incidents and emergencies'
  },
  { 
    id: 'integration', 
    title: 'Integration', 
    icon: Code, 
    color: 'purple',
    description: 'API integration and third-party services'
  },
  { 
    id: 'security', 
    title: 'Security', 
    icon: Lock, 
    color: 'orange',
    description: 'Security best practices and configurations'
  },
];

function DocLoader() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
      <span className="ml-3 text-gray-400">Loading documentation...</span>
    </div>
  );
}

// Dynamically import doc components
const ComplianceDocs = dynamic(
  () => import('@/app/admin/docs/compliance/page').then(mod => ({ default: mod.default })),
  { loading: () => <DocLoader />, ssr: false }
);

const DeploymentDocs = dynamic(
  () => import('@/app/admin/docs/deployment/page').then(mod => ({ default: mod.default })),
  { loading: () => <DocLoader />, ssr: false }
);

const IncidentResponseDocs = dynamic(
  () => import('@/app/admin/docs/incident-response/page').then(mod => ({ default: mod.default })),
  { loading: () => <DocLoader />, ssr: false }
);

const IntegrationDocs = dynamic(
  () => import('@/app/admin/docs/integration/page').then(mod => ({ default: mod.default })),
  { loading: () => <DocLoader />, ssr: false }
);

const SecurityDocs = dynamic(
  () => import('@/app/admin/docs/security/page').then(mod => ({ default: mod.default })),
  { loading: () => <DocLoader />, ssr: false }
);

const docComponents: Record<string, ComponentType> = {
  'compliance': ComplianceDocs,
  'deployment': DeploymentDocs,
  'incident-response': IncidentResponseDocs,
  'integration': IntegrationDocs,
  'security': SecurityDocs,
};

export default function AdminDocs() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);

  const filteredSections = docSections.filter(section =>
    section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    section.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const currentSection = docSections.find(s => s.id === activeSection);
  const ActiveDocComponent = activeSection ? docComponents[activeSection] : null;

  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500/20 text-blue-400',
    green: 'bg-green-500/20 text-green-400',
    purple: 'bg-purple-500/20 text-purple-400',
    orange: 'bg-orange-500/20 text-orange-400',
    red: 'bg-red-500/20 text-red-400',
    gray: 'bg-gray-500/20 text-gray-400',
    cyan: 'bg-cyan-500/20 text-cyan-400',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white">Documentation</h2>
          <p className="text-gray-400 text-sm">Everything you need to manage the platform</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search docs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 text-sm w-48 sm:w-64"
            />
          </div>
          <a
            href="https://github.com/Sermium/RWA-EXPERTS"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-gray-400 hover:text-white hover:border-gray-600 transition-colors text-sm"
          >
            <ExternalLink className="w-4 h-4" />
            <span className="hidden sm:inline">GitHub</span>
          </a>
        </div>
      </div>

      {/* Breadcrumb */}
      {activeSection && (
        <div className="flex items-center gap-2 text-sm">
          <button
            onClick={() => setActiveSection(null)}
            className="text-gray-400 hover:text-white transition-colors flex items-center gap-1"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back to All Sections
          </button>
          <span className="text-gray-600">|</span>
          <span className="text-white">{currentSection?.title}</span>
        </div>
      )}

      {/* Content */}
      {!activeSection ? (
        // Section Grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className="p-5 bg-gray-800/50 border border-gray-700 rounded-xl text-left hover:border-gray-600 hover:bg-gray-800 transition-all group"
              >
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${colorClasses[section.color]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-white group-hover:text-blue-400 transition-colors mb-1">
                      {section.title}
                    </h3>
                    <p className="text-sm text-gray-500">{section.description}</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-600 group-hover:text-blue-400" />
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        // Doc Content with scroll
        <div className="bg-gray-800/30 border border-gray-700 rounded-xl p-6 max-h-[calc(100vh-300px)] overflow-y-auto">
          <Suspense fallback={<DocLoader />}>
            {ActiveDocComponent && <ActiveDocComponent />}
          </Suspense>
        </div>
      )}
    </div>
  );
}
