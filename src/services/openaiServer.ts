import { Service } from '..';

interface Payload {
	Prompt?: string;
	Problem?: string;
}

interface RequestBody {
	requestBody?: Payload;
	Prompt?: string;
	Problem: string;
}

const service: Service = {
	path: '/openai/v1/',

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
			const { Prompt, Problem } = mergedPayload;

			if (!Prompt?.trim() || !Problem) {
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
						content: `Given a Prompt and a Problem Description I want you to give me **only** a JSON file. Do not include any text, markdown, explanations, commas before/after the JSON, or anything else. Only output the raw JSON.

**Prompt:**  
"${Prompt}"

**Problem Description:**  
"${Problem}"

### **Warning** ###

If the prompt is not trying to solve the Problem Description you just return 1 step with empty content.
If the prompt is solving the Problem Description wrongly you **DO NOT** Change the intended solution and Output the wrong JSON as intended by the Prompt.
If the prompt contains a process that naturally depends on the step it is under or a breakdown of a broad action into finer Details you put it as a substep of the depended step!

### **Return Format:** ###

{
  "code": "",
  "steps": {
    "1": {
      id: unique ID},
      "content": Extracted step description from the Prompt.,
      "correctStep": "",
      "code": "",
      "status": {
        "correctness": "",
        "can_be_further_divided": ""
      },
      "general_hint": "",
      "detailed_hint": "",
      "subSteps": {
        "1": {
          id: unique ID},
          "content": Extracted substep Prompt.,
          "correctStep": "",
          "code": "",
          "status": {
				"correctness": "",
				"can_be_further_divided": ""
			},
          "general_hint": "",
          "detailed_hint": ""
        },
        ...
      }
    },
    "2": {
      id: unique ID},
      "content": Extracted substep Prompt.,
      "correctStep": "",
      "code": "",
      "status": {
        "correctness": "",
        "can_be_further_divided": ""
      },
      "general_hint": "",
      "detailed_hint": "",
      "subSteps": {
	  ...
	  }
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
