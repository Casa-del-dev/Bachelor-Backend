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

			const payload = {
				model: 'gpt-4o',
				messages: [
					{
						role: 'user',
						content: `You are an analyzer. Your task is to analyze the given correct step tree:

${Tree}

Your goal is to detect patterns or repeated logic across the step tree. Identify:
- Groupings: different steps that implement the same logic but in different places.
- Reusable steps: logic that could be abstracted and reused.

---

Format each grouping or recycling as a JSON object with:
- "status": either "grouping" or "recycling"
- "steps": a list of arrays, where each array represents one instance of the repeated logic (each array contains step objects with only the "id" field)
- "general_hint": a high-level hint describing the shared logic
- "detailed_hint": a specific explanation of the repeated pattern
- "correct_answer": a JSON object that represents the ideal generalized version of the logic using a full nested step tree

---

Output Rules:
- Output only raw JSON
- Do not include any text, markdown, explanations, or comments
- "steps" must be a list of arrays of step objects
- "correct_answer" must follow the step tree structure shown below
- Do not include trailing commas

---

Example:

[
  {
    "status": "grouping",
    "steps": [
      [ { "id": "1" }, { "id": "2" } ],
      [ { "id": "5" }]
    ],
    "general_hint": "Each group initializes a loop and a counter.",
    "detailed_hint": "These steps all set an index and loop over an array.",
    "correct_answer": {
      "steps": {
        "1": {
          "content": "Initialize loop and counter",
          "correctStep": "",
          "code": "",
          "status": {
            "correctness": "correct",
            "can_be_further_divided": "cannot"
          },
          "general_hint": "",
          "detailed_hint": "",
          "subSteps": {
            "1": {
              "content": "Set i = 0",
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
      }
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
