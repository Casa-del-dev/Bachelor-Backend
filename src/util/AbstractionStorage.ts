import { Step } from '../types';

export async function saveAbstractionInbetween(env: Env, username: string, problemId: string, steps: Step[]) {
	const key = `${username}/${problemId}/AbstractionInbetween.JSON`;
	const body = JSON.stringify({ steps });
	await env.problemTree.put(key, body, {
		httpMetadata: { contentType: 'application/json' },
	});
}

export async function loadAbstractionInbetween(env: Env, username: string, problemId: string): Promise<Step[] | null> {
	const key = `${username}/${problemId}/AbstractionInbetween.JSON`;
	const obj = await env.problemTree.get(key);
	if (!obj) return null;
	const text = await obj.text();
	try {
		const parsed = JSON.parse(text) as { steps: Step[] };
		return parsed.steps;
	} catch {
		return null;
	}
}
