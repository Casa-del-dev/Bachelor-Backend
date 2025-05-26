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
					content: 'Initialize total to zero',
					substeps: [],
				},
				{
					id: '2',
					content: 'Loop over array A',
					substeps: [
						{ id: '2.1', content: 'Get element at i', substeps: [] },
						{ id: '2.2', content: 'Square element', substeps: [] },
						{ id: '2.3', content: 'Add squared element to total', substeps: [] },
					],
				},
				{
					id: '3',
					content: 'Loop over array B',
					substeps: [
						{ id: '3.1', content: 'Get element at i', substeps: [] },
						{ id: '3.2', content: 'Double element', substeps: [] },
						{ id: '3.3', content: 'Add doubled element to total', substeps: [] },
					],
				},
				{
					id: '4',
					content: 'Loop over array C',
					substeps: [
						{ id: '4.1', content: 'Get element at i', substeps: [] },
						{ id: '4.2', content: 'Square element', substeps: [] },
						{ id: '4.3', content: 'Add squared element to total', substeps: [] },
					],
				},
				{
					id: '5',
					content: 'Loop over array D',
					substeps: [
						{ id: '5.1', content: 'Get element at i', substeps: [] },
						{ id: '5.2', content: 'Double element', substeps: [] },
						{ id: '5.3', content: 'Add doubled element to total', substeps: [] },
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

Your goal is to detect repeated logic patterns and represent each occurrence as its own group, always reporting the combined (recycling) grouping first, then each individual grouping. All grouping instances must appear in the output.

Definitions  
• Grouping patterns occur only among a node and its direct parent, its direct children, or among siblings. You cannot group steps that are distant or in completely different branches.  
• Recycling patterns occur when the same logic appears in completely different branches of the tree; the first object will embed all grouping instances together.

Format each result as a JSON object with these fields  
steps: a two-dimensional array of grouping instances:  
  1. The **first object**’s steps array lists every grouping instance as its own inner array (this is the combined recycling entry).  
  2. After that, emit one separate object per individual grouping instance, each with exactly one inner array.  
general_hint: a brief, high-level description of this pattern  
detailed_hint: a specific explanation of the repeated logic  
correct_answer: a full nested step tree JSON showing the ideal generalized or reusable version of that logic

Output rules  
• Return only a raw JSON array.  
• Do not include any text, markdown, comments, or trailing commas.  
• All grouping instances must be listed (both in the combined entry and individually).  

Example

[
  {
    "steps": [
      [ { "id": "2.1" }, { "id": "2.2" } ],
      [ { "id": "3.1" }, { "id": "3.2" } ],
      [ { "id": "5.1" }, { "id": "5.2" } ]
    ],
    "general_hint": "Sibling grouping within each loop",
    "detailed_hint": "Each inner array shows the two sibling steps (element access and addition/subtraction) in loops A, B, and C",
    "correct_answer": {
      "steps": [
        {
          "id": "1",
          "content": "Initialize sum to zero",
          "substeps": []
        },
        {
          "id": "2",
          "content": "Loop over arrays A, B, C",
          "substeps": [
            { "id": "2.1", "content": "Get element at index i", "substeps": [] },
            { "id": "2.2", "content": "Add or subtract element to/from sum", "substeps": [] }
          ]
        },
        {
          "id": "3",
          "content": "Compute average",
          "substeps": []
        }
      ]
    }
  },
  {
    "steps": [
      [ { "id": "2.1" }, { "id": "2.2" } ]
    ],
    "general_hint": "Grouping in loop A",
    "detailed_hint": "The two sibling steps in loop A",
    "correct_answer": {
      "steps": [
        {
          "id": "2",
          "content": "Loop over array A",
          "substeps": [
            { "id": "2.1", "content": "Get element at index i", "substeps": [] },
            { "id": "2.2", "content": "Add element to sum", "substeps": [] }
          ]
        }
      ]
    }
  },
  {
    "steps": [
      [ { "id": "3.1" }, { "id": "3.2" } ]
    ],
    "general_hint": "Grouping in loop B",
    "detailed_hint": "The two sibling steps in loop B",
    "correct_answer": {
      "steps": [
        {
          "id": "3",
          "content": "Loop over array B",
          "substeps": [
            { "id": "3.1", "content": "Get element at index i", "substeps": [] },
            { "id": "3.2", "content": "Add element to sum", "substeps": [] }
          ]
        }
      ]
    }
  },
  {
    "steps": [
      [ { "id": "5.1" }, { "id": "5.2" } ]
    ],
    "general_hint": "Grouping in loop C",
    "detailed_hint": "The two sibling steps in loop C",
    "correct_answer": {
      "steps": [
        {
          "id": "5",
          "content": "Loop over array C",
          "substeps": [
            { "id": "5.1", "content": "Get element at index i", "substeps": [] },
            { "id": "5.2", "content": "Subtract element from total", "substeps": [] }
          ]
        }
      ]
    }
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
