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

export async function saveProblem(
	env: Env,
	userId: string,
	problemId: string,
	tree: Tree,
	codeMap: Record<string, string>,
	deletedFiles?: string[]
) {
	// Save updated file tree
	await env.problemTree.put(`${userId}/${problemId}/tree.json`, JSON.stringify(tree), {
		httpMetadata: { contentType: 'application/json' },
	});

	// Delete files that have been removed
	if (deletedFiles && deletedFiles.length > 0) {
		for (const fileId of deletedFiles) {
			await deleteFile(env, userId, problemId, fileId);
		}
	}

	// Save the new/updated files
	await saveCodeRecursively(env, userId, problemId, tree.rootNode, codeMap);
}

// Recursive file walker
async function saveCodeRecursively(env: Env, userId: string, problemId: string, node: TreeNode, codeMap: Record<string, string>) {
	if (node.type === 'file') {
		const code = codeMap[node.id];
		if (code !== undefined) {
			const currentVersion = await getLatestVersion(env, userId, problemId, node.id);
			const newVersion = currentVersion + 1;

			await env.problemTree.put(`${userId}/${problemId}/files/${node.id}/v${newVersion}.code`, code, {
				httpMetadata: { contentType: 'text/plain' },
			});

			await setLatestVersion(env, userId, problemId, node.id, newVersion);

			// Keep max 10 versions
			const deleteBefore = newVersion - 10;
			if (deleteBefore > 0) {
				const oldKey = `${userId}/${problemId}/files/${node.id}/v${deleteBefore}.code`;
				await env.problemTree.delete(oldKey);
			}
		}
	} else if (node.children) {
		for (const child of node.children) {
			await saveCodeRecursively(env, userId, problemId, child, codeMap);
		}
	}
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

// CTRL + Z

async function getCodeHistory(env: Env, userId: string, problemId: string, nodeId: string): Promise<string[]> {
	const latest = await getLatestVersion(env, userId, problemId, nodeId);
	const versions: string[] = [];

	for (let v = Math.max(1, latest - 9); v <= latest; v++) {
		const file = await env.problemTree.get(`${userId}/${problemId}/files/${nodeId}/v${v}.code`);
		if (file) {
			versions.push(await file.text());
		}
	}

	return versions;
}

async function deleteFile(env: Env, userId: string, problemId: string, fileId: string) {
	const latest = await getLatestVersion(env, userId, problemId, fileId);
	// Delete all versions
	for (let version = 1; version <= latest; version++) {
		await env.problemTree.delete(`${userId}/${problemId}/files/${fileId}/v${version}.code`);
	}
	// Delete the latest version pointer
	await env.problemTree.delete(`${userId}/${problemId}/files/${fileId}/latest`);
}
