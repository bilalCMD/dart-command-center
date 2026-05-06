const { PrismaClient } = require('@prisma/client');
const XLSX = require('xlsx');
const path = require('path');

const prisma = new PrismaClient();

function detectCategory(description, excelCategory) {
  const desc = (description || '').toLowerCase();
  if (desc.includes('laptop') || desc.includes('thinkpad') || desc.includes('macbook') || desc.includes('inspiron') || desc.includes('alienware') || desc.includes('legion') || desc.includes('blade') || desc.includes('thinkbook')) return 'Laptop';
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

// Match user by name (fuzzy match)
async function findUserByName(name) {
  if (!name || !name.trim()) return null;
  
  const cleanName = name.trim().toLowerCase();
  const users = await prisma.user.findMany({ select: { id: true, name: true, email: true } });
  
  // Exact match
  let match = users.find(u => u.name.toLowerCase() === cleanName);
  if (match) return match;
  
  // Partial match - first name or last name
  match = users.find(u => {
    const userName = u.name.toLowerCase();
    return userName.includes(cleanName) || cleanName.includes(userName.split(' ')[0]);
  });
  if (match) return match;
  
  // First word match
  const firstWord = cleanName.split(' ')[0];
  match = users.find(u => u.name.toLowerCase().split(' ')[0] === firstWord);
  
  return match || null;
}

async function importAssets() {
  const filePath = path.join(__dirname, '..', 'assets-data.xlsx');
  console.log('Reading file:', filePath);
  
  const workbook = XLSX.readFile(filePath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(sheet);
  
  console.log(`Found ${rows.length} assets to import\n`);
  
  let success = 0, assigned = 0, unmatched = [];
  
  for (const row of rows) {
    try {
      const tagId = row['Asset Tag ID'];
      const description = (row['Description'] || 'Unnamed Asset').trim();
      const assignedToName = row['Assigned to'];
      
      // Find user
      let assignedUser = null;
      if (assignedToName && assignedToName.trim()) {
        assignedUser = await findUserByName(assignedToName);
        if (!assignedUser) {
          unmatched.push(`${tagId}: "${assignedToName}"`);
        }
      }
      
      const purchaseDate = row['Purchase Date'];
      let parsedDate = null;
      if (purchaseDate instanceof Date) parsedDate = purchaseDate;
      
      await prisma.asset.create({
        data: {
          tagId,
          photoUrl: row['Asset Photo'] || null,
          name: description,
          category: detectCategory(description),
          brand: (row['Brand'] || '').trim() || null,
          model: (row['Model'] || '').trim() || null,
          serialNumber: (row['Serial No'] || '').trim() || null,
          purchaseDate: parsedDate,
          purchasePrice: parsePrice(row['Cost']),
          status: assignedUser ? 'Assigned' : mapStatus(row['Status']),
          assignedTo: assignedUser?.id || null,
          assignedAt: assignedUser ? new Date() : null,
          condition: 'Good',
          notes: row['Department'] ? `Department: ${row['Department']}` : null,
        }
      });
      
      const assignInfo = assignedUser ? ` → ${assignedUser.name}` : '';
      console.log(`✅ ${tagId} - ${description}${assignInfo}`);
      success++;
      if (assignedUser) assigned++;
    } catch (err) {
      console.error(`❌ Failed: ${row['Asset Tag ID']} - ${err.message}`);
    }
  }
  
  console.log(`\n=== SUMMARY ===`);
  console.log(`✅ Imported: ${success}`);
  console.log(`👤 Auto-assigned: ${assigned}`);
  console.log(`⚠️  Unmatched names (need manual assign): ${unmatched.length}`);
  if (unmatched.length > 0) {
    console.log('\nUnmatched assignments:');
    unmatched.forEach(u => console.log(`  - ${u}`));
  }
}

importAssets()
  .catch(console.error)
  .finally(() => prisma.$disconnect());