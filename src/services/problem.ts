import { Service } from '..';
import { authenticateToken } from './auth';
import { saveProblem, loadProblem } from '../util/problemStorage';
import { Tree } from '../types';

const service: Service = {
	path: '/problem/v1/',

	fetch: async (request: Request, env: Env, ctx: ExecutionContext, subPath: string): Promise<Response | void> => {
		const authContext = await authenticateToken(request.headers, env);
		const url = new URL(request.url);

		switch (request.method + ' ' + subPath.split('/')[0]) {
			case 'POST save': {
				if (authContext instanceof Response) return authContext;

				const { problemId, tree, codeMap, deletedFiles } = (await request.json()) as {
					problemId: string;
					tree: Tree;
					codeMap: Record<string, string>;
					deletedFiles?: string[];
				};

				await saveProblem(env, authContext.username, problemId, tree, codeMap, deletedFiles);

				return new Response('Problem saved', { status: 201 });
			}

			case 'GET load': {
				if (authContext instanceof Response) return authContext;

				const problemId = url.searchParams.get('id');
				if (!problemId) return new Response('Missing problem ID', { status: 400 });

				let problem = null;
				try {
					problem = await loadProblem(env, authContext.username, problemId);
				} catch (err) {
					// If loadProblem() itself throws, treat that as “no data.”
					console.error('loadProblem threw:', err);
					problem = null;
				}

				// If there was no saved data, return an explicit “empty” JSON structure
				if (problem === null) {
					// Pick whatever shape your frontend expects—for instance:
					const emptyPayload = {
						tree: { rootNode: { children: [] } },
						codeMap: {}, // no existing code
						currentFile: null, // no file selected yet
					};
					return new Response(JSON.stringify(emptyPayload), {
						status: 200,
						headers: { 'Content-Type': 'application/json' },
					});
				}

				// Otherwise, return whatever loadProblem() gave you:
				return new Response(JSON.stringify(problem), {
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
