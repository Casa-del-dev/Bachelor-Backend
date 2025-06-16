import { AbstractionPayload } from '../types';

export async function saveAbstractionInbetween(
	env: Env,
	userId: string,
	problemId: string,
	abstractionId: string,
	payload: AbstractionPayload
) {
	const key = `${userId}/${problemId}/abstractionInbetween/${abstractionId}.json`;
	await env.problemTree.put(key, JSON.stringify(payload), {
		httpMetadata: { contentType: 'application/json' },
	});
}

export async function loadAbstractionInbetween(
	env: Env,
	userId: string,
	problemId: string,
	abstractionId: string
): Promise<AbstractionPayload | null> {
	const key = `${userId}/${problemId}/abstractionInbetween/${abstractionId}.json`;
	const obj = await env.problemTree.get(key);
	if (!obj) return null;
	return (await obj.json()) as AbstractionPayload;
}

export async function deleteAbstractionInbetween(env: Env, userId: string, problemId: string, abstractionId: string): Promise<void> {
	const key = `${userId}/${problemId}/abstractionInbetween/${abstractionId}.json`;
	await env.problemTree.delete(key);
}

export async function deleteAllAbstractionInbetween(env: Env, userId: string, problemId: string): Promise<void> {
	const bucket = env.problemTree;
	const prefix = `${userId}/${problemId}/abstractionInbetween/`;
	let cursor: string | undefined = undefined;

	do {
		const listResult = await bucket.list({
			prefix,
			cursor,
			limit: 100,
		});

		const { objects, truncated } = listResult;

		if (objects.length === 0) {
			return;
		}

		await Promise.all(objects.map((obj) => bucket.delete(obj.key)));

		cursor = truncated ? listResult.cursor : undefined;
	} while (cursor);
}
