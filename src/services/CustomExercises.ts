import { Service } from '..';
import { authenticateToken } from './auth';
import type { EnvR2 } from '../util/customProblemStorage';
import type { ProblemPayload } from '../types';
import { saveProblem, loadProblem, loadAllProblems, deleteProblem } from '../util/customProblemStorage';

const problemService: Service = {
	path: '/customProblems/v1/',

	fetch: async (request: Request, env: Env & EnvR2, ctx: ExecutionContext, subPath: string): Promise<Response | void> => {
		// Authenticate all operations
		const auth = await authenticateToken(request.headers, env);
		if (auth instanceof Response) return auth;
		const username = auth.username;

		const urlParts = subPath ? subPath.split('/') : [];
		// GET all metadata for the user
		if (request.method === 'GET' && urlParts.length === 0) {
			try {
				const all = await loadAllProblems(env, username);
				return new Response(JSON.stringify(all), { status: 200, headers: { 'Content-Type': 'application/json' } });
			} catch {
				return new Response('Failed to load problems', { status: 500 });
			}
		}

		// Extract id and optional variant
		const [id, variant] = urlParts;

		// POST save: POST /customProblems/v1/save
		if (request.method === 'POST' && id === 'save') {
			let body: Partial<ProblemPayload>;
			try {
				body = (await request.json()) as Partial<ProblemPayload>;
			} catch {
				return new Response('Invalid JSON', { status: 400 });
			}
			const newId = body.id || crypto.randomUUID();
			if (
				typeof body.name !== 'string' ||
				typeof body.description !== 'string' ||
				typeof body.defaultText !== 'string' ||
				typeof body.tests !== 'string'
			) {
				return new Response('Invalid payload fields', { status: 400 });
			}
			const payload: ProblemPayload = {
				id: newId,
				name: body.name,
				description: body.description,
				defaultText: body.defaultText,
				tests: body.tests,
			};
			try {
				await saveProblem(env, username, payload);
				return new Response(JSON.stringify({ id: newId }), { status: 201, headers: { 'Content-Type': 'application/json' } });
			} catch {
				return new Response('Failed to save problem', { status: 500 });
			}
		}

		// For GET, PUT, DELETE, id must exist
		if (!id) return new Response('Not Found', { status: 404 });

		switch (request.method) {
			case 'GET': {
				const problem = await loadProblem(env, username, id);
				if (!problem) return new Response('Not Found', { status: 404 });
				// Variant handling
				if (variant === 'nameOnly') {
					const { id: pid, name } = problem;
					return new Response(JSON.stringify({ id: pid, name }), { status: 200, headers: { 'Content-Type': 'application/json' } });
				}
				if (variant === 'info') {
					const { id: pid, name, description } = problem;
					return new Response(JSON.stringify({ id: pid, name, description }), {
						status: 200,
						headers: { 'Content-Type': 'application/json' },
					});
				}
				if (!variant) {
					return new Response(JSON.stringify(problem), { status: 200, headers: { 'Content-Type': 'application/json' } });
				}
				return new Response('Not Found', { status: 404 });
			}

			case 'PUT': {
				let body: Partial<ProblemPayload>;
				try {
					body = (await request.json()) as Partial<ProblemPayload>;
				} catch {
					return new Response('Invalid JSON', { status: 400 });
				}
				const existing = await loadProblem(env, username, id);
				if (!existing) return new Response('Not Found', { status: 404 });
				const updated: ProblemPayload = {
					id,
					name: body.name ?? existing.name,
					description: body.description ?? existing.description,
					defaultText: body.defaultText ?? existing.defaultText,
					tests: body.tests ?? existing.tests,
				};
				try {
					await saveProblem(env, username, updated);
					return new Response('Updated', { status: 200 });
				} catch {
					return new Response('Failed to update problem', { status: 500 });
				}
			}

			case 'DELETE': {
				try {
					await deleteProblem(env, username, id);
					return new Response('Deleted', { status: 204 });
				} catch {
					return new Response('Failed to delete problem', { status: 500 });
				}
			}

			default:
				return new Response('Not Found', { status: 404 });
		}
	},
};

export default problemService;
