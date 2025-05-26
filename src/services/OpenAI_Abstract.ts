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
					content: 'Start maze navigation',
					substeps: [],
				},
				{
					id: '2',
					content: 'Navigate path A',
					substeps: [
						{ id: '2.1', content: 'Move down', substeps: [] },
						{ id: '2.2', content: 'Move right', substeps: [] },
						{ id: '2.3', content: 'Check for wall', substeps: [] },
						{ id: '2.4', content: 'Turn left', substeps: [] },
					],
				},
				{
					id: '3',
					content: 'Navigate path B',
					substeps: [
						{ id: '3.1', content: 'Move left', substeps: [] },
						{ id: '3.2', content: 'Move left', substeps: [] },
						{ id: '3.3', content: 'Check for wall', substeps: [] },
						{ id: '3.4', content: 'Turn right', substeps: [] },
					],
				},
				{
					id: '4',
					content: 'Navigate path C',
					substeps: [
						{ id: '4.1', content: 'Move up', substeps: [] },
						{ id: '4.2', content: 'Move right', substeps: [] },
					],
				},
				{
					id: '5',
					content: 'Navigate path D',
					substeps: [
						{ id: '5.1', content: 'Check for wall', substeps: [] },
						{ id: '5.2', content: 'Turn left', substeps: [] },
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

${Tree}

Your goal is to detect repeated two-step movement patterns (regardless of the exact directions) and represent each occurrence as its own group, always reporting the combined recycling grouping first, then each individual grouping. All grouping instances must appear in the output.

Definitions  
• Grouping patterns occur only among a node and its direct parent, its direct children, or among siblings. You cannot group steps that are distant or in completely different branches.  
• Recycling patterns occur when the same logic appears in completely different branches of the tree, **including semantically equivalent movement pairs**. For example “Move down + Move right,” “Move left + Move left,” and “Move up + Move right” should all recycle together as “two-step movement” even though the directions differ.

Format each result as a JSON object with these fields  
steps: a two-dimensional array of grouping instances:  
  1. The **first object**’s steps array lists every recycled two-step movement instance as its own inner array (the combined recycling entry).  
  2. After that, emit one separate object per individual two-step movement grouping, each with exactly one inner array.  
general_hint: a brief, high-level description of this pattern  
detailed_hint: a specific explanation of the repeated logic  
correct_answer: a full nested step tree JSON showing the ideal generalized “two-step movement” version

Output rules  
• Return only a raw JSON array.  
• Do not include any text, markdown, comments, or trailing commas.  
• All two-step movement groupings must be listed (both combined and individually).

FORMAT EXAMPLE (FOR REFERENCE ONLY):

[
  {
    "steps": [
      [ { "id": "2.1" }, { "id": "2.2" } ],
      [ { "id": "3.1" }, { "id": "3.2" } ],
      [ { "id": "4.1" }, { "id": "4.2" } ]
    ],
    "general_hint": "Two-step movement sequences",
    "detailed_hint": "All these pairs move in one direction and then a perpendicular direction",
    "correct_answer": {
      "steps": {
        "M": {
          "content": "Perform any two-step movement",
          "substeps": {
            "M1": { "content": "Step 1: move in primary direction", "substeps": {} },
            "M2": { "content": "Step 2: move in secondary direction", "substeps": {} }
          }
        }
      }
    }
  },
  {
    "steps": [ [ { "id": "2.1" }, { "id": "2.2" } ] ],
    "general_hint": "Movement in Path A",
    "detailed_hint": "Path A moves down then right",
    "correct_answer": {
      "steps": [
        {
          "id": "2",
          "content": "Navigate path A",
          "substeps": [
            { "id": "2.1", "content": "Move down", "substeps": [] },
            { "id": "2.2", "content": "Move right", "substeps": [] }
          ]
        }
      ]
    }
  },
  {
    "steps": [ [ { "id": "3.1" }, { "id": "3.2" } ] ],
    "general_hint": "Movement in Path B",
    "detailed_hint": "Path B moves left then left (two identical moves)",
    "correct_answer": {
      "steps": [
        {
          "id": "3",
          "content": "Navigate path B",
          "substeps": [
            { "id": "3.1", "content": "Move left", "substeps": [] },
            { "id": "3.2", "content": "Move left", "substeps": [] }
          ]
        }
      ]
    }
  },
  {
    "steps": [ [ { "id": "4.1" }, { "id": "4.2" } ] ],
    "general_hint": "Movement in Path C",
    "detailed_hint": "Path C moves up then right",
    "correct_answer": {
      "steps": [
        {
          "id": "4",
          "content": "Navigate path C",
          "substeps": [
            { "id": "4.1", "content": "Move up", "substeps": [] },
            { "id": "4.2", "content": "Move right", "substeps": [] }
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
