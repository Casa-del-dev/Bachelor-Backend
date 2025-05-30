import { Service } from '..';
import { authenticateToken } from './auth';
import { saveAbstractionInbetween, loadAbstractionInbetween } from '../util/AbstractionStorage';
import { Step } from '../types';

const service: Service = {
	path: '/abstractionInbetween/v1/',

	fetch: async (request, env, ctx, subPath) => {
		const authContext = await authenticateToken(request.headers, env);
		if (authContext instanceof Response) return authContext;

		const username = authContext.username;
		const url = new URL(request.url);
		const problemId = url.searchParams.get('problemId')!;
		const abstractionId = url.searchParams.get('abstractionId')!;

		switch (request.method + ' ' + subPath.split('/')[0]) {
			case 'POST saveAbstraction': {
				const { steps } = (await request.json()) as { steps: Step[] };
				await saveAbstractionInbetween(env, username, problemId, abstractionId, steps);
				return new Response('Saved', { status: 201 });
			}

			case 'GET loadAbstraction': {
				const data = await loadAbstractionInbetween(env, username, problemId, abstractionId);
				if (data === null) return new Response('Not found', { status: 404 });
				// return the raw array
				return new Response(JSON.stringify(data), {
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
