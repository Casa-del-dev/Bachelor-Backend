import { Service } from '..';

const service: Service = {
	path: '/test/v1/',

	fetch: async (request: Request, env: Env, ctx: ExecutionContext, subPath: string): Promise<Response | void> => {
		switch (request.method + ' ' + subPath.split('/')[0]) {
			case 'GET ping': {
				return new Response('Pong');
			}
		}
	},
};

export default service;
