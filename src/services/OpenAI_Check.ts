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

			const payload = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						content: `Goal:

Interpret the following Problem and JSON Tree, and generate a new JSON file that is semantically equivalent — meaning it has the same number of steps and substeps unless the Problem context clearly requires adding a step or substep.

**Tree:**  
"${Tree}"

**Problem:**  
"${Problem}"

You should update only the following properties based on correctness:
- status.correctness
- status.can_be_further_divided
- correctStep (only if step is incorrect/missing)
- general_hint (only if step is incorrect/missing)
- detailed_hint (only if step is incorrect/missing)

Return Format:

- steps → Keep all original steps, unless the Problem clearly calls for adding a blank step.
- Each step contains:
  - "content" → Keep as input.
  - "correctStep" → Fill only if correctness is "incorrect" or "missing".
  - "prompt" → Keep as input.
  - "status":
    - "correctness" → "correct" / "incorrect" / "missing" — based on Problem.
    - "can_be_further_divided" → "can" / "cannot" — based on Problem.
  - "general_hint" → Fill only if correctness is not "correct".
  - "detailed_hint" → Fill only if correctness is not "correct".
  - "subSteps" → Keep as input, unless the Problem requires a new blank substep.

What qualifies as a substep?

- A task required to complete a larger step.
- A process dependent on the parent step.
- A breakdown of a broad action into finer details.

What is a blank step or substep?

A step or substep that contains all empty string values ("") except:

"status": {
  "correctness": "missing"
}

Example JSON Output:

{
  "code": "",
  "steps": {
    "1": {
      "id": "step-${Date.now()}-${Math.floor(Math.random() * 10000)}",
      "content": "Same as input",
      "correctStep": "The correct step, only if not correct",
      "code": "",
      "prompt": "Same as input",
      "status": {
        "correctness": "correct / incorrect / missing",
        "can_be_further_divided": "can / cannot"
      },
      "general_hint": "Only if not correct",
      "detailed_hint": "Only if not correct",
      "subSteps": {
        "1": {
          "id": "step-${Date.now()}-${Math.floor(Math.random() * 10000)}",
          "content": "Same as input",
          "correctStep": "Only if not correct",
          "code": "",
          "prompt": "Same as input",
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
