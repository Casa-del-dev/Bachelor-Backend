import { test } from '.';
import { Service } from '..';

interface Payload {
	Tree?: string;
}

interface RequestBody {
	requestBody?: Payload;
	Tree: string;
}

const service: Service = {
	path: '/openai/v5/',

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
			const { Tree } = mergedPayload;

			if (!Tree) {
				return new Response('Missing Prompt, Problem, Tree, Context, or Code in request body', {
					status: 400,
					headers: { 'Access-Control-Allow-Origin': '*' },
				});
			}

			const testTree = [
				{
					id: '1',
					content: 'Initialize sum to zero',
					substeps: [],
				},
				{
					id: '2',
					content: 'Loop over array A',
					substeps: [
						{
							id: '2.1',
							content: 'Get element at index i',
							substeps: [],
						},
						{
							id: '2.2',
							content: 'Add element to sum',
							substeps: [],
						},
					],
				},
				{
					id: '3',
					content: 'Loop over array B',
					substeps: [
						{
							id: '3.1',
							content: 'Get element at index i',
							substeps: [],
						},
						{
							id: '3.2',
							content: 'Add element to sum',
							substeps: [],
						},
					],
				},
				{
					id: '4',
					content: 'Compute average',
					substeps: [],
				},
				{
					id: '5',
					content: 'Loop over array C',
					substeps: [
						{
							id: '5.1',
							content: 'Get element at index i',
							substeps: [],
						},
						{
							id: '5.2',
							content: 'Subtract element from total',
							substeps: [],
						},
					],
				},
			];

			const treeJson = JSON.stringify(testTree, null, 2);

			const payload = {
				model: 'gpt-4o',
				messages: [
					{
						role: 'user',
						content: `You are an analyzer. Your task is to analyze the given correct step tree:

${treeJson}

Your goal is to detect two kinds of repeated logic in this tree, and always report grouping patterns first, then recycling patterns.

Definitions  
Grouping patterns occur only among parent–child or sibling relationships. In other words, you group a step with its direct parent, its direct children, or its siblings. You cannot group steps that are distant or in completely different branches.  
Recycling patterns occur anywhere else in the tree, when the same logic appears in completely different branches.

Format each result as a single JSON object with these fields  
steps: an array of exactly two arrays  
• the first inner array holds all grouping instances together.  
• the second inner array holds all recycling instances together.  
After that combined entry, you must also emit one separate object for each individual grouping instance you found, where that instance appears alone in the first inner array and the second inner array is empty, so that you can provide a unique general_hint and detailed_hint for each.  
general_hint: a brief, high-level description of this pattern  
detailed_hint: a specific explanation of the repeated logic  
correct_answer: a full nested step tree JSON showing the ideal generalized or reusable version of that logic

Output rules  
• Return only a raw JSON array.  
• Do not include any text, markdown, comments, or trailing commas.  
• Always list the combined grouping entry first, then each individual grouping entry, then recycling entries if any.

Example

[
  {
    "steps": [
      [
        [ { "id": "2.2" }, { "id": "2" }, { "id": "2.1" } ],
        [ { "id": "3.2" }, { "id": "3" }, { "id": "3.1" } ],
        [ { "id": "5.2" }, { "id": "5" }, { "id": "5.1" } ]
      ],
      []
    ],
    "general_hint": "Each group contains a parent and its direct children",
    "detailed_hint": "These patterns show parent–child relationships grouped together",
    "correct_answer": {
      "steps": {
        "1": {
          "content": "Get element at index i from array",
          "correctStep": "",
          "code": "",
          "status": {
            "correctness": "correct",
            "can_be_further_divided": "cannot"
          },
          "general_hint": "",
          "detailed_hint": "",
          "subSteps": {}
        }
      }
    }
  },
  {
    "steps": [
      [ [ { "id": "2.2" }, { "id": "2" }, { "id": "2.1" } ] ],
      []
    ],
    "general_hint": "Group only for step 2 parent–child",
    "detailed_hint": "Isolates the parent–child pattern in loop A",
    "correct_answer": { /* ideal step tree for loop A */ }
  },
  {
    "steps": [
      [ [ { "id": "3.2" }, { "id": "3" }, { "id": "3.1" } ] ],
      []
    ],
    "general_hint": "Group only for step 3 parent–child",
    "detailed_hint": "Isolates the parent–child pattern in loop B",
    "correct_answer": { /* ideal step tree for loop B */ }
  },
  {
    "steps": [
      [ [ { "id": "5.2" }, { "id": "5" }, { "id": "5.1" } ] ],
      []
    ],
    "general_hint": "Group only for step 5 parent–child",
    "detailed_hint": "Isolates the parent–child pattern in loop C",
    "correct_answer": { /* ideal step tree for loop C */ }
  }
]
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
