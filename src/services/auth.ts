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

		switch (request.method + ' ' + subPath) {
			case 'GET github/login': {
				const redirectUri = `https://github.com/login/oauth/authorize?client_id=${env.GITHUB_CLIENT_ID}&scope=user:email&redirect_uri=https://bachelor-api.erenhomburg.com/auth/v1/github/callback`;
				return Response.redirect(redirectUri, 302);
			}

			case 'GET github/callback': {
				const url = new URL(request.url);
				const code = url.searchParams.get('code');
				if (!code) return new Response('Missing code', { status: 400 });

				console.log(
					'🔐 Full token request body:',
					new URLSearchParams({
						client_id: env.GITHUB_CLIENT_ID,
						client_secret: env.GITHUB_CLIENT_SECRET,
						code,
						redirect_uri: 'https://bachelor-api.erenhomburg.com/auth/v1/github/callback',
					}).toString()
				);

				console.log('✅ Secrets present:', {
					client_id_ok: !!env.GITHUB_CLIENT_ID,
					secret_ok: !!env.GITHUB_CLIENT_SECRET,
				});

				const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
					method: 'POST',
					headers: {
						Accept: 'application/json, application/x-www-form-urlencoded',
						'Content-Type': 'application/x-www-form-urlencoded',
					},
					body: new URLSearchParams({
						client_id: env.GITHUB_CLIENT_ID,
						client_secret: env.GITHUB_CLIENT_SECRET,
						code,
						redirect_uri: 'https://bachelor-api.erenhomburg.com/auth/v1/github/callback',
					}),
				});

				// Always grab as text
				const tokenText = await tokenRes.text();
				console.log('🧪 Raw token response:', tokenText);

				let accessToken: string;
				try {
					// If it’s JSON, parse it
					if (tokenText.trim().startsWith('{')) {
						const json = JSON.parse(tokenText) as GitHubTokenResponse;
						accessToken = json.access_token;
					} else {
						// Otherwise treat it as URL-encoded
						const params = new URLSearchParams(tokenText);
						accessToken = params.get('access_token') || '';
					}
				} catch (err) {
					console.error('❌ Could not parse access token:', err);
					return new Response('Invalid token response from GitHub', { status: 500 });
				}

				if (!accessToken) {
					console.error('❌ No access_token found in:', tokenText);
					return new Response('Failed to get token', { status: 401 });
				}

				// Now fetch the user with a valid token…
				const userRes = await fetch('https://api.github.com/user', {
					headers: {
						Authorization: `Bearer ${accessToken}`,
						Accept: 'application/json',
						'User-Agent': 'DecompositionBox/1.0',
					},
				});

				// If GitHub gave us an error (401, 403, etc), grab the text and fail gracefully
				if (!userRes.ok) {
					const errText = await userRes.text();
					console.error('❌ GitHub /user error:', userRes.status, errText);
					return new Response('Failed to fetch GitHub user', { status: 401 });
				}

				// Safe to parse JSON now
				const gitHubUser = await userRes.json<GitHubUser>();
				if (!gitHubUser.login) {
					console.error('❌ GitHub user missing login:', gitHubUser);
					return new Response('Failed to fetch GitHub user', { status: 401 });
				}

				const payload: JWTPayload = {
					iat: Date.now(),
					jti: crypto.randomUUID(),
					username: gitHubUser.login,
					email: gitHubUser.email ?? '',
				};

				const jwt = await signJWT(payload, env.JWT_SECRET, 24 * 60 * 60);

				return Response.redirect(`https://bachelor.erenhomburg.com/github/callback?token=${jwt}`, 302);
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
