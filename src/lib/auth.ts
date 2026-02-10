import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Standardized authentication check for both client and server-side code.
 * @param supabase - The Supabase client (server or browser)
 * @returns The authenticated user
 * @throws Error if not authenticated
 */
export async function requireUser(supabase: SupabaseClient): Promise<User> {
	const { data: { user }, error } = await supabase.auth.getUser();

	if (error) {
		console.error('[requireUser] Session error:', error);
		throw new Error('Session error: ' + error.message);
	}

	if (!user) {
		throw new Error('Not authenticated');
	}

	return user;
}
