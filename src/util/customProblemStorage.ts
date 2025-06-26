import type { R2Bucket, R2ObjectBody } from '@cloudflare/workers-types';
import type { ProblemPayload } from '../types';

// Bound R2 bucket in Worker environment
export type EnvR2 = { problemTree: R2Bucket };

// Save or update a problem under username/id/insides/
export async function saveProblem(env: EnvR2, username: string, payload: ProblemPayload): Promise<void> {
	const base = `${username}/${payload.id}/insides/`;
	const bucket = env.problemTree;
	await Promise.all([
		bucket.put(base + 'name', payload.name, { httpMetadata: { contentType: 'text/plain' } }),
		bucket.put(base + 'description', payload.description, { httpMetadata: { contentType: 'text/plain' } }),
		bucket.put(base + 'solution', payload.defaultText, { httpMetadata: { contentType: 'text/plain' } }),
		bucket.put(base + 'tests', payload.tests, { httpMetadata: { contentType: 'text/plain' } }),
	]);
}

// Load a specific problem by username and id
export async function loadProblem(env: EnvR2, username: string, id: string): Promise<ProblemPayload | null> {
	const base = `${username}/${id}/insides/`;
	const bucket = env.problemTree;
	const [nameObj, descObj, solObj, testsObj] = await Promise.all([
		bucket.get(base + 'name'),
		bucket.get(base + 'description'),
		bucket.get(base + 'solution'),
		bucket.get(base + 'tests'),
	]);
	if (!nameObj) return null;
	const name = await (nameObj as R2ObjectBody).text();
	const description = descObj ? await (descObj as R2ObjectBody).text() : '';
	const defaultText = solObj ? await (solObj as R2ObjectBody).text() : '';
	const tests = testsObj ? await (testsObj as R2ObjectBody).text() : '';
	return { id, name, description, defaultText, tests };
}

// List all problems for a specific user (metadata only)
export async function loadAllProblems(env: EnvR2, username: string): Promise<Pick<ProblemPayload, 'id' | 'name' | 'description'>[]> {
	const bucket = env.problemTree;
	let cursor: string | undefined = undefined;
	const entries: Record<string, { name?: string; description?: string }> = {};
	const prefix = `${username}/`;
	do {
		const listResp = await bucket.list({ prefix, cursor });
		cursor = listResp.truncated ? listResp.cursor : undefined;
		for (const item of listResp.objects) {
			const parts = item.key.split('/');
			// Expect [username, id, 'insides', field]
			if (parts.length !== 4 || parts[2] !== 'insides') continue;
			const id = parts[1];
			const field = parts[3];
			entries[id] = entries[id] || {};
			if (field === 'name' || field === 'description') {
				const obj = await bucket.get(item.key);
				if (obj) {
					const text = await (obj as R2ObjectBody).text();
					entries[id][field] = text;
				}
			}
		}
	} while (cursor);
	return Object.entries(entries).map(([id, meta]) => ({ id, name: meta.name || '', description: meta.description || '' }));
}

// Delete a problem
export async function deleteProblem(env: EnvR2, username: string, id: string): Promise<void> {
	const prefix = `${username}/${id}/insides/`;
	const bucket = env.problemTree;
	let cursor: string | undefined = undefined;
	do {
		const listResp = await bucket.list({ prefix, cursor });
		cursor = listResp.truncated ? listResp.cursor : undefined;
		await Promise.all(listResp.objects.map((obj) => bucket.delete(obj.key)));
	} while (cursor);
}
