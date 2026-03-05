// setup.js — StudySync Database Setup (Idempotent)
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function setup() {
  console.log('📦 Setting up StudySync production database...');

  // Drop ALL tables in correct dependency order (children first)
  await pool.query(`
    DROP TABLE IF EXISTS room_invitations   CASCADE;
    DROP TABLE IF EXISTS room_join_requests  CASCADE;
    DROP TABLE IF EXISTS room_participants   CASCADE;
    DROP TABLE IF EXISTS study_rooms         CASCADE;
    DROP TABLE IF EXISTS profile_views       CASCADE;
    DROP TABLE IF EXISTS kudos               CASCADE;
    DROP TABLE IF EXISTS notifications       CASCADE;
    DROP TABLE IF EXISTS sessions            CASCADE;
    DROP TABLE IF EXISTS messages            CASCADE;
    DROP TABLE IF EXISTS study_buddies       CASCADE;
    DROP TABLE IF EXISTS connections         CASCADE;
    DROP TABLE IF EXISTS users               CASCADE;
  `);

  // Drop ALL custom types
  await pool.query(`
    DROP TYPE IF EXISTS room_inv_status    CASCADE;
    DROP TYPE IF EXISTS join_req_status    CASCADE;
    DROP TYPE IF EXISTS participant_role   CASCADE;
    DROP TYPE IF EXISTS room_status        CASCADE;
    DROP TYPE IF EXISTS room_permission    CASCADE;
    DROP TYPE IF EXISTS notif_priority     CASCADE;
    DROP TYPE IF EXISTS session_status     CASCADE;
    DROP TYPE IF EXISTS buddy_status       CASCADE;
    DROP TYPE IF EXISTS user_status        CASCADE;
  `);
  console.log('  Old schema dropped');

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('✅ Production schema created with all indexes and constraints');
  await pool.end();
  console.log('\n🎉 Database ready — clean production start!');
}

setup().catch(e => {
  console.error('❌ Setup failed:', e.message);
  pool.end().catch(() => { });
  process.exit(1);
});
