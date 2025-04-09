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

**Additional Instructions:**

- The code is in **Python**. Use **#** for all inline comments.
- The **def main()** function is a standard wrapper. You must **include it in the code output**, but **do not include it in the step tree**.
- You **must treat every comment like # Step X, # Step X.Y, or # Step X.Y.Z as defining a step or substep**. These comments are authoritative and must be reflected in the structure of the step tree.
- If a comment’s step number does **not match** the correct logical structure, **fix both the comment and the step tree to match**. Do **not ignore** or misplace any line with a # Step comment.

---

Code:  
${Code}

Problem:  
${Problem}

---

Update Only the Following Properties (when needed):

- status.correctness
- status.can_be_further_divided
- correctStep (**Mandatory if a step is incorrect or missing**)
- general_hint (**Required if a step is incorrect, missing, or can be further divided**)
- detailed_hint (**Required if a step is incorrect, missing, or can be further divided**)
- Add new **blank steps or substeps only if the Problem introduces logic that is missing from the Code**

---

Status Rules:

- If a step is present but incorrect, mark it as **incorrect** — do **not** delete or blank it.
- Mark a step as **missing** only if it is completely absent from the structure.
- If status.can_be_further_divided = **can**, provide general_hint and detailed_hint to guide the breakdown.

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
  "code": "",
  "status": {
    "correctness": "missing",
    "can_be_further_divided": ""
  },
  "general_hint": "",
  "detailed_hint": ""
}

You **must** add blank steps or blank substeps if any part of the Code or Problem logic is **missing** in the existing structure.
If the steps and context allow it you put the new blank steps as a substep of already existing steps.

---

Important:

	- You must also return a "code" field that includes the original code exactly as provided, with no modifications, corrections, or additions to the code itself.
	- You are strictly forbidden from adding new lines of code — not even to "fix" or "initialize" variables or improve logic.
	- The only thing you are allowed and required to add are # Step comments above the relevant lines.
	- You must preserve syntax errors, broken lines, and unused variables exactly as in the original code.
	- If the code contains logic that is unreachable, broken, or not referenced, do not analyze or include it in the step tree.
	- The def main() function must be preserved at the end of the code but must not be labeled, annotated, or described in the step tree.
	- If any logic required by the Problem is not implemented in the Code, you must add a blank step or substep in the correct semantic location, based on its logical position in the process.

---

Common Mistakes to Avoid:

- Do not delete or clear content of incorrect steps — mark them and add guidance.
- Do not mark existing steps as **missing**.
- Always provide both **general_hint** and **detailed_hint** when a step is **incorrect**, **missing**, or **divisible**.
- Always provide **correctStep** when a step or substep is marked **incorrect** or **missing**.

---

Return Format:

Return **only** the following JSON — no extra explanation or text.

{
  "code": "// Original code with added comments that describe the steps",
  "steps": {
    "1": {
      "content": "Same as input",
      "correctStep": "**Mandatory if incorrect or missing**",
      "code": "// Code segment for this step with a comment",
      "status": {
        "correctness": "correct / incorrect / missing",
        "can_be_further_divided": "can / cannot"
      },
      "general_hint": "Required if not correct",
      "detailed_hint": "Required if not correct",
      "subSteps": {
        "1": {
          "content": "Same as input",
          "correctStep": "**Mandatory if incorrect or missing**",
          "code": "// Code segment for this substep with a comment",
          "status": {
            "correctness": "correct / incorrect / missing",
            "can_be_further_divided": "can / cannot"
          },
          "general_hint": "Required if not correct",
          "detailed_hint": "Required if not correct",
          "subSteps": {
            "1": {
              // Same structure
            }
          }
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
