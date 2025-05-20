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

		console.log('🔍 URL:', request.url);
		console.log('🔍 subPath:', subPath);
		console.log('🔍 match key:', request.method + ' ' + subPath);

		switch (request.method + ' ' + subPath) {
			case 'GET github/login': {
				const redirectUri = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&scope=user:email`;
				return Response.redirect(redirectUri, 302);
			}

			case 'GET github/callback': {
				const url = new URL(request.url);
				const code = url.searchParams.get('code');
				if (!code) return new Response('Missing code', { status: 400 });

				console.log('🛬 Callback hit with code:', code);

				try {
					const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
						method: 'POST',
						headers: {
							Accept: 'application/json',
							'Content-Type': 'application/x-www-form-urlencoded',
						},
						body: new URLSearchParams({
							client_id: env.GITHUB_CLIENT_ID,
							client_secret: env.GITHUB_CLIENT_SECRET,
							code,
						}),
					});

					const tokenRaw = await tokenRes.text();
					console.log('🧪 Raw token response:', tokenRaw);

					const tokenData = JSON.parse(tokenRaw); // manually parse to catch issues
					const accessToken = tokenData.access_token;

					if (!accessToken) {
						console.error('❌ No access token:', tokenData);
						return new Response('Failed to get token', { status: 401 });
					}

					const userRes = await fetch('https://api.github.com/user', {
						headers: {
							Authorization: `Bearer ${accessToken}`,
							Accept: 'application/json',
						},
					});

					const userRaw = await userRes.text();
					console.log('👤 Raw user response:', userRaw);

					const gitHubUser: GitHubUser = JSON.parse(userRaw);
					if (!gitHubUser.login) {
						console.error('❌ GitHub user login missing:', gitHubUser);
						return new Response('Failed to fetch GitHub user', { status: 401 });
					}

					const payload: JWTPayload = {
						iat: Date.now(),
						jti: crypto.randomUUID(),
						username: gitHubUser.login,
						email: gitHubUser.email ?? '',
					};

					console.log('✅ JWT payload:', payload);

					const jwt = await signJWT(payload, env.JWT_SECRET, 24 * 60 * 60);
					return new Response(JSON.stringify({ token: jwt }), { status: 200 });
				} catch (err) {
					console.error('🔥 Error during GitHub callback:', err);
					return new Response('Internal Server Error', { status: 500 });
				}
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
