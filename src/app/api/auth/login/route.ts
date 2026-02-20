import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
    try {
        const { username, password } = await request.json();

        // Mock authentication
        if (username === 'admin' && password === 'admin') {
            const response = NextResponse.json({ message: 'Login successful' }, { status: 200 });

            // Set a cookie
            response.cookies.set({
                name: 'auth_token',
                value: 'mock_jwt_token_12345',
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                path: '/',
                maxAge: 60 * 60 * 24, // 1 day
            });

            return response;
        }

        return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    } catch (error) {
        return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
    }
}
