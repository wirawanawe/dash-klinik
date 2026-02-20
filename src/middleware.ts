import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
    const authToken = request.cookies.get('auth_token')?.value;
    const { pathname } = request.nextUrl;

    // Protect /dashboard routes
    if (pathname.startsWith('/dashboard')) {
        if (!authToken) {
            const url = new URL('/login', request.url);
            return NextResponse.redirect(url);
        }
    }

    // Redirect / to /dashboard (which will then redirect to login if needed)
    if (pathname === '/') {
        const url = new URL('/dashboard', request.url);
        return NextResponse.redirect(url);
    }

    // Redirect logged-in users away from login page
    if (pathname === '/login') {
        if (authToken) {
            const url = new URL('/dashboard', request.url);
            return NextResponse.redirect(url);
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/', '/login', '/dashboard/:path*'],
};
