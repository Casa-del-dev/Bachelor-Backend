import { Service } from '..';

const service: Service = {
	path: '/openai/v1/',

	async fetch(request: Request, env: Env, ctx: ExecutionContext, subPath: string): Promise<Response | void> {
		// Handle CORS preflight requests
		if (request.method === 'OPTIONS') {
			return new Response(null, {
				status: 204,
				headers: {
					'Access-Control-Allow-Origin': '*', // Update for production
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
			// Expect a JSON body with a "textprompt" property.
			const requestBody = (await request.json()) as { Prompt: string; Problem: string; Tree: object };
			const Prompt = requestBody.Prompt;
			const Problem = requestBody.Problem;
			const Tree = JSON.stringify(requestBody.Tree, null, 2);

			if (!Prompt?.trim() || !Problem || !Tree) {
				console.log(!Prompt?.trim());
				console.log(!Problem);
				console.log(!Tree);
				return new Response('Missing Prompt, Problem, or Tree in request body', { status: 400 });
			}

			// Prepare the payload for OpenAI's ChatGPT API
			const payload = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						content: `Problem:
					I want you to interpret the following **Content**, **Problem Description**, and **Existing JSON Structure**. Then, generate a structured JSON file describing all steps contained in the Content.

					**Content:**  
					"${Prompt}"

					**Problem Description:**  
					"${Problem}"

					**Existing JSON Steps:**  
					${Tree}

					**Important:** The steps might be incorrect, and that's okay—we want them either way. **Do not correct anything.** Your task is only to structure the steps into the given JSON format. Additionally, if **tree** is non-empty in the JSON file, then you should adjust that tree to reflect the new prompt (e.g., by adding a new step if that's what the Content suggests).

					---

					### **Return Format:**
					The output must be a valid JSON object with the following structure:

					- **context** → "Input Text"
					- **full_code** → "" (empty string)
					- **tree** → "Same as given"
					- **steps** → Contains the identified steps from the Content
					- Each step includes:
						- "content" → Description of what is happening at this step.
						- "correctStep" → Leave as "" (empty string).
						- "code" → Leave as "" (empty string).
						- "prompt" → Extract the text portion from Content that describes this step.
						- "status":
						- "correctness" → Leave as "" (empty string).
						- "can_be_further_divided" → Leave as "" (empty string).
						- "general_hint" → Leave as "" (empty string).
						- "detailed_hint" → Leave as "" (empty string).
						- "subSteps" → If the step naturally contains substeps, structure them the same way.

					#### **Example JSON Output:**

					{
					"context": "Input Text",
					"full_code": "",
					"tree": "",
					"steps": {
						"1": {
						"content": "Extracted step description from the Content.",
						"correctStep": "",
						"code": "",
						"prompt": "Highlighted portion of the text that explains this step.",
						"status": {
							"correctness": "",
							"can_be_further_divided": ""
						},
						"general_hint": "",
						"detailed_hint": "",
						"subSteps": {
							"1": {
							"content": "Extracted substep description.",
							"correctStep": "",
							"code": "",
							"prompt": "Highlighted portion of the text that explains this substep.",
							"status": {
								"correctness": "",
								"can_be_further_divided": ""
							},
							"general_hint": "",
							"detailed_hint": ""
							}
						}
						},
						"2": {
						"content": "Another identified step.",
						"correctStep": "",
						"code": "",
						"prompt": "Highlighted portion of the text.",
						"status": {
							"correctness": "",
							"can_be_further_divided": ""
						},
						"general_hint": "",
						"detailed_hint": "",
						"subSteps": {}
						}
					}
					}
					---

					### **Warning:**
					🚨 **Do not correct or modify any part of the steps**. Even if the steps seem incorrect, simply structure them as described.  
					🚨 **Your job is NOT to evaluate correctness**—only to extract steps and format them into the JSON structure.

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
