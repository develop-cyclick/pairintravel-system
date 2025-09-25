// Test script for /api/customers endpoint
const testCustomerAPI = async () => {
  // First, login to get session
  const loginResponse = await fetch('http://localhost:3001/api/auth/signin/credentials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'admin@flightbooking.gov.th',
      password: 'password123',
      redirect: false
    }),
    credentials: 'include'
  });

  if (!loginResponse.ok) {
    console.error('Login failed');
    return;
  }

  const cookies = loginResponse.headers.get('set-cookie');
  console.log('Login successful');

  // Test GET /api/customers
  console.log('\n--- Testing GET /api/customers ---');
  const getResponse = await fetch('http://localhost:3001/api/customers?search=test', {
    headers: {
      'Cookie': cookies || ''
    }
  });

  if (getResponse.ok) {
    const data = await getResponse.json();
    console.log('GET Success:', JSON.stringify(data, null, 2).substring(0, 200), '...');
  } else {
    console.log('GET Failed:', getResponse.status, await getResponse.text());
  }

  // Test POST /api/customers with valid data
  console.log('\n--- Testing POST /api/customers ---');
  const testCustomer = {
    title: 'Mr.',
    firstName: 'John',
    lastName: 'Doe',
    email: `test${Date.now()}@example.com`,
    phone: '0812345678',
    nationalId: '1234567890123',
    passportNo: '',
    dateOfBirth: '1990-01-15',
    nationality: 'Thai'
  };

  console.log('Sending:', JSON.stringify(testCustomer, null, 2));

  const postResponse = await fetch('http://localhost:3001/api/customers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies || ''
    },
    body: JSON.stringify(testCustomer)
  });

  if (postResponse.ok) {
    const data = await postResponse.json();
    console.log('POST Success:', JSON.stringify(data, null, 2));
  } else {
    const errorText = await postResponse.text();
    console.log('POST Failed:', postResponse.status);
    try {
      const errorData = JSON.parse(errorText);
      console.log('Error details:', JSON.stringify(errorData, null, 2));
    } catch {
      console.log('Error text:', errorText);
    }
  }

  // Test POST with minimal data
  console.log('\n--- Testing POST with minimal data ---');
  const minimalCustomer = {
    title: '',
    firstName: 'Jane',
    lastName: 'Smith',
    email: `minimal${Date.now()}@example.com`,
    phone: '',
    nationalId: '',
    passportNo: '',
    dateOfBirth: '1995-05-20',
    nationality: ''
  };

  console.log('Sending minimal:', JSON.stringify(minimalCustomer, null, 2));

  const minimalResponse = await fetch('http://localhost:3001/api/customers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': cookies || ''
    },
    body: JSON.stringify(minimalCustomer)
  });

  if (minimalResponse.ok) {
    const data = await minimalResponse.json();
    console.log('Minimal POST Success:', JSON.stringify(data, null, 2));
  } else {
    const errorText = await minimalResponse.text();
    console.log('Minimal POST Failed:', minimalResponse.status);
    try {
      const errorData = JSON.parse(errorText);
      console.log('Error details:', JSON.stringify(errorData, null, 2));
    } catch {
      console.log('Error text:', errorText);
    }
  }
};

testCustomerAPI().catch(console.error);