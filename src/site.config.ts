/**
 * Brand + owner details. Everything the museum prints on its walls comes from here.
 */
export const site = {
  name: 'Felix M. Pareja',
  shortName: 'FELIX PAREJA',
  role: 'Senior Full-Stack Developer',
  museumName: 'The Neon Archive',
  tagline: 'A walk-through museum of the systems, apps and experiments I have built.',
  about: [
    'I design and build full-stack products end to end: business systems that replace legacy software, local-first field apps, and AI tools that run where the data lives.',
    'Every room in this museum holds up to five works. Walk in, take a seat, and look closer.',
  ],
  /** Absolute URL of the deployed site (used for OG images, sitemap, share links). */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000',
  /** TODO: fill in before going live. Empty values are hidden. */
  contact: { email: '', github: '', linkedin: '' },
} as const
