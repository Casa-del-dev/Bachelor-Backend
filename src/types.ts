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

export interface AbstractionPayload {
	steps: Step[];
	isAvailable: boolean;
	allIsAvailable: boolean;
	allIsHinted: boolean;
}

export interface AbstractionItem {
	id: string;
	steps: { id: string }[][]; // array of arrays of `{ id: string }`
	correct_answer: {
		stepsTree: {
			[key: string]: {
				content: string;
				substeps: Record<string, { content: string; substeps: any }>;
				general_hint: string;
				detailed_hint: string;
			};
		};
	};
}

export type Abstraction = AbstractionItem[];

export interface ReviewPayload {
	rating: number;
	message: string;
}

export interface ProblemPayload {
	id: string;
	name: string;
	description: string;
	defaultText: string;
	tests: string;
}
