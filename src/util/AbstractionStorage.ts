import { Step } from '../types';

export async function saveAbstractionInbetween(env: Env, userId: string, problemId: string, abstractionId: string, steps: Step[]) {
	const key = `${userId}/${problemId}/abstractionInbetween/${abstractionId}.json`;
	await env.problemTree.put(key, JSON.stringify(steps), { httpMetadata: { contentType: 'application/json' } });
}

export async function loadAbstractionInbetween(env: Env, userId: string, problemId: string, abstractionId: string): Promise<Step[] | null> {
	const key = `${userId}/${problemId}/abstractionInbetween/${abstractionId}.json`;
	const obj = await env.problemTree.get(key);
	if (!obj) return null;
	return (await obj.json()) as Step[];
}
