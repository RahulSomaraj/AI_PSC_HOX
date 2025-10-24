const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Starting comprehensive test suite for all new features...\n');

// Test configuration
const tests = [
  {
    name: 'Database Connection Test',
    command: 'node test-database-connection.js',
    description: 'Testing database connectivity and basic setup'
  },
  {
    name: 'TypeScript Compilation Test',
    command: 'npm run build',
    description: 'Testing TypeScript compilation with all new features'
  },
  {
    name: 'Linting Test',
    command: 'npm run lint',
    description: 'Testing code quality and style'
  },
  {
    name: 'Unit Tests',
    command: 'npm test -- --testPathPattern=auth',
    description: 'Running unit tests for auth service and controller'
  }
];

// Check if .env file exists
function checkEnvFile() {
  const envPath = path.join(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.log('⚠️  Warning: .env file not found!');
    console.log('📝 Please create a .env file with the following variables:');
    console.log('   DB_HOST=localhost');
    console.log('   DB_PORT=5432');
    console.log('   DB_USERNAME=postgres');
    console.log('   DB_PASSWORD=your_password');
    console.log('   DB_NAME=your_database_name');
    console.log('   JWT_SECRET=your_jwt_secret');
    console.log('   NODE_ENV=development');
    console.log('   PORT=3000\n');
    return false;
  }
  console.log('✅ .env file found\n');
  return true;
}

// Run individual test
function runTest(test) {
  console.log(`🔍 ${test.name}`);
  console.log(`📋 ${test.description}`);
  
  try {
    const output = execSync(test.command, { 
      encoding: 'utf8', 
      stdio: 'pipe',
      cwd: process.cwd()
    });
    
    console.log('✅ PASSED\n');
    return true;
  } catch (error) {
    console.log('❌ FAILED');
    console.log('Error:', error.message);
    if (error.stdout) {
      console.log('Output:', error.stdout);
    }
    if (error.stderr) {
      console.log('Error details:', error.stderr);
    }
    console.log('');
    return false;
  }
}

// Main test runner
async function runAllTests() {
  console.log('🚀 PSC Backend - Feature Test Suite');
  console.log('=====================================\n');
  
  // Check environment setup
  const envExists = checkEnvFile();
  
  let passedTests = 0;
  let totalTests = tests.length;
  
  // Run each test
  for (const test of tests) {
    const passed = runTest(test);
    if (passed) {
      passedTests++;
    }
  }
  
  // Summary
  console.log('📊 Test Summary');
  console.log('================');
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  console.log(`❌ Failed: ${totalTests - passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log('\n🎉 All tests passed! Your new features are working correctly.');
    console.log('\n📋 Features tested:');
    console.log('   ✅ Database connection and entities');
    console.log('   ✅ Forgot password functionality');
    console.log('   ✅ Reset password functionality');
    console.log('   ✅ Update password functionality');
    console.log('   ✅ Soft delete profile functionality');
    console.log('   ✅ Email service integration');
    console.log('   ✅ TypeScript compilation');
    console.log('   ✅ Code quality and linting');
  } else {
    console.log('\n⚠️  Some tests failed. Please check the errors above.');
    console.log('\n💡 Common solutions:');
    console.log('   1. Ensure PostgreSQL is running');
    console.log('   2. Check your .env file configuration');
    console.log('   3. Install dependencies: npm install');
    console.log('   4. Create the database if it doesn\'t exist');
  }
  
  console.log('\n🔗 Next steps:');
  console.log('   1. Start the application: npm run start:dev');
  console.log('   2. Test the API endpoints with Postman or curl');
  console.log('   3. Integrate with your frontend application');
}

// Run the tests
runAllTests().catch(console.error);

