import type { RequestEvent } from '@sveltejs/kit';
import { ExerciseRepository } from './exercise.repository';
import { WorkoutSessionRepository } from './workout-session.repository';
import { WorkoutExerciseRepository } from './workout-exercise.repository';
import { WorkoutSetRepository } from './workout-set.repository';
import { WorkoutTypeRepository } from './workout-type.repository';

/**
 * Factory function to create all repositories with the request event context.
 * 
 * IMPORTANT: This function accepts the entire RequestEvent, not just the Supabase client.
 * This is crucial for serverless environments (like Vercel) where passing the Supabase
 * client to external functions can break cookie bindings needed for authentication.
 * 
 * @example
 * ```typescript
 * export const load: PageServerLoad = async (event) => {
 *     const repos = createRepositories(event);
 *     const exercises = await repos.exercises.list();
 *     return { exercises };
 * };
 * ```
 */
export function createRepositories(event: RequestEvent) {
	return {
		exercises: new ExerciseRepository(event),
		workoutSessions: new WorkoutSessionRepository(event),
		workoutExercises: new WorkoutExerciseRepository(event),
		workoutSets: new WorkoutSetRepository(event),
		workoutTypes: new WorkoutTypeRepository(event)
	};
}

/**
 * Type alias for the repositories object returned by createRepositories.
 */
export type Repositories = ReturnType<typeof createRepositories>;

// Re-export repository classes for direct use if needed
export { ExerciseRepository } from './exercise.repository';
export { WorkoutSessionRepository } from './workout-session.repository';
export { WorkoutExerciseRepository } from './workout-exercise.repository';
export { WorkoutSetRepository } from './workout-set.repository';
export { WorkoutTypeRepository } from './workout-type.repository';
