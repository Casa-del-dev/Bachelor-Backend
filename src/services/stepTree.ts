import { Service } from '..';
import { authenticateToken } from './auth';
import { saveStepTree, loadStepTree } from '../util/stepTreeStorage';
import { Step } from '../types';

const service: Service = {
	path: '/problem/v2/',

	fetch: async (req, env, _ctx, subPath) => {
		// 1) auth
		const auth = await authenticateToken(req.headers, env);
		if (auth instanceof Response) return auth;
		const username = auth.username;

		// subPath: e.g. "123/stepTree"
		const [rawProblemId, segment] = subPath.replace(/\/$/, '').split('/');
		const problemId = decodeURIComponent(rawProblemId);
		try {
			if (req.method === 'POST' && segment === 'stepTree') {
				// POST /problem/v2/:problemId/stepTree
				const { stepTree } = (await req.json()) as { stepTree: Step[] };
				if (!problemId) return Response.json({ error: 'Missing problemId' }, { status: 400 });

				await saveStepTree(env, username, problemId, stepTree);
				return new Response(null, { status: 201 });
			}

			if (req.method === 'GET' && segment === 'stepTree') {
				// GET /problem/v2/:problemId/stepTree
				if (!problemId) return Response.json({ error: 'Missing problemId' }, { status: 400 });

				const tree = await loadStepTree(env, username, problemId);
				if (!tree) return Response.json({ error: 'Not found' }, { status: 404 });
				return Response.json(tree);
			}

			return new Response('Not Found', { status: 404 });
		} catch (err: any) {
			// catch any unexpected errors
			return Response.json({ error: err.message }, { status: 500 });
		}
	},
};

export default service;
