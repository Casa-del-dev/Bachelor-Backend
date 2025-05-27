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

			const treeJson = typeof Tree === 'string' ? Tree : JSON.stringify(Tree, null, 2);

			const payload = {
				model: 'gpt-4o',
				messages: [
					{
						role: 'user',
						content: `You are an analyzer. Your task is to analyze the given correct step tree:

${treeJson}

Your goal is to detect repeated two-step movement patterns (regardless of the exact directions) and represent each occurrence as its own group, always reporting the combined recycling grouping first, then each individual grouping. All grouping instances must appear in the output.

Definitions  
• Grouping patterns occur only among a node and its direct parent, its direct children, or among siblings. You cannot group steps that are distant or in completely different branches.  
• Recycling patterns occur when the same logic appears in completely different branches of the tree, **including semantically equivalent movement sequences**. For example, “Move down + Move right,” “Move left + Move left,” and “Move up + Move right” should all recycle together as instances of a generalized “multi-step movement,” even though the directions differ.  

❗IMPORTANT RECYCLING RULE:
- Each step ID may appear in **only one** recycling instance in the first object.
- Do **not** reuse the same step in multiple arrays inside the recycling entry.
- Once a step is used in one recycling instance, it is no longer eligible for any other recycling pattern.
- If two patterns would require the same step, **choose only one** to include in recycling, and classify the other(s) as **local groupings** instead.
- Recycling should only be applied if it **reduces** the total number of **unique steps** compared to leaving the logic ungrouped. If recycling would keep the step count the same or increase it, treat the pattern as local grouping instead.
- If this rule is violated, the output is considered invalid.


Format each result as a JSON object with these fields  
steps: a two-dimensional array of grouping instances:  
  1. The **first object**’s steps array lists every recycled two-step movement instance as its own inner array (the combined recycling entry).  
  2. After that, emit one separate object per individual two-step movement grouping, each with exactly one inner array.  
general_hint: a brief, high-level description of this pattern  
detailed_hint: a specific explanation of the repeated logic  
Rule: "correct_answer" must not copy the grouped steps verbatim. It should abstract their meaning into reusable logic. If no abstraction is possible, do not recycle them.

 Output rules  
• Return only a raw JSON array.  
• Do not include any text, markdown, comments, or trailing commas.  
• All two-step movement groupings must be listed (both combined and individually).

FORMAT EXAMPLE (FOR REFERENCE ONLY):
***Do not copy any IDs, contents, or substep names from the example into your output.***  


[
  {
    "steps": [
      [ { "id": "X.1" }, { "id": "X.2" }, { "id": "X.3" } ],
      [ { "id": "Y.1" }, { "id": "Y.2" } ]
    ],
    "general_hint": "Example pattern",
    "detailed_hint": "Illustration of grouping structure for two instances",
    "correct_answer": {
      "steps": {
        "Z": {
          "content": "Generalized step",
		  "general_hint": "General Hint",
          "detailed_hint": "Detailed Hint",
          "substeps": {
            "Z1": { 
				"content": "Action A", 
				"general_hint": "General Hint A",
				"detailed_hint": "Detailed Hint A",
				"substeps": {} 
			},
            "Z2": { 
				"content": "Action B",
				"general_hint": "General Hint B",
				"detailed_hint": "Detailed Hint B",
				"substeps": {} 
			},
			// Same structure
          },
		  // Same structure
        }
      }
    }
  },
  {
    "steps": [
      [ { "id": "X.1" }, { "id": "X.2" }, { "id": "X.3" } ]
    ],
    "general_hint": "Grouping instance X",
    "detailed_hint": "Group of substeps X.1 and X.2 illustrates the first instance",
    "correct_answer": {
      "steps": {
        "G": {
          "content": "Generalized step for X grouping",
		  "general_hint": "General Hint",
          "detailed_hint": "Detailed Hint",
          "substeps": {
            "G1": { 
				"content": "Action A", 
				"general_hint": "General Hint A",
				"detailed_hint": "Detailed Hint A",
				"substeps": {} 
			},
            "G2": { 
				"content": "Action B",
				"general_hint": "General Hint B",
				"detailed_hint": "Detailed Hint B",
				"substeps": {} 
			},
			// Same structure
		  },
		  // Same structure
        }
      }
    }
  },
  {
    "steps": [
      [ { "id": "Y.1" }, { "id": "Y.2" } ]
    ],
    "general_hint": "Grouping instance Y",
    "detailed_hint": "Group of substeps Y.1 and Y.2 illustrates the second instance",
    "correct_answer": {
      "steps": {
        "H": {
          "content": "Generalized step for Y grouping",
		  "general_hint": "General Hint",
          "detailed_hint": "Detailed Hint",
          "substeps": {
            "H1": { 
				"content": "Action A", 
				"general_hint": "General Hint A",
				"detailed_hint": "Detailed Hint A",
				"substeps": {} 
			},
            "H2": { 
				"content": "Action B",
				"general_hint": "General Hint B",
				"detailed_hint": "Detailed Hint B",
				"substeps": {} 
			},
			// Same structure
          },
		  // Same structure
        }
      }
    }
  }
]

‼️ Do not return any result unless you have confirmed that all step IDs are unique within the "steps" array. You MUST simulate a final pass and remove any duplicates before output.

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
