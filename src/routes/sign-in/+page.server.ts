import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { createServerClient } from '@supabase/ssr';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY } from '$env/static/public';

export const actions: Actions = {
	default: async ({ request, cookies }) => {
		const formData = await request.formData();
		const email = formData.get('email') as string;
		const password = formData.get('password') as string;

		if (!email || !password) {
			return fail(400, { error: 'Email and password are required', email });
		}

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

		const { error } = await supabase.auth.signInWithPassword({
			email: email.trim(),
			password,
		});

		if (error) {
			return fail(400, { error: error.message, email });
		}

		throw redirect(303, '/');
	},
};
