import { stringify } from 'openai/internal/qs/stringify.mjs';
import { stepTree } from '.';
import { Service } from '..';

interface Payload {
	Tree: object;
	Code: string;
}

interface RequestBody {
	requestBody?: Payload;
	Tree: object;
	Code: string;
}

const service: Service = {
	path: '/openai/v4/',

	async fetch(request: Request, env: Env, ctx: ExecutionContext, subPath: string): Promise<Response | void> {
		if (request.method !== 'POST') {
			return new Response('Method Not Allowed', {
				status: 405,
				headers: { 'Access-Control-Allow-Origin': '*' },
			});
		}

		try {
			const data: RequestBody = await request.json();
			const mergedPayload = data.requestBody ?? data;
			let { Tree, Code } = mergedPayload;

			if (!Code || !Tree) {
				if (Code === null) {
					Code = '';
				} else {
					return new Response('Missing Prompt, Problem, Tree, Context, or Code in request body', {
						status: 400,
						headers: { 'Access-Control-Allow-Origin': '*' },
					});
				}
			}

			const stepTreeTest = {
				root: [
					{
						id: 1,
						code: '',
						content: 'Create a dictionary that maps Roman numeral symbols to their respective decimal numbers.',
						correctStep: '',
						prompt: '',
						status: {
							correctness: '',
							can_be_further_divided: '',
						},
						general_hint: '',
						detailed_hint: '',
						hasparent: false,
						children: [],
						isDeleting: false,
						showGeneralHint1: false,
						showDetailedHint1: false,
						showCorrectStep1: false,
						showGeneralHint2: false,
						showDetailedHint2: false,
						isNewlyInserted: false,
						isexpanded: true,
						isHyperExpanded: false,
						selected: false,
					},
					{
						id: 2,
						code: '',
						content: 'Create a loop that cycles over the input Roman numeral.',
						correctStep: '',
						prompt: '',
						status: {
							correctness: '',
							can_be_further_divided: '',
						},
						general_hint: '',
						detailed_hint: '',
						hasparent: false,
						children: [
							{
								id: 3,
								code: '',
								content: 'Transform each Roman numeral symbol to its decimal number using the dictionary.',
								correctStep: '',
								prompt: '',
								status: {
									correctness: '',
									can_be_further_divided: '',
								},
								general_hint: '',
								detailed_hint: '',
								hasparent: true,
								children: [],
								isDeleting: false,
								showGeneralHint1: false,
								showDetailedHint1: false,
								showCorrectStep1: false,
								showGeneralHint2: false,
								showDetailedHint2: false,
								isNewlyInserted: false,
								isexpanded: true,
								isHyperExpanded: false,
								selected: false,
							},
							{
								id: 4,
								code: '',
								content: 'Store the sum of the transformed numbers in a return variable.',
								correctStep: '',
								prompt: '',
								status: {
									correctness: '',
									can_be_further_divided: '',
								},
								general_hint: '',
								detailed_hint: '',
								hasparent: true,
								children: [],
								isDeleting: false,
								showGeneralHint1: false,
								showDetailedHint1: false,
								showCorrectStep1: false,
								showGeneralHint2: false,
								showDetailedHint2: false,
								isNewlyInserted: false,
								isexpanded: true,
								isHyperExpanded: false,
								selected: false,
							},
						],
						isDeleting: false,
						showGeneralHint1: false,
						showDetailedHint1: false,
						showCorrectStep1: false,
						showGeneralHint2: false,
						showDetailedHint2: false,
						isNewlyInserted: false,
						isexpanded: true,
						isHyperExpanded: false,
						selected: false,
					},
					{
						id: 5,
						code: '',
						content: 'Return the return variable.',
						correctStep: '',
						prompt: '',
						status: {
							correctness: '',
							can_be_further_divided: '',
						},
						general_hint: '',
						detailed_hint: '',
						hasparent: false,
						children: [],
						isDeleting: false,
						showGeneralHint1: false,
						showDetailedHint1: false,
						showCorrectStep1: false,
						showGeneralHint2: false,
						showDetailedHint2: false,
						isNewlyInserted: false,
						isexpanded: true,
						isHyperExpanded: false,
						selected: false,
					},
				],
			};

			const stepTreeTest2 = stringify(stepTreeTest);

			const payload = {
				model: 'gpt-4o',
				messages: [
					{
						role: 'user',
						content: `Goal:

Using the input **Code** and **Tree**, follow the instructions below:

Step Processing Logic:

1. For each step (and substep) in the Tree:
   - Compare the step’s **content** with the **Code** to check if it is implemented.
   - Do **not** consider **general_hint** or **detailed_hint** when judging implementation.
     - **Only** compare the **content** field with the **Code**.
   - If **implemented correctly**, insert the matching **code snippet** into the "code" field.
   - In the **top-level "code" field**, add **# Step N** (where N is the step number, like # Step 1, # Step 1.1, etc.) **above the code line**, not a description of the action.
   - If **implemented but incorrect**, still include the matching code, but add **# Step N - NOT IMPLEMENTED CORRECTLY** above the code line in the **top-level "code" field**.
   - If **not implemented at all**:
     - Leave the step’s **"code"** field **empty**.
     - Add **# Step N - MISSING STEP** in the **top-level "code" field** at the correct logical position.
     - **Also add the missing step as an empty step in the Tree** with its status marked as **"missing"**.

Structure Preservation Rules:

2. Do not modify any other part of the Tree:
   - Keep **all steps and substeps**, even if empty or partially filled.
   - Retain all keys (id, status, etc.) as-is.
   - **Do not** reformat, delete, or clean the JSON.
   - Maintain the **original order and structure**.

Function and Code Preservation Rules:

- Retain full **function declarations** (e.g., def myFunc():).
- Insert **step comments inside** the function body, never above or outside the def line.
- Keep the **original function structure** in the **top-level "code" field**, inserting **# Step N** comments above the corresponding code lines.
- **def main()**:
  - Must **remain untouched**, **unannotated**, and **at the end**.

When Dealing with Control Structures (for, while, if, etc.):

- **Do not inline comments on the same line** as control structures.
- **Break into multiple lines** to place **step comments directly above** individual logical lines.

Example Correction in Top-Level Code Field:


def my_function():
    # Step 1 - MISSING STEP
    # Step 2
    for i in range(10):
        # Step 2.1
        print(i)

def main():
    print("Done")


---

Return Format:

Return a single JSON object with:

"code": Full original code with # Step N comments as described.

"steps": The entire original Tree, updated with code snippets or empty strings as described.

Output Requirement:

Only output the raw JSON.
Do not include any text, markdown, or extra characters.
Output only the JSON object.

---

Would you like me to append the "Code" and "Tree" placeholders, or are you already managing that part?
`,
					},
				],
				temperature: 0,
			};

			const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${env.OPENAI_API_KEY}`,
				},
				body: JSON.stringify(payload),
			});

			if (!openaiResponse.ok) {
				const errorText = await openaiResponse.text();
				return new Response(`OpenAI API Error: ${errorText}`, {
					status: openaiResponse.status,
					headers: { 'Access-Control-Allow-Origin': '*' },
				});
			}

			const result = await openaiResponse.json();
			return new Response(JSON.stringify(result), {
				status: 200,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*',
				},
			});
		} catch (error) {
			console.error('Error processing OpenAI request:', error);
			return new Response('Internal Server Error', {
				status: 500,
				headers: { 'Access-Control-Allow-Origin': '*' },
			});
		}
	},
};

export default service;
