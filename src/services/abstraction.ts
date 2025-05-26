import { Service } from '..';
import { authenticateToken } from './auth';
import { saveAbstraction, loadAbstraction } from '../util/AbstractionTreeStorage'; // match your filename!
import { Abstraction } from '../types';

const service: Service = {
	path: '/abstraction/v1/',
	fetch: async (request: Request, env: Env, ctx: ExecutionContext, subPath: string): Promise<Response | void> => {
		const authContext = await authenticateToken(request.headers, env);
		if (authContext instanceof Response) return authContext;
		const username = authContext.username;

		const url = new URL(request.url);
		const [action] = subPath.split('/');

		switch (request.method + ' ' + action) {
			case 'POST saveAbstraction': {
				const problemId = url.searchParams.get('id');
				if (!problemId) {
					return new Response('Missing problemId', { status: 400 });
				}

				const body: any = await request.json();
				const abstraction = body.abstraction;

				if (!Array.isArray(abstraction)) {
					return new Response('Missing or invalid `abstraction`', { status: 400 });
				}

				await saveAbstraction(env, username, problemId, abstraction);
				return new Response('Abstraction saved', { status: 201 });
			}

			case 'GET loadAbstraction': {
				const problemId = url.searchParams.get('id');
				if (!problemId) {
					return new Response('Missing problemId', { status: 400 });
				}

				const abstraction = (await loadAbstraction(env, username, problemId)) ?? [];
				return new Response(JSON.stringify(abstraction), {
					status: 200,
					headers: { 'Content-Type': 'application/json' },
				});
			}

			default:
				return new Response('Not Found', { status: 404 });
		}
	},
};

export default service;
