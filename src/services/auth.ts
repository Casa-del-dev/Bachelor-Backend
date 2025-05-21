import { Service } from '..';
import { signJWT, verifyJWT } from '../util/crypto';

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

export type JWTPayload = {
	iat: number;
	jti: string;
	username: string;
	email: string;
};

const service: Service = {
	path: '/auth/v1/',

	fetch: async (request, env, ctx, subPath) => {
		switch (request.method + ' ' + subPath) {
			// 1) Kick off OAuth
			case 'GET github/login': {
				const url = new URL(request.url);
				const state = url.searchParams.get('state') || '';

				const githubAuthUrl =
					'https://github.com/login/oauth/authorize' +
					`?client_id=${env.GITHUB_CLIENT_ID}` +
					`&scope=user:email` +
					`&redirect_uri=${encodeURIComponent('https://bachelor-api.erenhomburg.com/auth/v1/github/callback')}` +
					`&state=${state}`;

				return Response.redirect(githubAuthUrl, 302);
			}

			// 2) Frontend calls this to exchange code → JSON
			case 'GET github/callback': {
				const url = new URL(request.url);
				const code = url.searchParams.get('code');
				const clientRedirect = url.searchParams.get('client_redirect') ?? 'https://bachelor.erenhomburg.com/';

				if (!code) return new Response('Missing code', { status: 400 });

				// Exchange code for token
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
				if (!tokenRes.ok) {
					const err = await tokenRes.text();
					console.error('Token exchange failed:', tokenRes.status, err);
					return new Response('OAuth token exchange failed', { status: 500 });
				}
				const { access_token } = await tokenRes.json<GitHubTokenResponse>();
				if (!access_token) {
					console.error('No access token in response');
					return new Response('No access token', { status: 500 });
				}

				// Fetch GitHub user
				const userRes = await fetch('https://api.github.com/user', {
					headers: {
						Authorization: `Bearer ${access_token}`,
						Accept: 'application/json',
						'User-Agent': 'DecompositionBox/1.0',
					},
				});
				if (!userRes.ok) {
					const err = await userRes.text();
					console.error('GitHub /user failed:', userRes.status, err);
					return new Response('Failed to fetch user', { status: 500 });
				}
				const gitHubUser = await userRes.json<GitHubUser>();

				// Sign JWT
				const payload: JWTPayload = {
					iat: Date.now(),
					jti: crypto.randomUUID(),
					username: gitHubUser.login,
					email: gitHubUser.email || '',
				};
				const jwt = await signJWT(payload, env.JWT_SECRET, 24 * 60 * 60 * 10);

				// Return JSON
				const redirectUrl = new URL(clientRedirect);
				redirectUrl.searchParams.set('token', jwt);
				redirectUrl.searchParams.set('username', gitHubUser.login);
				if (gitHubUser.email) redirectUrl.searchParams.set('email', gitHubUser.email);

				return Response.redirect(redirectUrl.toString(), 302);
			}

			default:
				return new Response('Not Found', { status: 404 });
		}
	},
};

export default service;

export async function authenticateToken(headers: Headers, env: Env): Promise<JWTPayload | Response> {
	const authHeader = headers.get('Authorization');
	if (!authHeader) return new Response('Invalid token', { status: 401 });
	const token = authHeader.split(' ')[1];
	const payload = await verifyJWT<JWTPayload>(token, env.JWT_SECRET);
	if (!payload) return new Response('Invalid token', { status: 401 });
	return payload;
}
