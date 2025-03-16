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

const service: Service = {
	path: '/openai/v2/',

	async fetch(request: Request, env: Env, ctx: ExecutionContext, subPath: string): Promise<Response | void> {
		if (request.method !== 'POST') {
			return new Response('Method Not Allowed', { status: 405 });
		}

		try {
			const data: RequestBody = await request.json();
			const mergedPayload = data.requestBody ?? data;
			const { Problem, Tree } = mergedPayload;

			if (!Problem || !Tree) {
				return new Response('Missing Prompt, Problem, Tree, Context, or Code in request body', { status: 400 });
			}

			const payload = {
				model: 'gpt-4o',
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

			const result = await openaiResponse.json();
			return;
			new Response(JSON.stringify(result), { status: 200 });
		} catch (error) {
			console.error('Error processing OpenAI request:', error);
			return new Response('Internal Server Error', { status: 500 });
		}
	},
};

export default service;
