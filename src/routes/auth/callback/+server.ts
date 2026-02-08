import { redirect } from '@sveltejs/kit';
import type { Cookies } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY } from '$env/static/public';

export const GET = async ({ url, cookies }: { url: URL; cookies: Cookies }) => {
	const code = url.searchParams.get('code');
	const next = url.searchParams.get('next') || '/';

	if (code) {
		const supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY, {
			cookies: {
				getAll: () => cookies.getAll(),
				setAll: (cookieList) => {
					cookieList.forEach(({ name, value, options }) => {
						cookies.set(name, value, { ...options, path: '/' });
					});
				},
			},
		});

		const { error } = await supabase.auth.exchangeCodeForSession(code);
		if (!error) {
			throw redirect(303, next);
		}
	}

	// Return the user to an error page with instructions
	throw redirect(303, '/sign-in?error=auth_callback_error');
};
