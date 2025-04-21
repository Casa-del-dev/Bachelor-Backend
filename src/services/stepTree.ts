// services/problemV2.ts
import { Service } from '..';
import { authenticateToken } from './auth';
import { saveStepTree, loadStepTree } from '../util/stepTreeStorage';
import { Step } from '../types';

interface SavePayload {
	problemId: string;
	stepTree: Step[];
}

const service: Service = {
	path: '/problem/v2/',

	fetch: async (req, env, _ctx, subPath) => {
		const auth = await authenticateToken(req.headers, env);
		if (auth instanceof Response) return auth;

		const url = new URL(req.url);

		switch (`${req.method} ${subPath.split('/')[0]}`) {
			/* POST /problem/v2/saveStepTree */
			case 'POST saveStepTree': {
				const { problemId, stepTree } = (await req.json()) as SavePayload;

				await saveStepTree(env, auth.username, problemId, stepTree);
				return new Response('Step tree saved', { status: 201 });
			}

			/* GET  /problem/v2/loadStepTree?id=<problemId> */
			case 'GET loadStepTree': {
				const problemId = url.searchParams.get('id');
				if (!problemId) return new Response('Missing problem ID', { status: 400 });

				const tree = await loadStepTree(env, auth.username, problemId);
				return new Response(JSON.stringify(tree), {
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
