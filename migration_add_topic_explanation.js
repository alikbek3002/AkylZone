// Migration: Run SQL via the Supabase Management REST API (pg-meta)
// The /pg-meta/default/query endpoint accepts raw SQL
const path = require('path');
require(path.join(__dirname, 'backend', 'node_modules', 'dotenv')).config({ path: path.join(__dirname, 'backend', '.env') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const SUBJECTS = ['math', 'logic', 'history', 'english', 'russian', 'kyrgyz'];
const LANGUAGES = ['ru', 'kg'];
const GRADES = [5, 6, 7];

async function runMigration() {
    const statements = [];
    for (const subject of SUBJECTS) {
        for (const lang of LANGUAGES) {
            for (const grade of GRADES) {
                const table = `questions_${subject}_${lang}_${grade}`;
                statements.push(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS topic TEXT DEFAULT '', ADD COLUMN IF NOT EXISTS explanation TEXT DEFAULT '';`);
            }
        }
    }

    const fullSQL = statements.join('\n');

    // Extract project ref from URL
    const projectRef = SUPABASE_URL.replace('https://', '').split('.')[0];
    console.log(`Project ref: ${projectRef}`);
    console.log(`Running ${statements.length} ALTER TABLE statements...\n`);

    // Try Supabase Management API
    const mgmtUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
    console.log(`Trying Management API: ${mgmtUrl}`);

    const mgmtResponse = await fetch(mgmtUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ query: fullSQL }),
    });

    console.log(`Status: ${mgmtResponse.status}`);
    const body = await mgmtResponse.text();
    console.log(`Response: ${body.substring(0, 500)}`);

    if (mgmtResponse.ok) {
        console.log('\n✅ Migration completed!');
    } else {
        // Try the direct /rest/v1/ approach by just inserting with the new column
        // This won't work for ALTER TABLE. Output SQL for manual run.
        console.log('\n⚠️  Management API did not work.');
        console.log('Please run this SQL in your Supabase SQL Editor (https://supabase.com/dashboard):');
        console.log('\n--- SQL ---');
        console.log(fullSQL);
    }
}

runMigration().catch(console.error);
