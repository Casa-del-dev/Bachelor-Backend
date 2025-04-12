//users
export type User = {
	username: string;
	password: string;
	email: string;
};

//problems
export interface Problem {
	tree: Tree;
	files: FileMeta[];
}

//system file explorer
export interface Tree {
	rootNode: TreeNode;
}

//system file explorer
export interface TreeNode {
	id: string;
	name: string;
	type: 'folder' | 'file';
	children?: TreeNode[];
}

//code files
export interface FileMeta {
	id: string;
	filename: string;
	language: string;
}
