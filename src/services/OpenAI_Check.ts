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
						content: `You are given a JSON File and a Problem Description. Your task is to look through the JSON file and understand where there might be mistakes solving the Problem. And output the analyzed JSON File. Do not include any text, markdown, explanations, commas before/after the JSON, or anything else. Only output the raw JSON.

**JSON File:**  
"${TreeTestString}"

**Problem Description:**  
"${Problem}"

### **Warning:**
Only give as output the json file no words before or after!
In status.correctness you first check if the step is correct, incorrect, or missing. And in status.can_be_further_divided you check if it can, or not.

If the step is 'correctness: correct' and 'can_be_further_divided: cannot', **keep** its content as is, **do not** add hints, and **do not** add correctStep. 
If a step is 'correctness:  correct' but 'can_be_further_divided: can' you additionally give it a general_hint, detailed_hint, and a correctStep
If a step is 'correctness:  incorrect' you mark the status as such and **keep** the content as is, additionally **give it** a correctStep, general_hint, and detailed_hint.
If a step is 'correctness: missing' you mark the status as such and additionally **give it** a general, detailed, and correctStep.


Missing Steps:

	- Missing steps are actions that are required to solve the problem but are not yet described in the provided tree and must be added.
	- When adding a missing step, you must provide both a general_hint, a detailed_hint, and a correctStep.
	- The content field must remain empty.
	- You must analyze the logical dependencies between steps to correctly place missing steps.
	- For example, if an initialization is required before a loop or a condition, the missing step must be inserted before that loop or condition step.

Always aim to create a balanced and meaningful substep structure, avoiding unnecessary flattening or over-nesting.

While the code section should remain as given by the input.

### **JSON Output:** ###

{
  "steps": {
    "1": {
      "content": "Same as input",
      "correctStep": "Only if not correct",
      "code": "Same as input",
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
          "code": "Same as input",
          "status": {
            "correctness": "correct / incorrect / missing",
            "can_be_further_divided": "can / cannot"
          },
          "general_hint": "Only if not correct",
          "detailed_hint": "Only if not correct"
        },
	   ...
      }
    },
    "2": {
      ...
    },
   ...
  }
}
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
