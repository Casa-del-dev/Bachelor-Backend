import { Service } from '..';
import { authenticateToken } from './auth';
import { saveStepTree, loadStepTree } from '../util/stepTreeStorage';
import { Step } from '../types';

const service: Service = {
	path: '/problem/v2/',

	fetch: async (request: Request, env: Env, ctx: ExecutionContext, subPath: string): Promise<Response | void> => {
		const authContext = await authenticateToken(request.headers, env);
		const url = new URL(request.url);

		switch (request.method + ' ' + subPath.split('/')[0]) {
			case 'POST saveStepTree': {
				if (authContext instanceof Response) return authContext;

				const { problemId, stepTree } = (await request.json()) as {
					problemId: string;
					stepTree: Step[];
				};

				if (!problemId) return new Response('Missing problemId', { status: 400 });

				await saveStepTree(env, authContext.username, problemId, stepTree);

				return new Response('Step tree saved', { status: 201 });
			}

			case 'GET loadStepTree': {
				if (authContext instanceof Response) return authContext;

				const problemId = url.searchParams.get('id');
				if (!problemId) return new Response('Missing problemId', { status: 400 });

				const stepTree = await loadStepTree(env, authContext.username, problemId);

				if (!stepTree) return new Response('Not found', { status: 404 });

				return new Response(JSON.stringify(stepTree), {
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
