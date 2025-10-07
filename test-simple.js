// Simple test without database
const testSimple = async () => {
    try {
        console.log('Testing health endpoint...');
        const healthResponse = await fetch('http://localhost:3000/health');
        const healthData = await healthResponse.json();
        console.log('Health response:', healthData);

        console.log('\nTesting auth endpoints exist...');
        const registerResponse = await fetch('http://localhost:3000/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'test@example.com',
                password: 'password123456'
            })
        });

        console.log('Register status:', registerResponse.status);
        const registerData = await registerResponse.text();
        console.log('Register response:', registerData);
    } catch (error) {
        console.error('Test failed:', error);
    }
};

testSimple();
