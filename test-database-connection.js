const { Client } = require('pg');
require('dotenv').config();

async function testDatabaseConnection() {
  const client = new Client({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USERNAME || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'test_db',
  });

  try {
    console.log('🔌 Testing database connection...');
    await client.connect();
    console.log('✅ Database connection successful!');

    // Test basic query
    const result = await client.query('SELECT NOW() as current_time');
    console.log('📅 Current database time:', result.rows[0].current_time);

    // Check if tables exist
    const tablesResult = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `);
    
    console.log('📋 Existing tables:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    console.log('🎉 Database connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error:', error.message);
    console.error('\n💡 Make sure to:');
    console.error('1. Create a .env file with your database credentials');
    console.error('2. Ensure PostgreSQL is running');
    console.error('3. Create the database if it doesn\'t exist');
    console.error('\nExample .env file:');
    console.error('DB_HOST=localhost');
    console.error('DB_PORT=5432');
    console.error('DB_USERNAME=postgres');
    console.error('DB_PASSWORD=your_password');
    console.error('DB_NAME=your_database_name');
    console.error('JWT_SECRET=your_jwt_secret');
    
  } finally {
    await client.end();
  }
}

testDatabaseConnection();

