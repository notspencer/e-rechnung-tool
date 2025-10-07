// Simple test script for auth endpoints
const testAuth = async () => {
    try {
        // Test registration
        console.log('Testing registration...');
        const registerResponse = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'password123456',
                tenantName: 'Test Company'
            })
        });

        const registerData = await registerResponse.json();
        console.log('Registration response:', registerData);

        if (registerResponse.ok) {
            // Test login
            console.log('\nTesting login...');
            const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: 'test@example.com',
                    password: 'password123456'
                })
            });

            const loginData = await loginResponse.json();
            console.log('Login response:', loginData);

            if (loginResponse.ok && loginData.accessToken) {
                // Test /me endpoint
                console.log('\nTesting /me endpoint...');
                const meResponse = await fetch('http://localhost:3000/api/auth/me', {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${loginData.accessToken}`,
                        'Content-Type': 'application/json',
                    }
                });

                const meData = await meResponse.json();
                console.log('Me response:', meData);
            }
        }
    } catch (error) {
        console.error('Test failed:', error);
    }
};

testAuth();
