import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding...');

  const currentYear = new Date().getFullYear();
  const leaveTypes = [
    { type: 'ANNUAL' as const, total: 20 },
    { type: 'SICK' as const, total: 10 },
    { type: 'CASUAL' as const, total: 7 },
    { type: 'EMERGENCY' as const, total: 5 },
  ];

  const admins = [
    { email: 'umair@dartmarketing.io', name: 'Umair', avatar: 'UM' },
    { email: 'aizaz@dartmarketing.io', name: 'Aizaz', avatar: 'AZ' },
    { email: 'bilal.altaf@dartmarketing.io', name: 'Bilal Altaf', avatar: 'BA' },
  ];

  for (const a of admins) {
    const user = await prisma.user.upsert({
      where: { email: a.email },
      update: { role: 'ADMIN', isActive: true, name: a.name, avatar: a.avatar },
      create: { email: a.email, name: a.name, avatar: a.avatar, role: 'ADMIN', isActive: true },
    });
    for (const lt of leaveTypes) {
      await prisma.leaveBalance.upsert({
        where: { userId_type_year: { userId: user.id, type: lt.type, year: currentYear } },
        update: {},
        create: { userId: user.id, type: lt.type, total: lt.total, used: 0, year: currentYear },
      });
    }
    console.log('✅ Admin:', a.email);
  }

  const employees = [
    { email: 'raahim@dartmarketing.io', name: 'Raahim Khan', avatar: 'RK' },
    { email: 'urooj@dartmarketing.io', name: 'Urooj', avatar: 'UR' },
    { email: 'maheen@dartmarketing.io', name: 'Maheen', avatar: 'MA' },
    { email: 'zainab@dartmarketing.io', name: 'Zainab Ali', avatar: 'ZA' },
    { email: 'hasan@dartmarketing.io', name: 'Hasan', avatar: 'HA' },
    { email: 'talha@dartmarketing.io', name: 'Talha Tajuddin', avatar: 'TT' },
    { email: 'kaleem@dartmarketing.io', name: 'Kaleem', avatar: 'KA' },
    { email: 'okasha.n@dartmarketing.io', name: 'Okasha N', avatar: 'ON' },
    { email: 'waniya@dartmarketing.io', name: 'Waniya', avatar: 'WA' },
    { email: 'zahid@dartmarketing.io', name: 'Zahid Chishti', avatar: 'ZC' },
    { email: 'ahad@dartmarketing.io', name: 'Ahad', avatar: 'AH' },
    { email: 'sam@dartmarketing.io', name: 'Sam', avatar: 'SA' },
    { email: 'lasma@dartmarketing.io', name: 'Lasma', avatar: 'LA' },
    { email: 'sunaina@dartmarketing.io', name: 'Sunaina', avatar: 'SU' },
    { email: 'hasnain@dartmarketing.io', name: 'Hasnain', avatar: 'HN' },
  ];

  for (const e of employees) {
    const user = await prisma.user.upsert({
      where: { email: e.email },
      update: { role: 'MEMBER', isActive: true, name: e.name, avatar: e.avatar },
      create: { email: e.email, name: e.name, avatar: e.avatar, role: 'MEMBER', isActive: true },
    });
    for (const lt of leaveTypes) {
      await prisma.leaveBalance.upsert({
        where: { userId_type_year: { userId: user.id, type: lt.type, year: currentYear } },
        update: {},
        create: { userId: user.id, type: lt.type, total: lt.total, used: 0, year: currentYear },
      });
    }
    console.log('✅ Employee:', e.email);
  }

  const badges = [
    { name: '7-Day Streak', icon: '🔥', description: 'Submit EOD for 7 consecutive days' },
    { name: 'Early Bird', icon: '🐦', description: 'Clock in before 9 AM for 5 days' },
    { name: 'Perfect Month', icon: '💎', description: '100% EOD + 0 late' },
    { name: 'Top Performer', icon: '⭐', description: 'Highest evaluation score of the month' },
    { name: 'Team Player', icon: '🤝', description: 'Outstanding collaboration' },
  ];

  for (const b of badges) {
    await prisma.badge.upsert({
      where: { name: b.name },
      update: {},
      create: b,
    });
  }

  console.log('✅ Badges created');
  console.log('🎉 Done!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });