// src/services/abstractionInbetween.ts
import { Service } from '..';
import { authenticateToken } from './auth';
import {
	saveAbstractionInbetween,
	loadAbstractionInbetween,
	deleteAbstractionInbetween,
	deleteAllAbstractionInbetween,
} from '../util/AbstractionStorage';
import { Step } from '../types';

const service: Service = {
	path: '/abstractionInbetween/v1/',

	fetch: async (request: Request, env: Env, ctx: ExecutionContext, subPath: string) => {
		const authContext = await authenticateToken(request.headers, env);
		if (authContext instanceof Response) return authContext;
		const username = authContext.username;

		const url = new URL(request.url);
		const problemId = url.searchParams.get('problemId');
		const abstractionId = url.searchParams.get('abstractionId');

		console.log('➡️ Incoming subPath:', subPath);
		// Fail early if problemId is missing — always required
		if (!problemId) {
			return new Response('Missing problemId', { status: 400 });
		}

		// Only require abstractionId for routes that use it
		const action = subPath.split('/')[0];
		const method = request.method;

		if (
			(method === 'POST' && action === 'saveAbstraction') ||
			(method === 'GET' && action === 'loadAbstraction') ||
			(method === 'DELETE' && action === 'deleteAbstraction')
		) {
			if (!abstractionId) {
				return new Response('Missing abstractionId', { status: 400 });
			}
		}
		const safeAbstractionId = abstractionId!;

		switch (request.method + ' ' + subPath.split('/')[0]) {
			case 'POST saveAbstraction': {
				// now accept the three flags plus steps
				const { steps, isAvailable, allIsAvailable, allIsHinted } = (await request.json()) as {
					steps: Step[];
					isAvailable: boolean;
					allIsAvailable: boolean;
					allIsHinted: boolean;
				};

				await saveAbstractionInbetween(env, username, problemId, safeAbstractionId, {
					steps,
					isAvailable,
					allIsAvailable,
					allIsHinted,
				});

				return new Response(null, { status: 201 });
			}

			case 'GET loadAbstraction': {
				const data = await loadAbstractionInbetween(env, username, problemId, safeAbstractionId);
				if (!data) return new Response(null, { status: 204 }); // no content

				return new Response(JSON.stringify(data), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			case 'DELETE deleteAbstraction': {
				try {
					await deleteAbstractionInbetween(env, username, problemId, safeAbstractionId);
					// If you prefer to return 200 instead of 204, adjust here
					return new Response(null, { status: 204 });
				} catch (err: any) {
					// If your delete helper throws, send back an error response
					console.error('Error deleting abstraction:', err);
					return new Response(`Failed to delete abstraction: ${err.message}`, {
						status: 500,
					});
				}
			}

			case 'DELETE deleteAllAbstractions': {
				try {
					await deleteAllAbstractionInbetween(env, username, problemId);
					return new Response(null, { status: 204 });
				} catch (err: any) {
					console.error('Error deleting all abstractions:', err);
					return new Response(`Failed to delete all abstractions: ${err.message}`, {
						status: 500,
					});
				}
			}

			default:
				return new Response('Not Found', { status: 404 });
		}
	},
};

export default service;
