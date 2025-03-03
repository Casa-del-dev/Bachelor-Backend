import { Service } from '..';
import { User } from '../types';
import { hash, signJWT, verifyJWT } from '../util/crypto';

type SignUpPayload = {
	username: string;
	password: string;
	email: string;
};

type SignInPayload = {
	username: string;
	password: string;
};

type AuthTokenResponse = {
	token: string;
};

export type JWTPayload = {
	iat: number;
	jti: string;
	username: string;
};

const service: Service = {
	path: '/auth/v1/',

	fetch: async (request: Request, env: Env, ctx: ExecutionContext, subPath: string): Promise<Response | void> => {
		const authContext = await authenticateToken(request.headers, env);

		switch (request.method + ' ' + subPath.split('/')[0]) {
			case 'POST signup': {
				const { email, password, username } = await request.json<SignUpPayload>();
				const hashedPasswordPromise = hash(password);

				const oldUser = await env.users.get(username);

				if (oldUser) {
					return new Response('User already exists', { status: 409 });
				}

				const userData: User = {
					email,
					username,
					password: await hashedPasswordPromise,
				};

				await env.users.put(username, JSON.stringify(userData));

				return new Response('User created successfully', { status: 201 });
			}
			case 'POST login': {
				const { username, password } = await request.json<SignInPayload>();

				const userData: User | null = await env.users.get(username, 'json');
				if (!userData) return new Response('User not found', { status: 400 });

				if (userData.password !== (await hash(password))) return new Response('Invalid password', { status: 400 });

				const payload: JWTPayload = { iat: Date.now(), jti: crypto.randomUUID(), username };
				const token = await signJWT(payload, env.JWT_SECRET, 24 * 60 * 60);

				const response: AuthTokenResponse = { token };
				return new Response(JSON.stringify(response), { status: 200 });
			}
			case 'GET auth': {
				if (authContext instanceof Response) return authContext;
				return new Response('Authenticated', { status: 200 });
			}
			default:
				return new Response('Not Found', { status: 404 });
		}
	},
};

export async function authenticateToken(headers: Headers, env: Env): Promise<JWTPayload | Response> {
	const authHeader = headers.get('Authorization');
	if (!authHeader) return new Response('Invalid token', { status: 401 });

	const token = authHeader.split(' ')[1];
	const context = await verifyJWT<JWTPayload>(token, env.JWT_SECRET);

	if (!context) {
		return new Response('Invalid token', { status: 401 });
	}

	return context;
}

export default service;
