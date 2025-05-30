import { Service } from '..';
import { authenticateToken } from './auth';
import { saveAbstractionInbetween, loadAbstractionInbetween } from '../util/AbstractionStorage';
import { Step } from '../types';

const service: Service = {
	path: '/abstractionInbetween/v1/',

	fetch: async (request: Request, env: Env, ctx: ExecutionContext, subPath: string): Promise<Response | void> => {
		const authContext = await authenticateToken(request.headers, env);
		if (authContext instanceof Response) return authContext;
		const username = authContext.username;

		const url = new URL(request.url);
		const problemId = url.searchParams.get('problemId');
		if (!problemId) {
			return new Response('Missing problemId', { status: 400 });
		}

		switch (request.method + ' ' + subPath.split('/')[0]) {
			case 'POST saveAbstraction': {
				// body: { steps: Step[] }
				const { steps } = (await request.json()) as { steps: Step[] };
				await saveAbstractionInbetween(env, username, problemId, steps);
				return new Response('Abstraction in-between saved', { status: 201 });
			}

			case 'GET loadAbstraction': {
				const data = await loadAbstractionInbetween(env, username, problemId);
				if (data === null) {
					return new Response('Not found', { status: 404 });
				}
				return new Response(JSON.stringify({ steps: data }), {
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
