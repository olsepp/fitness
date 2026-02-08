import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY } from '$env/static/public';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookies) => {
				cookies.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/' });
				});
			},
		},
	});

	event.locals.getSession = async () => {
		const {
			data: { user },
		} = await event.locals.supabase.auth.getUser();

		if (!user) return null;

		const {
			data: { session },
		} = await event.locals.supabase.auth.getSession();

		return session ?? null;
	};

	// Protect all routes except public ones
	const publicRoutes = ['/sign-in', '/auth', '/sign-out'];

	// Check auth for protected routes
	const path = event.url.pathname;
	const isPublicRoute = publicRoutes.some((route) => path.startsWith(route));

	if (!isPublicRoute) {
		const session = await event.locals.getSession();
		if (!session) {
			throw redirect(303, '/sign-in');
		}
	}

	const response = await resolve(event, {
		filterSerializedResponseHeaders: (name) => name === 'content-range',
	});

	// Add security headers
	response.headers.set('X-Frame-Options', 'SAMEORIGIN');
	response.headers.set('X-Content-Type-Options', 'nosniff');
	response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
	response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

	return response;
};
