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
			const requestBody = (await request.json()) as { textprompt: string };
			const textprompt = requestBody.textprompt;

			if (!textprompt) {
				return new Response('Missing textprompt in request body', { status: 400 });
			}

			// Prepare the payload for OpenAI's ChatGPT API
			const payload = {
				model: 'gpt-4', // or another supported model
				messages: [{ role: 'user', content: 'HelloWorld!' }],
				// You can add optional parameters like temperature, max_tokens, etc.
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
