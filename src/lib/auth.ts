import { supabase } from '$lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

/**
 * Standardized authentication check for client-side API calls.
 * Throws an error if the user is not authenticated.
 * @returns The authenticated user
 * @throws Error if not authenticated or if auth check times out
 */
export async function requireUser(): Promise<User> {
	// Add timeout to prevent infinite hanging
	const timeoutPromise = new Promise<never>((_, reject) => {
		setTimeout(() => reject(new Error('Supabase auth timeout - check your SUPABASE_ANON_KEY')), 5000);
	});

	try {
		const result = await Promise.race([
			supabase.auth.getUser(),
			timeoutPromise
		]);

		const { data: { user }, error } = result;

		if (error) {
			console.error('[requireUser] Session error:', error);
			throw new Error('Session error: ' + error.message);
		}

		if (user) {
			return user;
		}

		// Allow a microtask for auth state to settle right after sign-in
		await Promise.resolve();
		const { data: { user: retryUser }, error: retryError } = await supabase.auth.getUser();

		if (retryError) {
			throw new Error('Session error: ' + retryError.message);
		}

		if (retryUser) {
			return retryUser;
		}

		throw new Error('Not authenticated');
	} catch (err) {
		console.error('[requireUser] Error:', err);
		throw err;
	}
}
