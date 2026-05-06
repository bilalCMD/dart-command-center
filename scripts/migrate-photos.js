require('dotenv').config();
const ws = require('ws');
global.WebSocket = ws;
const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const https = require('https');

const prisma = new PrismaClient();
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

require('dotenv').config();

function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    });
  });
}

async function migrate() {
  const assets = await prisma.asset.findMany({
    where: { 
      photoUrl: { startsWith: 'https://www.assettiger.com' }
    }
  });

  console.log(`Found ${assets.length} photos to migrate\n`);

  let success = 0, failed = 0;

  for (const asset of assets) {
    try {
      console.log(`📥 Downloading: ${asset.tagId} - ${asset.name}`);
      const buffer = await downloadImage(asset.photoUrl);
      
      const filename = `migrated/${asset.tagId || asset.id}.jpg`;
      
      const { error } = await supabase.storage
        .from('assets')
        .upload(filename, buffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('assets')
        .getPublicUrl(filename);

      await prisma.asset.update({
        where: { id: asset.id },
        data: { photoUrl: publicUrl }
      });

      console.log(`✅ Done: ${asset.tagId}`);
      success++;
    } catch (err) {
      console.error(`❌ Failed: ${asset.tagId} - ${err.message}`);
      failed++;
    }
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`✅ Migrated: ${success}`);
  console.log(`❌ Failed: ${failed}`);
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect());