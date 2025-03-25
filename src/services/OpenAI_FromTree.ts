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
			const { Tree, Code } = mergedPayload;

			if (!Code || !Tree) {
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

Using the input **Code** and **Tree**, follow the instructions below:
For each step (and substep) in the **Tree**, if the described **content** is implemented in the **Code**, extract and insert the corresponding code snippet into the "code" field.  
If it is **not implemented**, insert "Not implemented" in the "code" field.

Your task is to return the **same Tree structure** (a JSON file), but with each "code" field filled accordingly.
**Do not change any other part** of the structure. Only fill in the "code" fields.

**Code:**  
"${Code}"

**Tree:**  
"${Tree}"

Return Format:

A JSON object where each "step" and "subStep" includes:
- "code" → either the matching code snippet (from the **Code** input), or "Not implemented"

All other fields **must remain exactly as in the input Tree**.

Example JSON Output:

{
  "steps": {
    "1": {
      "id": "Same as input",
      "content": "Same as input",
      "correctStep": "Same as input",
      "code": "Corresponding code snippet or 'Not implemented'",
      "prompt": "Same as input",
      "status": {
        "correctness": "Same as input",
        "can_be_further_divided": "Same as input",
      },
      "general_hint": "Same as input",
      "detailed_hint": "Same as input",
      "subSteps": {
        "1": {
          "id": "Same as input",
          "content": "Same as input",
          "correctStep": "Same as input",
          "code": "Corresponding code snippet or 'Not implemented'",
          "prompt": "Same as input",
          "status": {
            "correctness": "Same as input",
            "can_be_further_divided": "Same as input",
          },
          "general_hint": "Same as input",
          "detailed_hint": "Same as input",
        }
      }
    },
    "2": {
      // Same structure as above
    }
  }
}

### **Warning:**
Only give as output the json file no words before or after!
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
