require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const SEED_USERS = [
    { name: 'Anjali Reddy', email: 'anjali@demo.com', avatar: '👩‍💻', institution: 'Delhi University', education: '3rd Year, CSE', bio: "Serious about placement prep. Let's crack DSA together!", subjects: ['Data Structures & Algorithms', 'Operating Systems'], goal: 'Placement Preparation', availability: ['Evening', 'Night'], modes: ['discussion', 'doubt'], rating: 4.9, total_sessions: 28 },
    { name: 'Rahul Verma', email: 'rahul@demo.com', avatar: '👨‍🔬', institution: 'IIT Delhi', education: 'Final Year, Mech.', bio: 'GATE 2026 aspirant. Consistent and punctual.', subjects: ['Mathematics', 'Physics', 'GATE Prep'], goal: 'Exam Preparation', availability: ['Evening', 'Night'], modes: ['silent'], rating: 4.8, total_sessions: 32 },
    { name: 'Karan Singh', email: 'karan@demo.com', avatar: '🧑‍💻', institution: 'Mumbai University', education: 'Final Year, IT', bio: "Building projects + placement prep. Let's grind!", subjects: ['Data Structures & Algorithms', 'Machine Learning'], goal: 'Placement Preparation', availability: ['Morning', 'Evening'], modes: ['discussion'], rating: 4.7, total_sessions: 15 },
    { name: 'Meera Patel', email: 'meera@demo.com', avatar: '👩‍🎓', institution: 'BITS Bangalore', education: '2nd Year, ECE', bio: 'Love math and circuits. Looking for morning study partners.', subjects: ['Mathematics', 'Physics', 'Computer Networks'], goal: 'College Studies', availability: ['Morning', 'Afternoon'], modes: ['silent', 'doubt'], rating: 4.6, total_sessions: 12 },
    { name: 'Arjun Nair', email: 'arjun@demo.com', avatar: '🎓', institution: 'NIT Calicut', education: 'Final Year, CS', bio: "CAT 2026 + coding interviews. Let's ace both.", subjects: ['Data Structures & Algorithms', 'CAT Prep'], goal: 'Exam Preparation', availability: ['Night'], modes: ['discussion'], rating: 4.5, total_sessions: 8 },
    { name: 'Sneha Gupta', email: 'sneha@demo.com', avatar: '👩‍💼', institution: 'Symbiosis Pune', education: '3rd Year, BBA', bio: 'CAT quant specialist. Love peer teaching.', subjects: ['CAT Prep', 'Mathematics'], goal: 'Exam Preparation', availability: ['Afternoon', 'Evening'], modes: ['discussion'], rating: 4.9, total_sessions: 41 },
    { name: 'Dev Sharma', email: 'dev@demo.com', avatar: '🧠', institution: 'VIT Chennai', education: 'Final Year, CS', bio: 'ML research + placement. Open to all study modes.', subjects: ['Machine Learning', 'Data Structures & Algorithms'], goal: 'Placement Preparation', availability: ['Morning', 'Night'], modes: ['silent', 'discussion'], rating: 4.7, total_sessions: 20 },
    { name: 'Prachi Joshi', email: 'prachi@demo.com', avatar: '👩‍⚕️', institution: 'AIIMS Delhi', education: '2nd Year, MBBS', bio: 'Med student. Need serious, focused study buddies.', subjects: ['Biology', 'Chemistry'], goal: 'College Studies', availability: ['Evening', 'Night'], modes: ['silent'], rating: 4.8, total_sessions: 35 },
    { name: 'Aditya Kumar', email: 'aditya@demo.com', avatar: '🚀', institution: 'IIIT Hyderabad', education: 'Final Year, CS', bio: 'Placed at Google! Happy to help others with DSA.', subjects: ['Data Structures & Algorithms', 'Computer Networks', 'Operating Systems'], goal: 'Placement Preparation', availability: ['Morning', 'Evening', 'Night'], modes: ['doubt', 'discussion'], rating: 4.9, total_sessions: 55 },
    { name: 'Ritika Bose', email: 'ritika@demo.com', avatar: '📊', institution: 'Delhi College', education: '3rd Year, Commerce', bio: 'MBA aspirant. Verbal + DILR focus.', subjects: ['CAT Prep', 'Business'], goal: 'Exam Preparation', availability: ['Morning', 'Afternoon'], modes: ['discussion'], rating: 4.6, total_sessions: 18 },
    { name: 'Sahil Mehta', email: 'sahil@demo.com', avatar: '⚡', institution: 'IIT Bombay', education: 'Final Year, EE', bio: 'GATE EE 2026. Consistent daily studier.', subjects: ['Mathematics', 'Physics', 'GATE Prep'], goal: 'Exam Preparation', availability: ['Afternoon', 'Evening'], modes: ['silent', 'discussion'], rating: 4.5, total_sessions: 22 },
    { name: 'Nisha Thomas', email: 'nisha@demo.com', avatar: '🌟', institution: 'BITS Pilani', education: '1st Year, CS', bio: 'New here! Looking for patient study partners.', subjects: ['Mathematics', 'Data Structures & Algorithms'], goal: 'College Studies', availability: ['Evening'], modes: ['doubt'], rating: 4.4, total_sessions: 6 },
];

async function setup() {
    console.log('📦 Setting up StudySync database...');
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
    await pool.query(schema);
    console.log('✅ Schema created');

    const hash = await bcrypt.hash('demo1234', 10);
    for (const u of SEED_USERS) {
        await pool.query(
            `INSERT INTO users (name,email,password_hash,avatar,institution,education,bio,subjects,goal,availability,modes,rating,total_sessions)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       ON CONFLICT (email) DO NOTHING`,
            [u.name, u.email, hash, u.avatar, u.institution, u.education, u.bio,
            JSON.stringify(u.subjects), u.goal, JSON.stringify(u.availability), JSON.stringify(u.modes), u.rating, u.total_sessions]
        );
    }
    console.log(`✅ Seeded ${SEED_USERS.length} demo users (password: demo1234)`);
    await pool.end();
    console.log('🎉 Database setup complete!');
}

setup().catch(e => { console.error('❌ Setup failed:', e.message); process.exit(1); });
