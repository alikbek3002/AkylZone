const supabase = require('./supabase');

async function columnExists(table, column) {
  const { data, error } = await supabase
    .from(table)
    .select(column)
    .limit(1);

  return !error;
}

async function addColumnViaUpdate(table, column, defaultValue) {
  const exists = await columnExists(table, column);
  if (exists) return false;

  const { error } = await supabase
    .from(table)
    .update({ [column]: defaultValue })
    .eq('id', '00000000-0000-0000-0000-000000000000');

  if (error && error.code === '42703') {
    console.warn(`Column "${column}" does not exist on "${table}" — please add it via Supabase Dashboard SQL Editor:`);
    console.warn(`  ALTER TABLE public.${table} ADD COLUMN IF NOT EXISTS ${column} ${typeof defaultValue === 'boolean' ? 'boolean DEFAULT false' : typeof defaultValue === 'number' ? 'integer DEFAULT 0' : 'timestamptz DEFAULT NULL'};`);
    return false;
  }

  return true;
}

async function runMigrations() {
  console.log('Checking database schema...');

  const needed = [];

  if (!(await columnExists('students', 'screenshot_strikes'))) {
    needed.push('ALTER TABLE public.students ADD COLUMN IF NOT EXISTS screenshot_strikes integer DEFAULT 0;');
  }
  if (!(await columnExists('students', 'blocked_until'))) {
    needed.push('ALTER TABLE public.students ADD COLUMN IF NOT EXISTS blocked_until timestamptz DEFAULT NULL;');
  }
  if (!(await columnExists('students', 'blocked_permanently'))) {
    needed.push('ALTER TABLE public.students ADD COLUMN IF NOT EXISTS blocked_permanently boolean DEFAULT false;');
  }

  if (needed.length === 0) {
    console.log('Database schema is up to date.');
    return true;
  }

  console.error('\n⚠️  Missing columns detected! Please run the following SQL in the Supabase Dashboard SQL Editor:\n');
  console.error('─'.repeat(70));
  for (const sql of needed) {
    console.error(sql);
  }
  console.error('─'.repeat(70));
  console.error('\nThe server will still start, but screenshot blocking features will not work until these columns are added.\n');

  return false;
}

module.exports = { runMigrations };
