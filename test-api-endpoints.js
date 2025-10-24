const axios = require('axios');

// Configuration
const BASE_URL = 'http://localhost:3000';
const TEST_USER = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  firstName: 'Test',
  lastName: 'User',
  phone: '1234567890'
};

let accessToken = '';
let refreshToken = '';
let sessionId = '';

// Helper function to make API calls
async function apiCall(method, endpoint, data = null, headers = {}) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return { success: true, data: response.data, status: response.status };
  } catch (error) {
    return { 
      success: false, 
      error: error.response?.data || error.message,
      status: error.response?.status || 500
    };
  }
}

// Test functions
async function testServerConnection() {
  console.log('🔌 Testing server connection...');
  const result = await apiCall('GET', '/');
  
  if (result.success) {
    console.log('✅ Server is running and accessible');
    return true;
  } else {
    console.log('❌ Server connection failed:', result.error);
    return false;
  }
}

async function testUserRegistration() {
  console.log('\n📝 Testing user registration...');
  const result = await apiCall('POST', '/users', TEST_USER);
  
  if (result.success) {
    console.log('✅ User registration successful');
    return true;
  } else {
    console.log('❌ User registration failed:', result.error);
    return false;
  }
}

async function testUserLogin() {
  console.log('\n🔐 Testing user login...');
  const result = await apiCall('POST', '/auth/login', {
    email: TEST_USER.email,
    password: TEST_USER.password
  });
  
  if (result.success) {
    accessToken = result.data.accessToken;
    refreshToken = result.data.refreshToken;
    sessionId = result.data.sessionId;
    console.log('✅ User login successful');
    console.log(`   Access Token: ${accessToken.substring(0, 20)}...`);
    return true;
  } else {
    console.log('❌ User login failed:', result.error);
    return false;
  }
}

async function testForgotPassword() {
  console.log('\n📧 Testing forgot password...');
  const result = await apiCall('POST', '/auth/forgot-password', {
    email: TEST_USER.email
  });
  
  if (result.success) {
    console.log('✅ Forgot password request successful');
    console.log(`   Message: ${result.data.message}`);
    return true;
  } else {
    console.log('❌ Forgot password failed:', result.error);
    return false;
  }
}

async function testUpdatePassword() {
  console.log('\n🔑 Testing update password...');
  const result = await apiCall('POST', '/auth/update-password', {
    currentPassword: TEST_USER.password,
    newPassword: 'NewTestPassword123!'
  }, {
    'Authorization': `Bearer ${accessToken}`
  });
  
  if (result.success) {
    console.log('✅ Password update successful');
    console.log(`   Message: ${result.data.message}`);
    return true;
  } else {
    console.log('❌ Password update failed:', result.error);
    return false;
  }
}

async function testTokenRefresh() {
  console.log('\n🔄 Testing token refresh...');
  const result = await apiCall('POST', '/auth/refresh', {
    refreshToken: refreshToken
  });
  
  if (result.success) {
    accessToken = result.data.accessToken; // Update with new token
    console.log('✅ Token refresh successful');
    return true;
  } else {
    console.log('❌ Token refresh failed:', result.error);
    return false;
  }
}

async function testDeleteProfile() {
  console.log('\n🗑️  Testing profile deletion...');
  const result = await apiCall('DELETE', '/auth/profile', {
    password: 'NewTestPassword123!',
    reason: 'Testing soft delete functionality'
  }, {
    'Authorization': `Bearer ${accessToken}`
  });
  
  if (result.success) {
    console.log('✅ Profile deletion successful');
    console.log(`   Message: ${result.data.message}`);
    return true;
  } else {
    console.log('❌ Profile deletion failed:', result.error);
    return false;
  }
}

async function testDeletedUserLogin() {
  console.log('\n🚫 Testing login with deleted user...');
  const result = await apiCall('POST', '/auth/login', {
    email: TEST_USER.email,
    password: 'NewTestPassword123!'
  });
  
  if (!result.success && result.status === 401) {
    console.log('✅ Correctly rejected login for deleted user');
    return true;
  } else {
    console.log('❌ Should have rejected login for deleted user');
    return false;
  }
}

// Main test runner
async function runApiTests() {
  console.log('🧪 API Endpoint Test Suite');
  console.log('==========================\n');
  
  const tests = [
    { name: 'Server Connection', fn: testServerConnection },
    { name: 'User Registration', fn: testUserRegistration },
    { name: 'User Login', fn: testUserLogin },
    { name: 'Forgot Password', fn: testForgotPassword },
    { name: 'Update Password', fn: testUpdatePassword },
    { name: 'Token Refresh', fn: testTokenRefresh },
    { name: 'Delete Profile', fn: testDeleteProfile },
    { name: 'Deleted User Login', fn: testDeletedUserLogin }
  ];
  
  let passedTests = 0;
  
  for (const test of tests) {
    try {
      const passed = await test.fn();
      if (passed) passedTests++;
    } catch (error) {
      console.log(`❌ ${test.name} failed with error:`, error.message);
    }
  }
  
  console.log('\n📊 Test Results');
  console.log('================');
  console.log(`✅ Passed: ${passedTests}/${tests.length}`);
  console.log(`❌ Failed: ${tests.length - passedTests}/${tests.length}`);
  
  if (passedTests === tests.length) {
    console.log('\n🎉 All API tests passed! Your authentication system is working perfectly.');
  } else {
    console.log('\n⚠️  Some API tests failed. Check the server logs for more details.');
  }
  
  console.log('\n💡 To run these tests:');
  console.log('   1. Start your server: npm run start:dev');
  console.log('   2. Run this script: node test-api-endpoints.js');
}

// Check if axios is available
try {
  require.resolve('axios');
  runApiTests().catch(console.error);
} catch (error) {
  console.log('❌ axios is not installed. Please install it first:');
  console.log('   npm install axios');
  console.log('\nThen run: node test-api-endpoints.js');
}

