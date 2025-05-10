import { Service } from '..';

interface Payload {
	Problem: string;
	Tree: object;
}

interface RequestBody {
	requestBody?: Payload;
	Problem: string;
	Tree: object;
}

const service: Service = {
	path: '/openai/v2/',

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
			const { Tree, Problem } = mergedPayload;

			if (!Tree || !Problem) {
				return new Response('Missing Prompt, Problem, Tree, Context, or Code in request body', {
					status: 400,
					headers: { 'Access-Control-Allow-Origin': '*' },
				});
			}

			const payload = {
				model: 'gpt-4o',
				messages: [
					{
						role: 'user',
						content: `You are a code review assistant. You will receive a JSON object which you are required to analyze and provide feedback on, through the Problem description. 
You are expected to return a raw JSON do not include any text, markdown, explanations, commas before/after the JSON, or anything else. Only output the raw JSON.

JSON Input:
Tree: ${Tree}

Problem Description:
${Problem}

First of you have a to fill in the status:
	correctness: correct / incorrect / missing
	can_be_further_divided: can / cannot

	If the step described is correct then mark it as 'correctness: correct' and 'can_be_further_divided: "cannot"'.
	If the step described is correct but can be further divided in smaller steps mark it as 'correctness: correct' and 'can_be_further_divided: can'.
	If the step described is incorrect mark it as 'correctness: incorrect' and depending if it can be further divided or not mark it as 'can_be_further_divided: "can / cannot"'.

	If the a step is not present but the context solution requires an additional step you should add it yourself and mark it as 'correctness: missing' and 'can_be_further_divided: "".

	If you mark a step as incorrect, dividable or missing you **must** add a general, detailed hint, and provide the correctSolution.

Additional Instructions:

## ✅ **SubStep Rules**

- A **substep** is any action that:
- **Depends on the parent step to make sense**,  
- **Breaks down the parent into smaller actions**, or  
- **Is logically part of completing the parent step**.

- **Do not flatten** all steps to the top-level if they are **logically part** of a parent step.
- **Add substeps** if the Problem describes finer details that are **part of a broader action**.
- **Do not add substeps randomly**; apply this rule only when **dependency or breakdown makes sense**.

---

## ✅ **Placement of Missing Steps**

- **Insert missing steps in the correct logical order**:
- **Before** any step that depends on them (e.g., initialize 'total' before summing values).
- **After** other steps **only if independent** and **logically makes sense**.
- **Nested** as **substeps** if they are **required to complete an existing broader step**.

- **Do not add missing steps at the end by default**.  
**Always check the logical sequence.**



Example JSON Output:

{
  "steps": {
    "1": {
      "content": "Same as input",
      "correctStep": "The correct step, only if not correct",
      "code": "// keep as input",
      "status": {
        "correctness": "correct / incorrect / missing",
        "can_be_further_divided": "can / cannot"
      },
      "general_hint": "Only if not correct",
      "detailed_hint": "Only if not correct",
      "subSteps": {
        "1": {
          "content": "Same as input",
          "correctStep": "Only if not correct",
          "code": "// keep as input",
          "status": {
            "correctness": "correct / incorrect / missing",
            "can_be_further_divided": "can / cannot"
          },
          "general_hint": "Only if not correct",
          "detailed_hint": "Only if not correct"
        }
      }
    },
    "2": {
      // Same structure as above
    }
  }
}

### **Warning:**
Only give as output the json file no words before or after! **Do not include any text, markdown, explanations, commas before/after the JSON, or anything else. Only output the raw JSON.**
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
