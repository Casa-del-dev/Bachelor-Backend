import { Service } from '..';

interface Payload {
	Problem: string;
	Tree: object;
}

interface RequestBody {
	requestBody?: Payload;
	Problem: string;
	Tree: object;
}

const service: Service = {
	path: '/openai/v2/',

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
			const { Tree, Problem } = mergedPayload;

			if (!Tree || !Problem) {
				return new Response('Missing Prompt, Problem, Tree, Context, or Code in request body', {
					status: 400,
					headers: { 'Access-Control-Allow-Origin': '*' },
				});
			}

			const TreeTest = {
				root: [
					{
						id: 1,
						code: '',
						content: "Create a dictionary to transform single chart's into their respective decimal numbers.",
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
						content: 'Create a loop that cycles over the input.',
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
								content: 'Transform the input using the dictionary and store the sum in a return variable.',
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
				],
			};

			const TreeTestString = JSON.stringify(TreeTest, null, 2).replace(/"/g, '\\"');

			const payload = {
				model: 'gpt-4o',
				messages: [
					{
						role: 'user',
						content: `Goal:

Use the input Tree as a base and revise only the fields specified below. However, if the Problem describes steps or substeps that are **missing or unrepresented** in the Tree, you **must add new blank steps or substeps** to capture that logic.

The goal is to produce a new JSON file that is **semantically equivalent to a complete solution** for the Problem — meaning:
- All required steps and substeps described or implied in the Problem are present,
- The original structure is preserved **unless** the Problem clearly requires additions.

**Tree:**  
"${TreeTestString}"

⚠️ Input Tree Note:
- The input is a flat list of steps, each with optional "children" arrays. You must transform this into the nested "steps" → "subSteps" format shown below.
- If a step in the input has children, those must appear inside "subSteps" in the output.
- Each substep (child) should have its own status, correctness, and hints, and must be preserved exactly unless the Problem requires changes.
- Do not remove any existing children — all must appear in "subSteps" in the final output.

**Problem:**  
"${Problem}"

You should update only the following properties, based on the Problem:

- status.correctness
- status.can_be_further_divided
- correctStep (**Provide the correct step only if the existing step is incorrect or missing**)
- general_hint (**Required if step is incorrect, missing, or can be further divided**)
- detailed_hint (**Required if step is incorrect, missing, or can be further divided**)
- Add missing steps or substeps if the Problem context requires any that are not already present in the Tree

	🧭 Ordering Rule:
	
	- If you add a missing step or substep, you must place it in the correct logical and semantic order based on the Problem and the surrounding context.
	- Do not add missing steps at the end unless the logic clearly belongs there (e.g., cleanup, return, summary).
	- When in doubt, insert the missing step before the next related step (e.g., setup before usage, loop before total update, etc.).

Important:
- **Always** keep the steps and substeps given in the input! Only add **if necessary** missing steps.
- If a step exists but has incorrect content, mark it as "incorrect" — do NOT mark it as "missing" or delete its content.
- Only mark a step as "missing" if it is **entirely absent** from the Tree.
- When status.can_be_further_divided = "can", you must provide hints explaining how the step could be broken down further.
- Do not remove any existing substeps. All children in the input Tree must be preserved in the output, even if unchanged.
- If a step contains substeps (children), include those in the output exactly as provided, updating only the fields if needed.

Return Format:

- steps → Keep all original steps, unless the Problem clearly requires an additional step (as a blank step).
- Each step contains:
  - "content" → Keep as input.
  - "correctStep" → Only include if correctness is not "correct".
  - code → "Same as input" (//keep as input)
  - "status":
    - "correctness" → "correct" / "incorrect" / "missing"
    - "can_be_further_divided" → "can" / "cannot"
  - "general_hint" → Only if correctness is not "correct".
  - "detailed_hint" → Only if correctness is not "correct".
  - "subSteps" → **Same as input**, but if the Problem describes or implies new blank substeps that should be added.

What qualifies as a substep?

- A task required to complete a larger step.
- A process dependent on the parent step.
- A breakdown of a broad action into finer details.

What is a blank step or substep?

A step or substep that contains all empty string values ("") except:

"status": {
  "correctness": "missing",
  "can_be_further_divided": ""
}

You **must** add blank steps/substeps if a part of the Problem logic is not accounted for in the Tree. When adding a blank step/substep, you must also provide the following fields: general_hint, detailed_hint, and the correctStep.

Common mistakes to avoid:
- Do not overwrite or blank out existing steps marked as "incorrect".
- Never mark a step as "missing" unless it is truly not present in the input Tree.
- Always provide general and detailed hints when correctness is not "correct", or when a step can be further divided.

Example JSON Output:

{
  "steps": {
    "1": {
      "content": "Same as input",
      "correctStep": "The correct step, only if not correct",
      "code": "// keep as input",
      "status": {
        "correctness": "correct / incorrect / missing",
        "can_be_further_divided": "can / cannot"
      },
      "general_hint": "Only if not correct",
      "detailed_hint": "Only if not correct",
      "subSteps": {
        "1": {
          "content": "Same as input",
          "correctStep": "Only if not correct",
          "code": "// keep as input",
          "status": {
            "correctness": "correct / incorrect / missing",
            "can_be_further_divided": "can / cannot"
          },
          "general_hint": "Only if not correct",
          "detailed_hint": "Only if not correct"
        }
      }
    },
    "2": {
      // Same structure as above
    }
  }
}

### **Warning:**
Only give as output the json file no words before or after! **Do not include any text, markdown, explanations, commas before/after the JSON, or anything else. Only output the raw JSON.**
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
