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
						content: `Goal: 

Using the input **Code** and **Tree**, follow the instructions below:

1. For each step (and substep) in the Tree:
   - Compare the step’s **content** with the logic found in the **Code** to determine whether it is implemented.
   - Do **not** use the general_hint or detailed_hint to decide if something is implemented — only use the **content** field.
   - If the described content is implemented in the Code, insert the corresponding code snippet into the "code" field, **even if the step is marked as incorrect**.
   - In the top-level "code" field, insert **# Step N** (e.g., '# Step 1','# Step 1.1') **above the matching code line**, **only if the step exists in the Tree**.
   - If the logic is present but **incorrect**, still insert the code line and add **# Step N - NOT IMPLEMENTED CORRECTLY** above it in the top-level code.

   - If the content is **not implemented at all** but is present in the tree, do:
     - Leave a comment saying #Step N - NOT IMPLEMENTED

   - If a logical step is **not present at all** in the tree or a **compiling error** accurs in the code, do **both** of the following:
     - **Add the missing step into the Tree**, preserving its structure with empty "code".
     - Insert **# MISSING STEP** in the **code** at the correct position.

Clarification on “incorrect”:
This means the logic described in the step does not match what the line does. Do not infer correctness based on expected behavior. Only judge based on content mismatch.

2. DO NOT modify any part of the Tree that doesn't include missing steps!
   - All steps and subSteps (even if they seem empty or partially filled) must be preserved.
   - All keys and values (like "id", "content", "status", etc.) must remain exactly as in the input Tree.
   - **Do not** delete steps or subSteps, even if "code" or "content" is missing or empty.
   - **Do not** reformat or clean the JSON structure in any way.
   - Maintain the exact order and structure of steps and substeps from the input Tree.

3. If there are missing steps, add them into the tree and label them in the "code" field as ** MISSING STEP**.
   - For missing steps, leave the "code", "content" field **empty**
   - And fill general hint, detailed hint, and correctStep fields.

4. Clarification of "missing step":
   - Content: ""
   - General_hint: filled
   - Detailed_hint: filled
   - CorrectStep: filled
   - Status:
		- correctness: "missing"
		- can_be_further_divided: ""

### IMPORTANT
Do not any other changes! In the tree you are only allowed to insert missing steps, and in the code yu are only allowed to insert comment lines!

---


**Code:**  
"${Code}"

**Tree:**  
"${Tree}"  
*(Note: In this prompt, the Tree is an array of steps)*

---

Return Format:

Return a JSON object with exactly one key:
- "steps" → an object where each step (and subStep) is indexed with a numerical key (as shown in the example below).

🚨 Important: You must also return a **code** field that includes the full original code with inline **# Step N** comments as described.  
The **def main()** function should appear **at the end of the code**, unmodified and not commented away. Do not label it with a step.

Additional Enforcement Rules:

1. Do **not** consider general_hint or detailed_hint when judging correctness.
   - Only compare the step's "content" with the code implementation.

2. For **missing steps**:
   - In the **steps object**, leave the "code" field **empty**.
   - In the **top-level "code" field**, insert **# Step N - MISSING STEP** **at the correct position**.
     Example:
     '''
     def my_function():
         # Step 1 - MISSING STEP
         for i in range(10):
             print(i)
     '''

3. Do **not** add comments to unrelated lines.

4. Do **not** comment or label 'def main()'. Leave it **untouched and unannotated**, placed at the **end**.

---

Example JSON Output:

{
  "code": "// Original code with added comments that describe the steps",
  "steps": {
    "1": {
      "id": "Same as input",
      "content": "Same as input",
      "correctStep": "Same as input",
      "code": "Extracted code line or empty string",
      "prompt": "Same as input",
      "status": {
        "correctness": "Same as input",
        "can_be_further_divided": "Same as input"
      },
      "general_hint": "Same as input",
      "detailed_hint": "Same as input",
      "subSteps": {
        "1": {
          "id": "Same as input",
          "content": "Same as input",
          "correctStep": "Same as input",
          "code": "Extracted code line or empty string",
          "prompt": "Same as input",
          "status": {
            "correctness": "Same as input",
            "can_be_further_divided": "Same as input"
          },
          "general_hint": "Same as input",
          "detailed_hint": "Same as input",
          "subSteps": {
            "1": {
              // Same structure
            }
          }
        }
      }
    },
    "2": {
      // Same structure as above
    }
  }
}

---

Final Instruction:  
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
