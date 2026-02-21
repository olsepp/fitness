export type WorkoutType = {
	id: string;
	key: string;
	name: string;
	icon: string | null;
};

export type ExerciseType = 'strength' | 'cardio';

export type Exercise = {
	id: string;
	user_id: string;
	name: string;
	notes: string | null;
	exercise_type: ExerciseType;
	created_at: string;
};

export type WorkoutSet = {
	id: string;
	workout_exercise_id: string;
	reps: number;
	weight: number | null;
	distance: number | null;
	order_index: number;
	created_at: string;
};

export type WorkoutExercise = {
	id: string;
	workout_session_id: string;
	exercise_id: string;
	name_snapshot: string;
	notes: string | null;
	is_completed: boolean;
	order_index: number;
	workout_set?: WorkoutSet[];
	exercise_type?: ExerciseType;
	created_at: string;
};

export type WorkoutSession = {
	id: string;
	user_id: string;
	workout_type_id: string;
	date: string;
	notes: string | null;
	is_completed: boolean;
	workout_type?: WorkoutType;
	workout_exercise?: WorkoutExercise[];
	created_at: string;
};
