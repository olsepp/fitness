import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Standardized authentication check for both client and server-side code.
 * @param supabase - The Supabase client (server or browser)
 * @returns The authenticated user
 * @throws Error if not authenticated
 */
export async function requireUser(supabase: SupabaseClient): Promise<User> {
	console.log('[requireUser] ===== START =====');
	console.log('[requireUser] Supabase client received:', !!supabase);
	console.log('[requireUser] Supabase type:', typeof supabase);
	console.log('[requireUser] Supabase has auth:', !!supabase?.auth);
	console.log('[requireUser] Supabase.auth has getUser:', !!supabase?.auth?.getUser);

	console.log('[requireUser] Calling supabase.auth.getUser()...');
	console.log('[requireUser] Calling supabase.auth.getUser()...');

	try {
		const {
			data: { user },
			error
		} = await supabase.auth.getUser();

		console.log('[requireUser] getUser() completed');
		console.log('[requireUser] User exists:', !!user);
		console.log('[requireUser] User ID:', user?.id);
		console.log('[requireUser] Error:', error);

		if (error) {
			console.error('[requireUser] Auth error details:', error);
			console.error('[requireUser] Error message:', error.message);
			console.error('[requireUser] Error status:', error.status);
			throw new Error('Session error: ' + error.message);
		}

		if (!user) {
			console.error('[requireUser] No user found in session');
			throw new Error('Not authenticated');
		}

		console.log('[requireUser] User authenticated successfully:', user.id);
		console.log('[requireUser] ===== END =====');
		return user;
	} catch (err) {
		console.error('[requireUser] Exception caught:', err);
		console.error('[requireUser] Exception type:', typeof err);
		console.error('[requireUser] Exception details:', JSON.stringify(err, null, 2));
		throw err;
	}
}
