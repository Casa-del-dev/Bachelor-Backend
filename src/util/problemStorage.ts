import { Problem, Tree, TreeNode, FileMeta } from '../types';

async function getLatestVersion(env: Env, userId: string, problemId: string, nodeId: string): Promise<number> {
	const latestKey = `${userId}/${problemId}/files/${nodeId}/latest`;
	const latest = await env.problemTree.get(latestKey);

	if (!latest) return 0;

	const latestText = await latest.text();
	return parseInt(latestText, 10);
}

async function getLatestCode(env: Env, userId: string, problemId: string, nodeId: string): Promise<string | null> {
	const latestVersion = await getLatestVersion(env, userId, problemId, nodeId);
	if (!latestVersion) return null;

	const file = await env.problemTree.get(`${userId}/${problemId}/files/${nodeId}/v${latestVersion}.code`);
	return file ? await file.text() : null;
}

async function setLatestVersion(env: Env, userId: string, problemId: string, nodeId: string, version: number) {
	await env.problemTree.put(`${userId}/${problemId}/files/${nodeId}/latest`, version.toString(), {
		httpMetadata: { contentType: 'text/plain' },
	});
}

export async function saveProblem(env: Env, userId: string, problemId: string, tree: Tree, codeMap: Record<string, string>) {
	await env.problemTree.put(`${userId}/${problemId}/tree.json`, JSON.stringify(tree), {
		httpMetadata: { contentType: 'application/json' },
	});

	async function walkAndSave(node: TreeNode) {
		if (node.type === 'file') {
			const code = codeMap[node.id];
			if (code !== undefined) {
				const currentVersion = await getLatestVersion(env, userId, problemId, node.id);
				const newVersion = currentVersion + 1;

				await env.problemTree.put(`${userId}/${problemId}/files/${node.id}/v${newVersion}.code`, code, {
					httpMetadata: { contentType: 'text/plain' },
				});

				await setLatestVersion(env, userId, problemId, node.id, newVersion);
			}
		} else if (node.type === 'folder' && node.children) {
			for (const child of node.children) {
				await walkAndSave(child);
			}
		}
	}

	await walkAndSave(tree.rootNode);
}

export async function loadProblem(env: Env, userId: string, problemId: string): Promise<{ tree: Tree; codeMap: Record<string, string> }> {
	const treeObjFile = await env.problemTree.get(`${userId}/${problemId}/tree.json`);

	if (!treeObjFile) {
		throw new Error('Tree not found');
	}

	const tree = (await treeObjFile.json()) as Tree;

	const codeMap: Record<string, string> = {};

	async function walkAndLoad(node: TreeNode) {
		if (node.type === 'file') {
			const code = await getLatestCode(env, userId, problemId, node.id);
			if (code !== null) {
				codeMap[node.id] = code;
			}
		} else if (node.type === 'folder' && node.children) {
			for (const child of node.children) {
				await walkAndLoad(child);
			}
		}
	}

	await walkAndLoad(tree.rootNode);

	return {
		tree,
		codeMap,
	};
}
