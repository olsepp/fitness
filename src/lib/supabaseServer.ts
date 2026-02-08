import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY } from '$env/static/public';
import type { Cookies } from '@sveltejs/kit';

export const createServerSupabaseClient = (cookies: Cookies) => {
	return createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY, {
		cookies: {
			getAll: () => cookies.getAll(),
			setAll: (cookieList) => {
				cookieList.forEach(({ name, value, options }) => {
					cookies.set(name, value, { ...options, path: '/' });
				});
			},
		},
	});
};
