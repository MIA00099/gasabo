import { Router } from 'express';
import { prisma } from '../config/db.js';
import { requireAuth, requirePermission } from '../middleware/auth.js';
import { logAudit } from '../utils/audit.js';

export const realEstateRouter = Router();

const DEFAULTS: Record<string, unknown> = {
  HERO: {
    title: "Building Rwanda's Next Generation Architectural Landmarks",
    subtitle:
      'Gasabo Real Estate leads luxury residential developments, grade-A commercial plazas, land surveying, and property management in Kigali, Musanze, and Rubavu.',
    bgImage: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80',
  },
  ABOUT: {
    heading: 'Rwanda-Rooted, Investor-Trusted',
    text: 'Gasabo Real Estate has delivered landmark residential and commercial developments across Kigali, Musanze, and Rubavu for over a decade, combining international construction standards with deep local market expertise.',
    stats: [
      { value: '12+', label: 'Years in Operation' },
      { value: '30+', label: 'Completed Developments' },
      { value: '3', label: 'Active Districts' },
      { value: '500+', label: 'Happy Property Owners' },
    ],
  },
  SERVICES: [
    { icon: '🏗️', title: 'Residential Development', description: 'Luxury villas, eco-estates, and gated residential communities built to international standards.' },
    { icon: '🏢', title: 'Commercial Property', description: 'Grade-A office towers and retail plazas designed for Kigali’s growing business sector.' },
    { icon: '📐', title: 'Land Surveying', description: 'Certified land surveying, titling support, and due-diligence services across all 30 districts.' },
    { icon: '🔑', title: 'Property Management', description: 'Full-service leasing, maintenance, and tenant management for owners and investors.' },
  ],
  GALLERY: [
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
  ],
  CONTACT: {
    address: 'Gasabo Tower, 4th Floor, KG 7 Ave, Kacyiru, Gasabo District, Kigali, Rwanda',
    phone: '+250 788 100 200',
    email: 'info@gasaborealestate.rw',
  },
};

const DEFAULT_PROJECTS = [
  {
    id: 'proj_1',
    title: 'Gasabo Green Heights Villa Estate',
    category: 'Residential',
    district: 'Gasabo (Gacuriro)',
    units: '24 Luxury Solar Eco-Villas',
    status: 'Completed',
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?auto=format&fit=crop&w=1000&q=80',
    description: 'Solar-powered 4-bedroom smart eco-villas featuring panoramic Kigali valley views, private pools, and 24/7 guarded security.',
  },
  {
    id: 'proj_2',
    title: 'Kigali Central Commercial Plaza',
    category: 'Commercial',
    district: 'Nyarugenge (CBD)',
    units: '14 Floors Grade-A Offices',
    status: 'Under Construction (85%)',
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1000&q=80',
    description: 'State-of-the-art office tower with double-glazed glass facade, high-speed fiber optics, 250-car parking garage, and rooftop garden.',
  },
];

async function getSection<T>(key: string, fallback: T): Promise<T> {
  const row = await prisma.realEstateContent.findUnique({ where: { sectionKey: key } });
  if (!row) return fallback;
  try {
    return JSON.parse(row.content) as T;
  } catch {
    return fallback;
  }
}

async function setSection(key: string, content: unknown) {
  return prisma.realEstateContent.upsert({
    where: { sectionKey: key },
    update: { content: JSON.stringify(content) },
    create: { sectionKey: key, content: JSON.stringify(content) },
  });
}

// GET /api/realestate - aggregated public content for the whole Gasabo Real Estate page
realEstateRouter.get('/', async (_req, res) => {
  const [hero, about, services, gallery, contact, projects] = await Promise.all([
    getSection('HERO', DEFAULTS.HERO),
    getSection('ABOUT', DEFAULTS.ABOUT),
    getSection('SERVICES', DEFAULTS.SERVICES),
    getSection('GALLERY', DEFAULTS.GALLERY),
    getSection('CONTACT', DEFAULTS.CONTACT),
    getSection('PROJECTS', DEFAULT_PROJECTS),
  ]);
  res.json({ hero, about, services, gallery, contact, projects });
});

realEstateRouter.put('/hero', requireAuth, requirePermission('REAL_ESTATE_CONTENT'), async (req, res) => {
  const { title, subtitle, bgImage } = req.body || {};
  const current = await getSection('HERO', DEFAULTS.HERO as any);
  const updated = { ...current, ...(title ? { title } : {}), ...(subtitle ? { subtitle } : {}), ...(bgImage ? { bgImage } : {}) };
  await setSection('HERO', updated);

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'REALESTATE_CMS_UPDATE',
    module: 'Real Estate Admin',
    details: 'Updated hero headline & subtitle content.',
  });

  res.json({ hero: updated });
});

realEstateRouter.post('/projects', requireAuth, requirePermission('REAL_ESTATE_CONTENT'), async (req, res) => {
  const { title, district, category, units, image, description } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Project title is required.' });

  const projects = await getSection('PROJECTS', DEFAULT_PROJECTS);
  const newProject = {
    id: 're_' + Date.now(),
    title,
    category: category || 'Residential',
    district: district || 'Gasabo',
    units: units || '20 Units',
    status: 'Under Development',
    image: image || '/real-estate-logo.png',
    description: description || 'Newly announced flagship development by Gasabo Real Estate.',
  };
  const updated = [newProject, ...projects];
  await setSection('PROJECTS', updated);

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'REALESTATE_PROJECT_ADDED',
    module: 'Real Estate Admin',
    details: `Added portfolio project "${title}".`,
  });

  res.status(201).json({ projects: updated });
});

// Projects live as a single JSON array inside one RealEstateContent row
// (sectionKey 'PROJECTS'), not individual DB rows - deleting one means
// reading the array, filtering it, and writing the whole array back.
realEstateRouter.delete('/projects/:id', requireAuth, requirePermission('REAL_ESTATE_CONTENT'), async (req, res) => {
  const projects = await getSection<any[]>('PROJECTS', DEFAULT_PROJECTS);
  const exists = projects.some((p) => p.id === req.params.id);
  if (!exists) return res.status(404).json({ error: 'Project not found.' });

  const updated = projects.filter((p) => p.id !== req.params.id);
  await setSection('PROJECTS', updated);

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'REALESTATE_PROJECT_DELETED',
    module: 'Real Estate Admin',
    details: `Deleted portfolio project (id: ${req.params.id}).`,
  });

  res.json({ projects: updated });
});

// Generic section editor for ABOUT / SERVICES / GALLERY / CONTACT
realEstateRouter.put('/:sectionKey', requireAuth, requirePermission('REAL_ESTATE_CONTENT'), async (req, res) => {
  const key = req.params.sectionKey.toUpperCase();
  if (!['ABOUT', 'SERVICES', 'GALLERY', 'CONTACT'].includes(key)) {
    return res.status(400).json({ error: 'Unknown content section.' });
  }
  await setSection(key, req.body);

  await logAudit({
    actorId: req.user!.id,
    actorType: req.user!.role,
    actorName: req.user!.name,
    action: 'REALESTATE_CMS_UPDATE',
    module: 'Real Estate Admin',
    details: `Updated ${key} section content.`,
  });

  res.json({ [key.toLowerCase()]: req.body });
});
