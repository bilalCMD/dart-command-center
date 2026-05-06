const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

function detectCategory(description) {
  const desc = (description || '').toLowerCase();
  if (desc.includes('laptop') || desc.includes('thinkpad') || desc.includes('macbook') || desc.includes('inspiron') || desc.includes('alienware') || desc.includes('legion') || desc.includes('blade') || desc.includes('lenovo') && desc.includes('think')) return 'Laptop';
  if (desc.includes('pc') || desc.includes('desktop') || desc.includes('dart-pc')) return 'Desktop';
  if (desc.includes('mouse')) return 'Mouse';
  if (desc.includes('keyboard')) return 'Keyboard';
  if (desc.includes('headphone') || desc.includes('headset')) return 'Headphones';
  if (desc.includes('monitor') || desc.includes('lcd') || desc.includes('screen')) return 'Monitor';
  if (desc.includes('phone') || desc.includes('redmi') || desc.includes('xiaomi')) return 'Phone';
  if (desc.includes('ipad') || desc.includes('tablet')) return 'Tablet';
  if (desc.includes('printer')) return 'Printer';
  if (desc.includes('router') || desc.includes('firewall') || desc.includes('nas')) return 'Network';
  if (desc.includes('hdd') || desc.includes('ssd') || desc.includes('storage')) return 'Storage';
  if (desc.includes('ups')) return 'UPS';
  if (desc.includes('webcam') || desc.includes('camera')) return 'Camera';
  if (desc.includes('speaker')) return 'Speaker';
  if (desc.includes('pencil')) return 'Accessory';
  return 'Other';
}

function mapStatus(status) {
  if (!status) return 'Available';
  const s = status.toLowerCase();
  if (s.includes('checked out')) return 'Assigned';
  if (s.includes('available')) return 'Available';
  if (s.includes('disposed')) return 'Disposed';
  if (s.includes('repair')) return 'Under Repair';
  return 'Available';
}

function parsePrice(cost) {
  if (!cost) return null;
  const cleaned = String(cost).replace(/[,\s]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

async function importAssets() {
  const filePath = path.join(__dirname, '..', 'assets-data.xlsx');
  console.log('Reading file:', filePath);
  
  const workbook = XLSX.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet);
  
  console.log(`Found ${rows.length} assets to import\n`);
  
  let success = 0, skipped = 0, failed = 0;
  
  for (const row of rows) {
    try {
      const tagId = row['Asset Tag ID'];
      const description = row['Description'] || 'Unnamed Asset';
      
      // Check if already exists
      const existing = await prisma.asset.findFirst({ where: { tagId } });
      if (existing) {
        console.log(`⏭️  Skipped (exists): ${tagId} - ${description}`);
        skipped++;
        continue;
      }
      
      const purchaseDate = row['Purchase Date'];
      let parsedDate = null;
      if (purchaseDate) {
        if (purchaseDate instanceof Date) {
          parsedDate = purchaseDate;
        } else if (typeof purchaseDate === 'number') {
          parsedDate = new Date((purchaseDate - 25569) * 86400 * 1000);
        }
      }
      
      await prisma.asset.create({
        data: {
          tagId,
          photoUrl: row['Asset Photo'] || null,
          name: description.trim(),
          category: detectCategory(description),
          brand: (row['Brand'] || '').trim() || null,
          purchaseDate: parsedDate,
          purchasePrice: parsePrice(row['Cost']),
          status: mapStatus(row['Status']),
          condition: 'Good',
        }
      });
      
      console.log(`✅ Imported: ${tagId} - ${description}`);
      success++;
    } catch (err) {
      console.error(`❌ Failed: ${row['Asset Tag ID']} - ${err.message}`);
      failed++;
    }
  }
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`✅ Imported: ${success}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`❌ Failed: ${failed}`);
}

importAssets()
  .catch(console.error)
  .finally(() => prisma.$disconnect());