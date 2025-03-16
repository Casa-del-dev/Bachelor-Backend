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
						content: `I want you to interpret the following **Context**, **Content**, **Problem Description**, **Existing JSON Structure**, and **ExisistingCode**. Then, generate a structured JSON file describing all steps and if needed substeps contained in the Content depending on the context given.

**Context:**
"${Context}"

**Content:**  
"${Prompt}"

**Problem Description:**  
"${Problem}"

**Existing JSON Steps:**  
${Tree}

**Exisisting Code:**
${Code}

**Important:** The steps might be incorrect, and that's okay—we want them either way. **Do not correct anything.** Your task is only to structure the steps into the given JSON format. Additionally, if **tree** is non-empty in the JSON file, then you should adjust that tree to reflect the new prompt (e.g., by adding a new step if that's what the Content suggests).

---

### **Return Format:**
Depending on the context this would be the output. The output must be a valid JSON object with the following structure:

- **code** → Context: - if "To Code" then give the code - else "" (leave empty string)

if Context: "From Code" then give the from the Code adjusted JSON tree
if Context: "Check" then also add any missing steps into the Tree. And mark them as "status": → Missing
- **steps** → Contains the identified steps from the Content
- Each step includes:
	- "content" → Description of what is happening at this step.
	- "correctStep" → if Context: "Check" then give the correcStep - else Leave as "" (empty string).
	- "code" → if "To Code" then give the same same Code but add comments that described the step - else Leave as "" (empty string). 
	- "prompt" → Extract the text portion from Content that describes this step.
	- "status": → if Context: "Check" give me if the step described is/"Correct"/"Incorrect"/"Dividable/Missing" - else leave as "" (empty string)
	- "general_hint" →  if Context: "Check" give a general hint - else Leave as "" (empty string).
	- "detailed_hint" → if Context: "Check" give a detailed hint - else Leave as "" (empty string).
	- "subSteps" → If the step naturally contains substeps, structure them the same way.

#### **Example JSON Output:**

{
"code": "",
"steps": {
	"1": {
	"content": "Extracted step description from the Content.",
	"correctStep": "Actual correct step",
	"code": "Add comments onto to existing code that describe this step",
	"prompt": "Highlighted portion of the text that explains this step.",
	"status": "Correct/Incorrect/Dividable/Missing",
	"general_hint": "General hint for the step to be correct",
	"detailed_hint": "Detailed hint for the step to be correct",
	"subSteps": {
		"1": {
		"content": "Extracted substep description.",
		"correctStep": "Actual correct Substep",
		"code": "Add comments onto to existing code that describe this Substep",
		"prompt": "Highlighted portion of the text that explains this substep.",
		"status": "Correct/Incorrect/Dividable/Missing",
		"general_hint": "General hint for the step to be correct",
		"detailed_hint": "Detailed hint for the step to be correct"
		},
		...
	}
	},
	"2": {
	"content": "Another identified step.",
	"correctStep": "",
	"code": "",
	"prompt": "",
	"status": "",
	"general_hint": "",
	"detailed_hint": "",
	"subSteps": {}
	},
	...
}
}
---

### **Warning:**
**Do not correct or modify any part of the steps**. Even if the steps seem incorrect, simply structure them as described.  
**Your job is NOT to evaluate correctness**—only to extract steps and format them into the JSON structure.
Extract all possible steps **and substeps** from content. If a step naturally includes smaller actions, structure them as substeps using the provided format.


---

### **Context Dump:**
The purpose of this is to help students understand problems better by structuring them logically. This method supports a structured approach to problem-solving.
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
