// util/stepTreeStorage.ts
import { Step } from '../types';

const STEP_TREE_FILE = 'stepTree.json';

/**
 *  path:  <username>/<problemId>/stepTree.json
 */
export async function saveStepTree(env: Env, username: string, problemId: string, stepTree: Step[]) {
	const key = `${username}/${problemId}/${STEP_TREE_FILE}`;
	const body = JSON.stringify({ root: stepTree });

	await env.problemTree.put(key, body, {
		httpMetadata: { contentType: 'application/json' },
	});
}

export async function loadStepTree(env: Env, username: string, problemId: string): Promise<{ root: Step[] } | null> {
	const key = `${username}/${problemId}/${STEP_TREE_FILE}`;
	const obj = await env.problemTree.get(key);

	if (!obj) return null;
	return (await obj.json()) as { root: Step[] };
}
