const fs = require('fs');
const path = require('path');

const SUPABASE_URL = 'https://qimeqzzawwiruggmltra.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFpbWVxenphd3dpcnVnZ21sdHJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2MTM3MTUsImV4cCI6MjA4MzE4OTcxNX0.gWBf3tdmLaKxzEP7w7tQBHuJH1uWTq3siiR391kGLGM';

async function clearTable(tableName) {
    console.log(`Clearing existing data from ${tableName}...`);
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?id=gt.0`, {
            method: 'DELETE',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'return=minimal'
            }
        });
        if (response.ok) {
            console.log(`  Cleared ${tableName}`);
        }
    } catch (error) {
        console.log(`  Note: ${tableName} might not exist yet or is empty`);
    }
}

async function importData(tableName, jsonFile) {
    const filePath = path.join(__dirname, jsonFile);

    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${jsonFile}. Run parse-greek-data.js first.`);
        return;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    console.log(`\nImporting ${data.length} records to ${tableName}...`);

    const batchSize = 50;
    let imported = 0;

    for (let i = 0; i < data.length; i += batchSize) {
        const batch = data.slice(i, i + batchSize);

        try {
            const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}`, {
                method: 'POST',
                headers: {
                    'apikey': SUPABASE_KEY,
                    'Authorization': `Bearer ${SUPABASE_KEY}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify(batch)
            });

            if (response.ok) {
                imported += batch.length;
                process.stdout.write(`\r  Imported ${imported}/${data.length} records`);
            } else {
                const error = await response.text();
                console.log(`\n  Error at batch ${i}: ${error}`);
            }
        } catch (error) {
            console.log(`\n  Network error: ${error.message}`);
        }
    }

    console.log(`\n  Done! ${imported} records imported to ${tableName}`);
}

async function verifyImport(tableName) {
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=count`, {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Prefer': 'count=exact'
            }
        });
        const countHeader = response.headers.get('content-range');
        const count = countHeader ? countHeader.split('/')[1] : '?';
        console.log(`  Verified: ${tableName} has ${count} records`);
    } catch (error) {
        console.log(`  Could not verify ${tableName}: ${error.message}`);
    }
}

async function main() {
    console.log('=== Importing Greek Data to Supabase ===\n');
    console.log('NOTE: Make sure the tables exist in Supabase first!');
    console.log('Required tables: greek_founders, harmonic_founders, egg_accelerator\n');

    // Import Greek Founders
    await clearTable('greek_founders');
    await importData('greek_founders', 'greek_founders.json');
    await verifyImport('greek_founders');

    // Import Harmonic Founders
    await clearTable('harmonic_founders');
    await importData('harmonic_founders', 'harmonic_founders.json');
    await verifyImport('harmonic_founders');

    // Import Egg Accelerator
    await clearTable('egg_accelerator');
    await importData('egg_accelerator', 'egg_accelerator.json');
    await verifyImport('egg_accelerator');

    console.log('\n=== Import Complete ===');
}

main().catch(console.error);
