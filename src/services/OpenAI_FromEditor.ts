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
						content: `Goal: 
Use the provided **Code** to generate a structured step tree, then use the **Problem description** to verify that the steps are complete and correct.

You must analyze the Code to infer its intended logic and structure it as a sequence of steps and substeps. Then, use the Problem description to check whether these steps are sufficient, correct, and complete. If the Problem describes logic that is **missing or unrepresented** in the Code, you **must** add **blank steps or substeps** to the output to reflect what is missing.

The resulting JSON must represent a **semantically complete solution** to the Problem. This means:

- Every step or substep described or implied by either the **Code** or **Problem** must be present.
- The original structure should be preserved unless additions are required to fully represent the Problem logic.

---

Code:  
${Code}

Problem:  
${Problem}

---

Update Only the Following Properties (when needed):

- status.correctness
- status.can_be_further_divided
- correctStep (Only if the step is incorrect or missing)
- general_hint (Required if a step is incorrect, missing, or can be further divided)
- detailed_hint (Required if a step is incorrect, missing, or can be further divided)
- Add new **blank** steps or substeps only if the Problem introduces logic that is missing from the Code

---

Status Rules:

- If a step is present but incorrect, mark it as "incorrect" — do **not** delete or blank it.
- Mark a step as "missing" only if it is completely absent from the structure.
- If status.can_be_further_divided = "can", provide general_hint and detailed_hint to guide the breakdown.

---

Definitions:

**What is a substep?**
- A task required to complete a larger step.
- A smaller process nested under a parent step.
- A finer breakdown of a broader action.

**What is a blank step or substep?**
A placeholder with only the following values:

{
  "content": "",
  "correctStep": "",
  "prompt": "",
  "code": "",
  "status": {
    "correctness": "missing",
    "can_be_further_divided": ""
  },
  "general_hint": "",
  "detailed_hint": ""
}

You **must** add blank steps or substeps if any part of the Code or Problem logic is **missing** in the existing structure.

---

Common Mistakes to Avoid:

- Do not delete or clear content of incorrect steps — mark them and add guidance.
- Do not mark existing steps as "missing".
- Always provide both general_hint and detailed_hint when a step is "incorrect", "missing", or divisible.

---

Return Format:

Return **only** the following JSON — no extra explanation or text.

{
  "code": "original code with added comments that describe the steps",
  "steps": {
    "1": {
      "id": "step-${Date.now()}-${Math.floor(Math.random() * 10000)}",
      "content": "Same as input",
      "correctStep": "Only if incorrect or missing",
      "code": "Relevant code for this step",
      "prompt": "Same as input",
      "status": {
        "correctness": "correct / incorrect / missing",
        "can_be_further_divided": "can / cannot"
      },
      "general_hint": "Required if not correct",
      "detailed_hint": "Required if not correct",
      "subSteps": {
        "1": {
          "id": "step-${Date.now()}-${Math.floor(Math.random() * 10000)}",
          "content": "Same as input",
          "correctStep": "Only if incorrect or missing",
          "code": "Relevant code for this substep",
          "prompt": "Same as input",
          "status": {
            "correctness": "correct / incorrect / missing",
            "can_be_further_divided": "can / cannot"
          },
          "general_hint": "Required if not correct",
          "detailed_hint": "Required if not correct"
        }
      }
    },
    "2": {
      // Same structure
    }
  }
}

---

Final Instruction:  
**Only return the final JSON file. Do not include any explanation or additional text before or after!**
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
