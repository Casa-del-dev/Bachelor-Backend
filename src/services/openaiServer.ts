import { Service } from '..';

interface Payload {
	Context?: string;
	Prompt?: string;
	Problem?: string;
	Tree?: object;
	Code?: string;
}

interface RequestBody {
	requestBody?: Payload;

	Context: string;
	Prompt?: string;
	Problem: string;
	Tree?: object;
	Code?: string;
}

const service: Service = {
	path: '/openai/v1/',

	async fetch(request: Request, env: Env, ctx: ExecutionContext, subPath: string): Promise<Response | void> {
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
					'Access-Control-Max-Age': '86400',
				},
			});
		}

		if (request.method !== 'POST') {
			return new Response('Method Not Allowed', { status: 405 });
		}

		try {
			const data: RequestBody = await request.json();

			const mergedPayload = data.requestBody ?? data;

			const { Context, Prompt, Problem, Tree, Code } = mergedPayload;

			if (!Prompt?.trim() || !Problem || !Tree) {
				return new Response('Missing Prompt, Problem, or Tree in request body', { status: 400 });
			}

			// Prepare the payload for OpenAI's ChatGPT API
			const payload = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						content: `I want you to interpret the following inputs:

1. **Context:**  
${Context}

2. **Content:**  
${Prompt}

3. **Problem Description:**  
${Problem}

4. **Existing JSON Steps:**  
${Tree}

5. **Existing Code:**  
${Code}

---

### Task

- Generate a **valid JSON** object (and only a JSON object, without additional explanation) that describes all steps mentioned in **Content**, structured according to the template below. 
- **Do not correct or modify** any step or substep. If the steps appear incorrect, simply include them as they are.
- If **tree** (Existing JSON Steps) is non-empty, update it to reflect the newly parsed steps from the **Content** (e.g., add new steps if needed). 
- Follow these rules based on the **Context**:
- If {Context} is {"To Code"}, populate {"code"} fields with the relevant code plus step-comments. Otherwise, leave those {"code"} fields as {""}.
- If {Context} is {"Check"}, populate {"correctStep"}, {"status"}, {"general_hint"}, and {"detailed_hint"} fields. Otherwise, leave them empty.
- If {Context} is {"From Code"}, return the JSON steps based on how the code has changed or needs to change.

---

### Required JSON Structure


{
"code": "...", // Only fill if Context is "To Code", otherwise an empty string
"steps": {
 "1": {
   "content": "Description of what is happening at this step",
   "correctStep": "",   // If Context is "Check", fill with the correct step, else ""
   "code": "",          // If Context is "To Code", include code with comments here, else ""
   "prompt": "Portion of the text from Content describing this step",
   "status": "",        // If Context is "Check", fill with "Dividable", "Correct", "Incorrect", or "missing"
   "general_hint": "",  // If Context is "Check", fill with a general hint, else ""
   "detailed_hint": "", // If Context is "Check", fill with a detailed hint, else ""
   "subSteps": {
     "1": {
       "content": "Description of substep",
       "correctStep": "",
       "code": "",
       "prompt": "Portion of the text from Content describing this substep",
       "status": "",
       "general_hint": "",
       "detailed_hint": ""
     }
     // More substeps if needed
   }
 },
 "2": {
   "content": "...",
   "correctStep": "",
   "code": "",
   "prompt": "...",
   "status": "",
   "general_hint": "",
   "detailed_hint": "",
   "subSteps": {}
 }
 // More steps if needed
}
}

Important Notes
Do not correct the steps or substeps, even if they are wrong.
Output must be valid JSON with no additional text or explanation outside of the JSON structure.
					`,
					},
				],
				temperature: 0,
			};

			// Call the OpenAI API
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
				return new Response(`OpenAI API Error: ${errorText}`, { status: openaiResponse.status });
			}

			// Return the JSON response from OpenAI
			const result = await openaiResponse.json();
			return new Response(JSON.stringify(result), {
				status: 200,
				headers: {
					'Content-Type': 'application/json',
					'Access-Control-Allow-Origin': '*', // Update for production
				},
			});
		} catch (error) {
			console.error('Error processing OpenAI request:', error);
			return new Response('Internal Server Error', { status: 500 });
		}
	},
};

export default service;
