export const COMPANY = {
  name: `RWA Launchpad`,
  //legalName: `RWA Experts Ltd`,
  domain: `rwalaunchpad.com`,
  founded: 2024,
};

export const CONTACT = {
  // General
  general: `contact@${COMPANY.domain}`,
  support: `support@${COMPANY.domain}`,
  info: `info@${COMPANY.domain}`,
  
  // Departments
  legal: `legal@${COMPANY.domain}`,
  compliance: `compliance@${COMPANY.domain}`,
  privacy: `privacy@${COMPANY.domain}`,
  security: `security@${COMPANY.domain}`,
  securityphone: `+1-XXX-XXX-XXXX`,
  cto: `cto@${COMPANY.domain}`,
  ctophone: `+1-XXX-XXX-XXXX`,
  ceo: `ceo@${COMPANY.domain}`,
  ceophone: `+1-XXX-XXX-XXXX`,
  careers: `careers@${COMPANY.domain}`,
  
  // Business
  partners: `partners@${COMPANY.domain}`,
  api: `api@r${COMPANY.domain}`,
  //enterprise: `enterprise@rwalaunchpad.com`,
  
  // KYC
  //kyc: `kyc@rwalaunchpad.com`,
};

export const SOCIAL = {
  twitter: `https://twitter.com/rwalaunchpad`,
  discord: `https://discord.gg/rwalaunchpad`,
  telegram: `https://t.me/rwalaunchpad`,
  linkedin: `https://linkedin.com/company/rwalaunchpad`,
  github: `https://github.com/rwalaunchpad`,
  //medium: `https://medium.com/@rwalaunchpad`,
};

export const LINKS = {
  // App
  app: `https://app.${COMPANY.domain}`,
  docs: `https://docs.${COMPANY.domain}`,
  api: `https://api.${COMPANY.domain}`,
};

// Helper to generate mailto links
export const mailto = (email: keyof typeof CONTACT) => `mailto:${CONTACT[email]}`;

// Helper to get full URL
export const getFullUrl = (path: string) => `https://${COMPANY.domain}${path}`;
