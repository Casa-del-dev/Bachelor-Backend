import { stringify } from 'openai/internal/qs/stringify.mjs';
import { stepTree } from '.';
import { Service } from '..';

interface Payload {
	Tree: object;
	Code: string;
}

interface RequestBody {
	requestBody?: Payload;
	Tree: object;
	Code: string;
}

const service: Service = {
	path: '/openai/v4/',

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
			let { Tree, Code } = mergedPayload;

			if (!Code || !Tree) {
				if (Code === null) {
					Code = '';
				} else {
					return new Response('Missing Prompt, Problem, Tree, Context, or Code in request body', {
						status: 400,
						headers: { 'Access-Control-Allow-Origin': '*' },
					});
				}
			}

			const payload = {
				model: 'gpt-4o',
				messages: [
					{
						role: 'user',
						content: `
            You are a **step verification assistant**.  
You will receive two inputs:
1. **Code**: Python code to review.
2. **Tree**: A hierarchical description of steps and substeps.

Your task is to check if the steps described in the Tree are **correctly implemented** in the Code.  
You must return the **updated Tree** and a **commented copy of the Code**.

---

## 📝 Processing Rules

### ✅ 0. Skip Empty Content
- **Skip steps with empty "content"**, even if they have hints, correctStep, or status.
- **Do not add comments or code for steps with empty "content"**.

---

### ✅ 1. Step Matching Rules
For **each step or substep with non-empty "content"**:
- Search the Code to check if the described content is implemented.
- **Do not use hints or correctStep to decide if a step is implemented**. Only use the "content".

#### Matching Results:

- **If implemented correctly**:
  - Insert the matching code in the "code" field of the step.
  - Add **# Step N** comment above the matching line in the top-level "code".

- **If implemented but incorrect**:
  - Insert the matching code in the "code" field of the step.
  - Add **# Step N - NOT IMPLEMENTED CORRECTLY** comment above the matching line in the top-level "code".

- **If not implemented**:
  - Leave the "code" field empty in the step.
  - Add **# Step N - NOT IMPLEMENTED** comment at the correct position in the top-level "code".

---

### ✅ 2. Parent and Substep Handling

- If the **parent step itself** is implemented, mark it as **correct**, even if substeps are missing or incorrect.
- **Evaluate substeps independently**, following the same rules as parent steps.
- **Never mark a parent as missing** if its **substeps are implemented**.

---

### ✅ 3. Adding New Missing Steps

- If a required step is **completely missing from the Tree**:
  - **Add it as a new step** with:
    - '"content": ""'
    - '"code": ""'
    - '"status": {"correctness": "missing", "can_be_further_divided": ""}'
    - **Fill:** general_hint, detailed_hint, and correctStep

- In the **top-level "code"**, add:
  - **# Step N - MISSING STEP**

---

### ✅ 4. Top-Level Code Handling

- Always return the **full original code**.
- Add **# Step N** comments above matching lines.
- Never remove the function definition ('def ...').
- Leave **def main()** untouched and at the end.
- **Never add actual code**, only comments.

---

## ✅ Example Top-Level Code Commenting

'''python
def example():
    # Step 1
    setup()

    # Step 2 - MISSING STEP

    # Step 3 - NOT IMPLEMENTED
    process()

    return result

  JSON Output Structure
  {
  "code": "// Original code with added comments",
  "steps": {
    "1": {
      "content": "Same as input",
      "correctStep": "Same as input",
      "code": "Extracted code or empty string",
      "status": {
        "correctness": "correct / incorrect / missing",
        "can_be_further_divided": "can / cannot"
      },
      "general_hint": "Only if required",
      "detailed_hint": "Only if required",
      "subSteps": {
        "1": {
          "content": "Same as input",
          ...
        }
      }
    }
  }
}

🚨 Final Instructions
  Never change existing "content" or step IDs.
  Process all non-empty content recursively.
  Add missing steps only when truly absent.
  Only return raw JSON. No extra text or formatting.

Inputs:
  Code: ${Code}
  Tree: ${Tree}

You are expected to return a raw JSON. Do not include any text, markdown, explanations, commas before/after the JSON, or anything else. Only output the raw JSON.
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
