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
If a step is 'correctness:  incorrect or missing' you mark the status as such and additionally give it a general, detailed, and correctStep.

Missing steps:
	- Missing steps are those steps that haven't been described yet in the tree and Need to be added.
	- When adding a missing step make sure to give it both general and detailed hint, and a correct step. The Content must be kept empty.
	- When adding missing steps, You **must** analyze the logical dependencies between steps: such that substeps are created. If something needs initialization before a certain loop or if condition, put a missing step before and one level higher as the needed step.
	- Always go for substeps in a balanced way!

	exmaple of a missing step:
	Original Tree:
		{"steps":{"1":{"content":"Loop over the numbers in the list","subSteps":{"1":{"content":"Add the number to tot"}}}}}
	Correction with Missing Step:
		{"steps":{"1":{"content":"Initialize tot to 0","status":{"correctness":"missing","can_be_further_divided":"cannot"},"general_hint":"...","detailed_hint":"...","correctStep":"tot = 0","subSteps":{}},"2":{"content":"Loop over the numbers in the list","subSteps":{"1":{"content":"Add the number to tot"}}}}}

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
