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

### **Process** ###

First, divide the Prompt into steps. Each step should be a single action or task that needs to be performed to solve the Problem Description. The steps should be numbered sequentially and can have substeps if necessary.


### **Warning** ###

You **must** extract steps from the Prompt unless the Prompt is completely irrelevant, nonsense, or unrelated to programming.
A Prompt is considered related if:
	It describes any action toward solving the Problem Description, even incomplete or vague.
	It contains a partial plan, intuition, or attempt toward the task.
	It mentions operations, data structures, algorithms, or processing steps.
	You should never return an empty step just because the Prompt is vague or partially incorrect. Extract what is there.
	Only return a single empty step if the Prompt is completely unrelated to the Problem Description, such as:
	Descriptions of unrelated domains (e.g., cooking, sports, etc.).
	Nonsense or non-programming content.If the prompt is solving the Problem Description wrongly you **DO NOT** Change the intended solution and Output the wrong JSON as intended by the Prompt.

You **must** analyze the logical dependencies between steps:
	- Phrases like "First", "Next", and "Finally" do NOT imply all steps are independent.
	- If a step is part of or depends on another, it is REQUIRED to be placed as a subStep inside the parent step.
	- Do NOT list dependent steps as separate top-level steps.
	- Only independent steps should be top-level.
	- Do not assume that adding a subStep prevents you from adding other independent top-level steps.

	** Do not treat all steps as flat unless they are truly independent: ** for example, when the prompt says finally return x. Don't assume that the previous steps are not nested. Always check if they are and if they are put them as substeps of each one.

In the return format you will see a lot of empty fields, those are required to stay empty.

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
