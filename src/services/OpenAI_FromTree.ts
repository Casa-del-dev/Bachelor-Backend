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
			let { Tree, Code } = mergedPayload;

			if (!Code || !Tree) {
				if (Code === null) {
					Code = '';
				} else {
					return new Response('Missing Prompt, Problem, Tree, Context, or Code in request body', {
						status: 400,
						headers: { 'Access-Control-Allow-Origin': '*' },
					});
				}
			}

			const payload = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						content: `Goal: 

Using the input **Code** and **Tree**, follow the instructions below:

1. For each step (and substep) in the Tree:
   - If and only if the described **content** is implemented in the **Code**, extract and insert the corresponding code snippet into the "code" field.
   - Otherwise (if the content is not implemented or is implemented incorrectly), insert "Not implemented correctly" into the "code" field.

2. DO NOT modify any other part of the Tree!
   - All steps and subSteps (even if they seem empty or partially filled) must be preserved.
   - All keys and values (like "id", "content", "status", etc.) must remain exactly as in the input Tree.
   - Do not delete steps or subSteps, even if "code" or "content" is missing or empty.
   - Do not reformat or clean the JSON structure in any way.

**Code:**  
"${Code}"

**Tree:**  
"${Tree}"  
*(Note: In this prompt, the Tree is an array of steps)*

Return Format:

Return a JSON object with exactly one key:
- "steps" → an object where each step (and subStep) is indexed with a numerical key (as shown in the example below).

🚨 Important: You must also return a **code** field that includes the original code with added inline comments that describe the purpose of each step and substep. These comments should clearly map the code logic to the described step structure. The **def main()** function should appear **at the end of the code**, commented and preserved, but not step-labeled.

Example JSON Output:

{
  "code": "// Original code with added comments that describe the steps",
  "steps": {
    "1": {
      "id": "Same as input",
      "content": "Same as input",
      "correctStep": "Same as input",
      "code": "Corresponding code snippet if implemented correctly, or 'Not implemented correctly' if the step is correct but not implemented correctly, otherwise an empty string",
      "prompt": "Same as input",
      "status": {
        "correctness": "Same as input",
        "can_be_further_divided": "Same as input"
      },
      "general_hint": "Same as input",
      "detailed_hint": "Same as input",
      "subSteps": {
        "1": {
          "id": "Same as input",
          "content": "Same as input",
          "correctStep": "Same as input",
          "code": "Corresponding code snippet or 'Not implemented correctly' as per the rules above",
          "prompt": "Same as input",
          "status": {
            "correctness": "Same as input",
            "can_be_further_divided": "Same as input"
          },
          "general_hint": "Same as input",
          "detailed_hint": "Same as input"
	  "subSteps": {
            "1": {
              // Same structure
            }
          }
        }
      }
    },
    "2": {
      // Same structure as above
    }
  }
}

**Warning**:
Only output the raw JSON with no extra words, wrapping, or quotes.
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
