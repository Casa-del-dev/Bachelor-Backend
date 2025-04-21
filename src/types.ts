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

// types/step.ts
export interface Step {
	id: string;
	code: string;
	content: string;
	correctStep: string;
	prompt: string;
	status: {
		correctness: 'correct' | 'incorrect' | 'missing' | '';
		can_be_further_divided: 'can' | 'cannot' | '';
	};
	general_hint: string;
	detailed_hint: string;
	children: Step[];

	/** misc flags */
	hasparent: boolean;
	isDeleting: boolean;
	showGeneralHint1: boolean;
	showDetailedHint1: boolean;
	showCorrectStep1: boolean;
	showGeneralHint2: boolean;
	showDetailedHint2: boolean;
	isNewlyInserted: boolean;
	isexpanded: boolean;
	isHyperExpanded: boolean;
	selected: boolean;
}
