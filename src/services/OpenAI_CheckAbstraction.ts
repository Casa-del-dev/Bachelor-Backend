import { json } from 'express';
import { test } from '.';
import { Service } from '..';

interface Payload {
	solutionSteps: string;
	actualSolutionSteps: string;
}

interface RequestBody {
	requestBody?: Payload;
	solutionSteps: string;
	actualSolutionSteps: string;
}

const service: Service = {
	path: '/openai/v6/',

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
			const { solutionSteps, actualSolutionSteps } = mergedPayload;

			if (!solutionSteps || !actualSolutionSteps) {
				return new Response('Missing Prompt, Problem, Tree, Context, or Code in request body', {
					status: 400,
					headers: { 'Access-Control-Allow-Origin': '*' },
				});
			}

			const treeJSON1 = JSON.stringify(solutionSteps);
			const treeJSON2 = JSON.stringify(actualSolutionSteps);

			const payload = {
				model: 'gpt-4o',
				messages: [
					{
						role: 'user',
						content: `You are given two hierarchical step trees that represent problem-solving explanations.
Each step object has many fields, but you must only look at the content field.

Treat children and substeps as equivalent nesting fields.

Ignore all fields except content. That includes:
correctStep, general_hint, detailed_hint, id, prompt, status, etc.

Compare both trees by structure and content, step by step:

Position must match: e.g., the first child of the first step must match its counterpart

content values must be exactly the same (not similar or paraphrased)

✅ Respond "Yes" if and only if all step positions and content values match exactly
❌ Respond "No" if even one step differs in content or structure

Ignore all hints, correctness, prompts, or identifiers.

Implemented solution:
${treeJSON1}

Actual correct solution:
${treeJSON2}

Answer with only "Yes" or "No". Do not add explanations.
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
