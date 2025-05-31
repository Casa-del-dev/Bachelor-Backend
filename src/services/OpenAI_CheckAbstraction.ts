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
						content: `Check if the following two step trees explain the same thing step-by-step.

Implemented solution:
${treeJSON1}

Actual correct solution:
${treeJSON2}

Note:
- Both use trees with children or substeps — treat them equivalently.
- Consider explanations semantically.
- Only return "Yes" if all corresponding steps explain the same thing.
- Return "No" if even one step differs.
Only reply with "Yes" or "No".
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
