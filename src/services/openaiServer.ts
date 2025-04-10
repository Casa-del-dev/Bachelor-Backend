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
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						content: `Problem:
I want you to interpret the following **Content**, **Problem Description**. Then, generate a structured JSON file describing all steps and if needed substeps contained in the Content.
 
**Content:**  
"${Prompt}"

**Problem Description:**  
"${Problem}"

**Important:** The steps might be incorrect, and that's okay—we want them either way. **Do not correct anything.** Your task is only to structure the steps into the given JSON format. Additionally, if **tree** is non-empty in the JSON file, then you should adjust that tree to reflect the new prompt (e.g., by adding a new step if that's what the Content suggests).
Important: You MUST extract substeps wherever possible. If a portion of the content logically falls under a larger step, it MUST be placed as a substep. Avoid flattening the structure—use substeps whenever the content suggests a hierarchy. If there is any doubt, favor using substeps.

---

### **Return Format:**
The output must be a valid JSON object with the following structure:

- **steps** → Contains the identified steps from the Content
- Each step includes:
  - "content" → Description of what is happening at this step.
  - "correctStep" → Leave as "" (empty string).
  - "code" → Leave as "" (empty string).
  - "status" → {
        "correctness" → Leave as "" (empty string),
        "can_be_further_divided"→ Leave as "" (empty string)
      },
  - "general_hint" → Leave as "" (empty string).
  - "detailed_hint" → Leave as "" (empty string).
  - "subSteps" → If the part if the content can be a subset of a step, structure them the same way.

What qualifies as a substep?
A task that is required to complete a larger step.
A process that naturally depends on the step it is under.
A breakdown of a broad action into finer details.

#### **Example JSON Output:**

{
  "code": "",
  "steps": {
    "1": {
      id: step-${Date.now()}-${Math.floor(Math.random() * 10000)},
      "content": "Extracted step description from the Content.",
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
          id: step-${Date.now()}-${Math.floor(Math.random() * 10000)},
          "content": "Extracted substep description.",
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
      id: step-${Date.now()}-${Math.floor(Math.random() * 10000)},
      "content": "Another identified step.",
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

---

### **Warning:**
**Do not correct or modify any part of the steps**. Even if the steps seem incorrect, simply structure them as described.  
**Your job is NOT to evaluate correctness**—only to extract steps and format them into the JSON structure.
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
