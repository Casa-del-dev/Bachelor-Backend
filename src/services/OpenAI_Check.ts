import { Service } from '..';

interface Payload {
	Problem: string;
	Tree: string;
}

interface RequestBody {
	requestBody?: Payload;
	Problem: string;
	Tree: string;
}

function withCORS(response: Response): Response {
	// Clone the original headers, then set the CORS header
	const headers = new Headers(response.headers);
	headers.set('Access-Control-Allow-Origin', '*');
	return new Response(response.body, {
		status: response.status,
		headers,
	});
}

const service: Service = {
	path: '/openai/v2/',

	async fetch(request: Request, env: Env, ctx: ExecutionContext, subPath: string): Promise<Response | void> {
		// 1. Handle CORS Preflight (OPTIONS) requests
		if (request.method === 'OPTIONS') {
			// Return a 204 with the necessary CORS headers
			const preflightResponse = new Response(null, {
				status: 204,
				headers: {
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
					'Access-Control-Allow-Headers': 'Content-Type, Authorization',
					'Access-Control-Max-Age': '86400',
				},
			});
			return preflightResponse;
		}

		// 2. Allow only POST requests
		if (request.method !== 'POST') {
			return withCORS(new Response('Method Not Allowed', { status: 405 }));
		}

		try {
			// 3. Parse incoming JSON
			const data: RequestBody = await request.json();
			const mergedPayload = data.requestBody ?? data;
			const { Problem, Tree } = mergedPayload;

			// 4. Validate required fields
			if (!Problem || !Tree) {
				return withCORS(new Response('Missing Prompt, Problem, Tree, Context, or Code in request body', { status: 400 }));
			}

			// 5. Prepare payload for OpenAI
			const payload = {
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						content: `Given the following problem and the incomplete solution steps given
by the student
Problem: ''' + ${Problem} + '''
Student's solution steps A: ''' + ${Tree} + '''
The student solution steps A may contain incorrect steps, redundant
steps, and there may be missing steps between the input steps.
Please perform three tasks:
First, for each step and substep in A, you need to determine its two
statuses. The first status is the correctness: correct, incorrect. The
second status is whether this step or substep can be further divided
into detailed steps: can or cannot.
Second, if there are any missing steps or substeps in A, you need to
add the missing steps or substeps into A and set their 'student current
input', 'status', 'general_hint', 'detailed_hint', 'correctStep'
accordingly. Note that the correctness of 'status' should be “missing”.
Third, generate feedback for each step or substep in A. For
incorrect steps, (1) generate hints that cleverly guide students to
find the correct answer without revealing the actual answer; (2)
generate correct steps. For missing steps, generate the overall goal of
the missing part and provide guidance to guide students toward the
expected goal without revealing the answer. For steps that can be
further divided into detailed steps, generate hints and detailed substeps.
Please output the steps and their corresponding states and hints in
JSON format. Please be sure to stick to this format.
{
"code": "",
"steps": {
    "1": {
    id: step-\${Date.now()}-\${Math.floor(Math.random() * 10000)}
    "content": "what the student currently input
    for this step (it can be '' if no corresponding steps in A)",
    "correctStep": "If this substep is incorrect or
    missing, what should the correct substep be?",
    "code": "",
    "prompt": "Highlighted portion of the text that explains this step.",
    "status": {
        "correctness": "correct / incorrect / missing",
        "can_be_further_divided": "can / cannot"
    },
    "general_hint": "a question form hint that provides
    a general guide to the student",
    "detailed_hint": "a detailed hint that gives more specific
    guide but without showing the answer",
    "subSteps": {
        "1": {
        id: step-\${Date.now()}-\${Math.floor(Math.random() * 10000)}
        "content": "what the student currently input
        for this step (it can be '' if no corresponding steps in A)",
        "correctStep": "If this substep is incorrect or
        missing, what should the correct substep be?",
        "code": "",
        "prompt": "Highlighted portion of the text that explains this substep.",
        "status": {
            "correctness": "correct / incorrect / missing",
            "can_be_further_divided": "can / cannot"
        },
        "general_hint": "a question form hint that provides
        a general guide to the student",
        "detailed_hint": "a detailed hint that gives more specific
        guide but without showing the answer"
        },
        ...
    }
    },
    "2": {...},
    ...
}
}`,
					},
				],
				temperature: 0.8,
			};

			// 6. Call OpenAI API
			const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${env.OPENAI_API_KEY}`,
				},
				body: JSON.stringify(payload),
			});

			// 7. If OpenAI responds with an error, wrap in CORS
			if (!openaiResponse.ok) {
				const errorText = await openaiResponse.text();
				return withCORS(new Response(`OpenAI API Error: ${errorText}`, { status: openaiResponse.status }));
			}

			// 8. Return successful JSON response, wrapped in CORS
			const result = await openaiResponse.json();
			return withCORS(
				new Response(JSON.stringify(result), {
					status: 200,
					headers: {
						'Content-Type': 'application/json',
					},
				})
			);
		} catch (error) {
			console.error('Error processing OpenAI request:', error);
			// 9. Wrap any internal server error in CORS
			return withCORS(new Response('Internal Server Error', { status: 500 }));
		}
	},
};

export default service;
