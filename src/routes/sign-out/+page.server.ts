import { redirect } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY } from '$env/static/public';

export const load = async ({ cookies }) => {
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

	await supabase.auth.signOut();
	throw redirect(303, '/sign-in');
};
