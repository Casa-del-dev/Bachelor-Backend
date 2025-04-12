import * as services from './services';

export interface Service {
	path: string;
	fetch(request: Request, env: Env, ctx: ExecutionContext, subPath: string): Promise<Response | void>;
}

export default {
	async fetch(request, env, ctx): Promise<Response> {
		try {
			if (request.method === 'OPTIONS') {
				return new Response(null, {
					status: 204,
					headers: {
						'Access-Control-Allow-Origin': '*', //'https://bachelor.erenhomburg.com', // TODO: update in production
						'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
						'Access-Control-Allow-Headers': 'Content-Type, Authorization',
						'Access-Control-Max-Age': '86400',
					},
				});
			}

			const url = new URL(request.url);
			const servicePath = `/${url.pathname.split('/').slice(1, 3).join('/')}/`;
			const subPath = url.pathname.substring(servicePath.length);

			const foundService = Object.values(services).filter((service: Service) => service.path === servicePath)[0];

			if (foundService) {
				const serviceResponse = await foundService.fetch(request, env, ctx, subPath);

				if (serviceResponse) {
					const corsHeaders = {
						'Access-Control-Allow-Origin': '*', // TODO: set your real frontend origin for production
						'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
						'Access-Control-Allow-Headers': 'Content-Type, Authorization',
						'Access-Control-Max-Age': '86400',
					};

					// Create a new response with merged headers
					const newHeaders = new Headers(serviceResponse.headers);
					Object.entries(corsHeaders).forEach(([key, value]) => newHeaders.set(key, value));

					const modifiedResponse = new Response(await serviceResponse.text(), {
						status: serviceResponse.status,
						headers: newHeaders,
					});

					return modifiedResponse;
				}
			}

			return new Response('Service not implemented', { status: 501 });
		} catch (err) {
			console.error(`Error on request ${request.url}`, err);
			return new Response('Internal Server Error', { status: 500 });
		}
	},
} satisfies ExportedHandler<Env>;
