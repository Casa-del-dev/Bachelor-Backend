import { Service } from '..';
import { User } from '../types';
import { hash, signJWT, verifyJWT } from '../util/crypto';

type GitHubTokenResponse = {
	access_token: string;
	token_type: string;
	scope: string;
};

type GitHubUser = {
	login: string;
	id: number;
	avatar_url: string;
	email: string | null;
};

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
	email: string;
};

const service: Service = {
	path: '/auth/v1/',

	fetch: async (request: Request, env: Env, ctx: ExecutionContext, subPath: string): Promise<Response | void> => {
		const authContext = await authenticateToken(request.headers, env);

		switch (request.method + ' ' + subPath.split('/')[0]) {
			case 'GET github/login': {
				const redirectUri = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&scope=user:email`;
				return Response.redirect(redirectUri, 302);
			}

			case 'GET github/callback': {
				const url = new URL(request.url);
				const code = url.searchParams.get('code');
				if (!code) return new Response('Missing code', { status: 400 });

				// Exchange code for token
				const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
					method: 'POST',
					headers: {
						Accept: 'application/json',
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						client_id: env.GITHUB_CLIENT_ID,
						client_secret: env.GITHUB_CLIENT_SECRET,
						code,
					}),
				});

				const tokenData = await tokenRes.json<GitHubTokenResponse>();
				const accessToken = tokenData.access_token;
				if (!accessToken) return new Response('Failed to get token', { status: 401 });

				// Get GitHub user info
				const userRes = await fetch('https://api.github.com/user', {
					headers: {
						Authorization: `Bearer ${accessToken}`,
						Accept: 'application/json',
					},
				});

				const gitHubUser = await userRes.json<GitHubUser>();
				if (!gitHubUser.login) return new Response('Failed to fetch GitHub user', { status: 401 });

				const payload: JWTPayload = {
					iat: Date.now(),
					jti: crypto.randomUUID(),
					username: gitHubUser.login,
					email: gitHubUser.email ?? '',
				};

				const jwt = await signJWT(payload, env.JWT_SECRET, 24 * 60 * 60);

				// You could also set a cookie here if you want session persistence
				return new Response(JSON.stringify({ token: jwt }), { status: 200 });
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
