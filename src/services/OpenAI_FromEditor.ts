import { Service } from '..';

interface Payload {
	Problem: string;
	Code: string;
}

interface RequestBody {
	requestBody?: Payload;
	Problem: string;
	Code: string;
}

const service: Service = {
	path: '/openai/v3/',

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
			const { Problem, Code } = mergedPayload;

			if (!Code || !Problem) {
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
						content: `'''Given the following problem and a student's current incomplete code:
Problem: ''' + ${Problem} + '''
Student code: ''' + ${Code} + '''
Please perform two tasks.
Task 1: Output a series of steps. For each step, you need to
identify its two statuses based on the student's incomplete code. The
first status contains three dimension: correct, incorrect, or missing.
The second status is whether this step can be furthered divided into
detailed steps or cannot be further divided into detailed steps. For
each step or substep, identify the corresponding lines of code that
match the step or substep. If no corresponding code lines, set this
item as empty.
Task 2: For each step that is incorrect, can be divided into
detailed steps, or missing, generate a friendly and encouraging hint.
For incorrect step, generate a hint that skillfully guides the student
towards the correct answer but without revealing the actual answers.
For missing step, generate what is the general goal for the missing
parts and providing a guidance to guide the student towards the
expected goal, but do not reveal the answers. For steps that can be
further divided into detailed steps, generate a hint and the detailed
sub-steps.
Please output the steps and their corresponding status and hints in
a JSON format. Please be sure to stick to this format.
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
