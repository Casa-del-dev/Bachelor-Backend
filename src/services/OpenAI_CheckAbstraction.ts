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
						content: `You are given two step trees representing explanations of a solution.
Each tree is a hierarchical structure where steps may have substeps (either named children or substeps — treat them equivalently).

Each step has a content field.
Compare the structure strictly and the content semantically:
	Steps and substeps must appear in the same positions in both trees.
	The number and order of steps and substeps must match.
	The content field of each step must express the same idea, even if worded differently (e.g., paraphrased or simplified).

✅ Respond "Yes" if:
	All steps match in position and number
	All corresponding content fields describe the same action, purpose, or process — even if not phrased identically

❌ Respond "No" if:
	Any step is missing, extra, or out of place
	Any content differs significantly in meaning (not just wording)
	Ignore all fields other than content.

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
