import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Fixed dev password for every seeded account, so whoever runs this locally has
// a known set of credentials to log in with. Documented in the project README/changelog.
const DEV_PASSWORD = 'Kigali@2026';

async function main() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  const admin = await prisma.administrator.upsert({
    where: { email: 'admin@kigalimarket.com' },
    update: {},
    create: {
      email: 'admin@kigalimarket.com',
      passwordHash,
      name: 'Jean-Luc Habimana',
      role: 'ADMINISTRATOR',
    },
  });

  await prisma.subAdministrator.upsert({
    where: { email: 'divine@kigalimarket.com' },
    update: {},
    create: {
      email: 'divine@kigalimarket.com',
      passwordHash,
      name: 'Divine Mutoni',
      permissions: JSON.stringify(['PRODUCTS', 'SELLERS', 'CATEGORIES']),
      createdById: admin.id,
    },
  });

  const sellerSeeds = [
    { email: 'eric.m@rwandaagri.rw', businessName: 'Eric Mugisha (AgriCoop)', contactPhone: '+250 788 345 678', district: 'Musanze' },
    { email: 'uwase.mc@gmail.com', businessName: 'Marie Claire Uwase', contactPhone: '+250 789 987 654', district: 'Gasabo' },
    { email: 'patrick.tech@kigali.rw', businessName: 'Patrick Ndayishimiye (TechHub)', contactPhone: '+250 783 112 233', district: 'Kicukiro' },
  ];

  const sellers: Record<string, Awaited<ReturnType<typeof prisma.seller.upsert>>> = {};
  for (const s of sellerSeeds) {
    sellers[s.email] = await prisma.seller.upsert({
      where: { email: s.email },
      update: {},
      create: { ...s, passwordHash },
    });
  }

  const categorySeeds = [
    { name: 'Electronics & Tech', iconUrl: '💻' },
    { name: 'Agri-Business & Produce', iconUrl: '☕' },
    { name: 'Vehicles & Automotive', iconUrl: '🚗' },
    { name: 'Fashion & Handcrafts', iconUrl: '👗' },
    { name: 'Home & Furniture', iconUrl: '🛋️' },
    { name: 'Professional Services', iconUrl: '🛠️' },
  ];

  const categories: Record<string, Awaited<ReturnType<typeof prisma.category.upsert>>> = {};
  for (let i = 0; i < categorySeeds.length; i++) {
    const c = categorySeeds[i];
    const slug = c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    categories[c.name] = await prisma.category.upsert({
      where: { name: c.name },
      update: {},
      create: { ...c, slug, order: i },
    });
  }

  const sixMonths = () => new Date(Date.now() + 1000 * 60 * 60 * 24 * 30 * 6);

  const productSeeds = [
    {
      title: 'Musanze High-Altitude Specialty Bourbon Coffee (1kg)',
      description: 'Single-origin washed 100% Arabica coffee cultivated on the volcanic slopes of Virunga Mountains, Musanze. Rich chocolate & floral notes.',
      price: 18000,
      district: 'Musanze',
      condition: 'Fresh Roast',
      images: ['https://images.unsplash.com/photo-1559056199-641a0ac8b55e?auto=format&fit=crop&w=1000&q=80'],
      sellerEmail: 'eric.m@rwandaagri.rw',
      categoryName: 'Agri-Business & Produce',
      isFeatured: true,
      isTrending: true,
    },
    {
      title: 'Toyota RAV4 Hybrid AWD 2021 (Kigali Registered)',
      description: 'Fully loaded Toyota RAV4 2021 Hybrid. AWD, leather seats, panoramic sunroof, Kigali plate RAF 890X, complete maintenance record.',
      price: 34500000,
      district: 'Gasabo',
      condition: 'Used - Mint Condition',
      images: ['https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?auto=format&fit=crop&w=1000&q=80'],
      sellerEmail: 'uwase.mc@gmail.com',
      categoryName: 'Vehicles & Automotive',
      isFeatured: true,
      isTrending: true,
    },
    {
      title: 'Authentic Rwandan Handwoven Agaseke Baskets (Set of 3)',
      description: 'Set of 3 traditional Agaseke peace baskets handwoven by local women artisan cooperatives in Nyarugenge using organic sisal fibers.',
      price: 55000,
      district: 'Nyarugenge',
      condition: 'Handcrafted',
      images: ['https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=1000&q=80'],
      sellerEmail: 'eric.m@rwandaagri.rw',
      categoryName: 'Fashion & Handcrafts',
      isFeatured: false,
      isTrending: false,
    },
    {
      title: 'Apple MacBook Pro M3 Max 16" (36GB RAM, 1TB SSD)',
      description: 'Space Black MacBook Pro with M3 Max 14-core CPU and 30-core GPU. Official Apple 1-year warranty included.',
      price: 3200000,
      district: 'Kicukiro',
      condition: 'Brand New In Box',
      images: ['https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1000&q=80'],
      sellerEmail: 'patrick.tech@kigali.rw',
      categoryName: 'Electronics & Tech',
      isFeatured: true,
      isTrending: true,
    },
    {
      title: 'Handcrafted Solid Teak Wood 8-Seater Dining Table',
      description: 'Solid high-grade teak wood dining table with 8 ergonomic matching chairs, finished with anti-scratch UV polyurethane lacquer.',
      price: 950000,
      district: 'Rubavu',
      condition: 'Custom Build',
      images: ['https://images.unsplash.com/photo-1615066390971-03e4e1c36ddf?auto=format&fit=crop&w=1000&q=80'],
      sellerEmail: 'uwase.mc@gmail.com',
      categoryName: 'Home & Furniture',
      isFeatured: true,
      isTrending: false,
    },
  ];

  for (const p of productSeeds) {
    const seller = sellers[p.sellerEmail];
    const category = categories[p.categoryName];
    const existing = await prisma.product.findFirst({ where: { title: p.title } });
    if (existing) continue;
    await prisma.product.create({
      data: {
        title: p.title,
        description: p.description,
        price: p.price,
        district: p.district,
        condition: p.condition,
        images: JSON.stringify(p.images),
        sellerId: seller.id,
        categoryId: category.id,
        isFeatured: p.isFeatured,
        isTrending: p.isTrending,
        expiresAt: sixMonths(),
      },
    });
  }

  console.log(`Seed complete. Dev login password for all seeded accounts: ${DEV_PASSWORD}`);
  console.log('Admin login:', admin.email);
  console.log('Sub-admin login: divine@kigalimarket.com');
  console.log('Seller logins:', sellerSeeds.map((s) => s.email).join(', '));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
