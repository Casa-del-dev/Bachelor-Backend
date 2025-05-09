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
						content: `You are a JSON formatter. Your task is to process a Prompt and a Problem Description and return ONLY a valid JSON object, without any surrounding text, markdown, explanations, or additional characters. Output ONLY the raw JSON.

---

Prompt:
"${Prompt}"

Problem Description:
"${Problem}"

---

### Process ###

1. Divide the Prompt into steps. Each step should represent a single action or task needed to solve the Problem Description.
2. Number the steps sequentially starting from "1".
3. If a step **depends on** or **is part of** another step, you **MUST** nest it as a **subStep** of that step.

---

### Warning and Nesting Rules ###

1. If the Prompt is **not related** to the Problem Description, return **one step with empty content**.
2. If the Prompt is **wrong**, **DO NOT** correct it. Output the wrong JSON **as expressed** in the Prompt.
3. You **must** analyze the logical dependencies between steps:
   - If a step **depends on** or **is part of** another, you are **REQUIRED** to nest it as a **subStep** of the parent step.
   - **Do NOT list dependent steps as top-level steps.**
   - Only **independent** steps should appear as top-level steps.
4. **Keep all empty fields as shown**, do **not** remove or fill them with extra information.

---

### Nesting Enforcement Example ###

**Correct Nesting**:

- Step 1: Sort the list.
  - SubStep 1.1: Compare adjacent elements.
  - SubStep 1.2: Swap if they are in the wrong order.
- Step 2: Print the sorted list.

**Incorrect Nesting (Do Not Do This)**:

- Step 1: Sort the list.
- Step 2: Compare adjacent elements.
- Step 3: Swap if they are in the wrong order.
- Step 4: Print the sorted list.

**Reminder**:  
Dependent or detailed actions **must** be nested as subSteps of their parent step.  
Only **independent** actions should be top-level steps.  
**Do not** list dependent steps as separate top-level steps.

---

### Return Format Example ###
{
  "code": "",
  "steps": {
    "1": {
      "id": "unique-step-id",
      "content": "Extracted step description.",
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
          "id": "unique-substep-id",
          "content": "Extracted substep description.",
          "correctStep": "",
          "code": "",
          "status": {
            "correctness": "",
            "can_be_further_divided": ""
          },
          "general_hint": "",
          "detailed_hint": ""
        }
      }
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
