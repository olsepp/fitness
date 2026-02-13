import type { RequestEvent } from '@sveltejs/kit';
import type { User } from '@supabase/supabase-js';

/**
 * Base repository class that provides common functionality for all repositories.
 * 
 * IMPORTANT: This class accepts the entire RequestEvent, not just the Supabase client.
 * This is crucial for serverless environments (like Vercel) where passing the Supabase
 * client to external functions can break cookie bindings needed for authentication.
 * 
 * By accessing supabase through event.locals.supabase within the repository methods,
 * we ensure the cookie closures remain valid throughout the request lifecycle.
 */
export abstract class BaseRepository {
	protected userId: string | null = null;

	constructor(protected event: RequestEvent) {}

	/**
	 * Get the Supabase client from the event locals.
	 * This ensures cookie bindings remain valid in serverless environments.
	 */
	protected get supabase() {
		return this.event.locals.supabase;
	}

	/**
	 * Require an authenticated user and return the user object.
	 * Throws an error if not authenticated.
	 */
	protected async requireUser(): Promise<User> {
		const session = await this.event.locals.getSession();
		if (!session?.user) {
			throw new Error('Not authenticated');
		}
		this.userId = session.user.id;
		return session.user;
	}

	/**
	 * Get the current user's ID, fetching it if not already cached.
	 */
	protected async getUserId(): Promise<string> {
		if (this.userId) return this.userId;
		const user = await this.requireUser();
		return user.id;
	}

	/**
	 * Check if the current user owns a resource by user_id.
	 */
	protected async verifyOwnership(resourceUserId: string): Promise<boolean> {
		const userId = await this.getUserId();
		return resourceUserId === userId;
	}
}
