import { Abstraction } from '../types';

const ABSTRACTION_TREE_FILE = 'abstractionTree.json';

/**
 * key: <username>/<problemId>/abstractionTree.json
 */
export async function saveAbstraction(env: Env, username: string, problemId: string, abstraction: Abstraction): Promise<void> {
	const key = `${username}/${problemId}/${ABSTRACTION_TREE_FILE}`;
	const body = JSON.stringify(abstraction);
	await env.problemTree.put(key, body, {
		httpMetadata: { contentType: 'application/json' },
	});
}

/**
 * Loads the abstraction list, or null if none saved
 */
export async function loadAbstraction(env: Env, username: string, problemId: string): Promise<Abstraction | null> {
	const key = `${username}/${problemId}/${ABSTRACTION_TREE_FILE}`;
	// R2Bucket.get returns an R2Object | null
	const obj = await env.problemTree.get(key);
	if (!obj || !obj.body) return null;

	// Convert the ReadableStream body into text, then parse JSON
	const text = await new Response(obj.body).text();
	try {
		return JSON.parse(text) as Abstraction;
	} catch {
		return null;
	}
}
