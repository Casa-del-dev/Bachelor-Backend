// service/reviewService.ts
import { Service } from '..';
import { authenticateToken } from './auth';
import { saveReview, loadReview, loadAllReviews } from '../util/ReviewStorage';
import type { ReviewPayload } from '../types';

const reviewService: Service = {
	path: '/review/v1/',

	fetch: async (request: Request, env: Env, ctx: ExecutionContext, subPath: string): Promise<Response | void> => {
		// 1) Determine verb first
		const verb = request.method + ' ' + subPath.split('/')[0];

		// 2) If it's "GET all", do NOT authenticate; just return the full list.
		if (verb === 'GET all') {
			try {
				const all = await loadAllReviews(env);
				return new Response(JSON.stringify(all), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			} catch {
				return new Response('Failed to load all reviews', { status: 500 });
			}
		}

		// 3) Otherwise, require authentication for "save" and "load"
		const authContext = await authenticateToken(request.headers, env);
		if (authContext instanceof Response) {
			return authContext; // e.g. 401/403
		}
		const username = authContext.username;

		// 4) Now handle the remaining verbs
		switch (verb) {
			// POST /review/v1/save
			case 'POST save': {
				let body: { rating: number; message: string };
				try {
					body = (await request.json()) as { rating: number; message: string };
				} catch {
					return new Response('Invalid JSON', { status: 400 });
				}

				if (typeof body.rating !== 'number' || body.rating < 0 || body.rating > 5 || typeof body.message !== 'string') {
					return new Response('Invalid payload', { status: 400 });
				}

				try {
					await saveReview(env, username, body.rating, body.message);
					return new Response('Review saved', { status: 201 });
				} catch {
					return new Response('Failed to save review', { status: 500 });
				}
			}

			// GET /review/v1/load
			case 'GET load': {
				let stored: ReviewPayload | null = null;
				try {
					stored = await loadReview(env, username);
				} catch {
					stored = null;
				}
				const payload: ReviewPayload = stored ?? { rating: 0, message: '' };
				return new Response(JSON.stringify(payload), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			// Any other route → 404
			default:
				return new Response('Not Found', { status: 404 });
		}
	},
};

export default reviewService;
