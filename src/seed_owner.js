
require('dotenv').config();

const readline = require('node:readline');
const bcrypt = require('bcryptjs');
const pool = require('./config/db');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function main() {
  let connection;

  try {
    console.log('\n=== ResikPos: Buat Merchant & Owner ===\n');

    const businessName = await ask('Nama bisnis: ');
    const email = (await ask('Email bisnis: ')).toLowerCase();
    const ownerName = await ask('Nama Owner: ');
    const username = await ask('Username Owner: ');
    const password = await ask('Password Owner (minimal 12 karakter): ');

    if (!businessName || !email || !ownerName || !username) {
      throw new Error('Semua data wajib diisi.');
    }

    if (password.length < 12) {
      throw new Error('Password harus minimal 12 karakter.');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Format email tidak valid.');
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [existing] = await connection.execute(
      'SELECT id FROM merchants WHERE email = ? LIMIT 1',
      [email]
    );

    if (existing.length > 0) {
      throw new Error(
        'Email bisnis sudah terdaftar. Tidak ada data yang ditambahkan.'
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const [merchantResult] = await connection.execute(
      `INSERT INTO merchants
        (business_name, email, subscription_tier, is_active)
       VALUES (?, ?, 'Basic', 1)`,
      [businessName, email]
    );

    const merchantId = merchantResult.insertId;

    await connection.execute(
      `INSERT INTO users
        (merchant_id, outlet_id, role, name, username, password_hash)
       VALUES (?, NULL, 'Owner', ?, ?, ?)`,
      [merchantId, ownerName, username, passwordHash]
    );

    await connection.commit();

    console.log('\nMerchant dan akun Owner berhasil dibuat!');
    console.log(`Merchant ID: ${merchantId}`);
    console.log(`Email bisnis: ${email}`);
    console.log(`Username Owner: ${username}`);
    console.log('Role: Owner');
    console.log('Password disimpan dalam bentuk hash bcrypt.');
  } catch (error) {
    if (connection) {
      await connection.rollback();
    }

    console.error('\nGagal membuat akun:', error.message);
    process.exitCode = 1;
  } finally {
    if (connection) connection.release();
    rl.close();
    await pool.end();
  }
}

main();
