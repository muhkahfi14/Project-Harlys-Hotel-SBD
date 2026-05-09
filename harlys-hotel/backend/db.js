// ============================================================
//  db.js — Konfigurasi koneksi Oracle DB
//  Kredensial dibaca dari file .env (bukan hardcode di sini)
// ============================================================

require('dotenv').config();
const oracledb = require('oracledb');

const dbConfig = {
  user          : process.env.DB_USER,
  password      : process.env.DB_PASSWORD,
  connectString : process.env.DB_CONNECT_STRING,
};

async function getConnection() {
  return await oracledb.getConnection(dbConfig);
}

async function closeConnection(conn) {
  if (conn) {
    try {
      await conn.close();
    } catch (err) {
      console.error('Error closing connection:', err);
    }
  }
}

module.exports = { getConnection, closeConnection, oracledb };
