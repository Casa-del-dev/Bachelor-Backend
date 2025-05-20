import * as services from './services';

export interface Service {
	path: string;
	fetch(request: Request, env: Env, ctx: ExecutionContext, subPath: string): Promise<Response | void>;
}

const addCORSHeaders = (response: Response): Response => {
	const corsHeaders = {
		'Access-Control-Allow-Origin': '*',
		'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
		'Access-Control-Allow-Headers': 'Content-Type, Authorization',
		'Access-Control-Max-Age': '86400',
	};

	const newHeaders = new Headers(response.headers);
	Object.entries(corsHeaders).forEach(([key, value]) => newHeaders.set(key, value));

	return new Response(response.body, {
		status: response.status,
		headers: newHeaders,
	});
};

export default {
	async fetch(request, env, ctx): Promise<Response> {
		try {
			if (request.method === 'OPTIONS') {
				return new Response(null, {
					status: 204,
					headers: {
						'Access-Control-Allow-Origin': '*',
						'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
						'Access-Control-Allow-Headers': 'Content-Type, Authorization',
						'Access-Control-Max-Age': '86400',
					},
				});
			}

			const url = new URL(request.url);
			const servicePath = `/${url.pathname.split('/').slice(1, 3).join('/')}/`;
			const subPath = url.pathname.substring(servicePath.length);

			console.log('🟡 Incoming URL:', url.pathname);
			console.log('🟢 servicePath:', servicePath);
			console.log('🔵 subPath:', subPath);

			const foundService = Object.values(services).find((service: Service) => service.path === servicePath);
			console.log('🟣 Matching service:', foundService?.path);

			if (foundService) {
				const serviceResponse = await foundService.fetch(request, env, ctx, subPath);
				if (serviceResponse) {
					return addCORSHeaders(serviceResponse);
				}
			} else if (url.pathname === '/') {
				return addCORSHeaders(new Response('Welcome to the API!'));
			}

			return addCORSHeaders(new Response('Service not implemented', { status: 501 }));
		} catch (err) {
			console.error(`Error on request ${request.url}`, err);
			return addCORSHeaders(new Response('Internal Server Error', { status: 500 }));
		}
	},
} satisfies ExportedHandler<Env>;
