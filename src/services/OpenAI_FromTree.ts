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

0. Process Only Steps with Non-Empty "content"  
   - You **must skip** any step or substep **if its "content" field is empty**, even if:
     - It includes hints,
     - It includes correctStep,
     - It includes any status.
   - You **must not process or label steps that have empty "content"**.

1. For each step (and substep) containing content in the Tree:
   - Compare the step’s **content** with the logic found in the **Code** to determine whether it is implemented.
   - Do **not** use general_hint, detailed_hint, or correctStep to decide if something is implemented — only use the **content** field.
   - If the described content is implemented in the Code, insert the corresponding code snippet into the "code" field, **even if the step is marked as incorrect**.
   - In the top-level "code" field, insert **# Step N** (e.g., '# Step 1','# Step 1.1') **above the matching code line**, **only if the step exists in the Tree**.
   - If the logic is present but **incorrect**, still insert the code line and add **# Step N - NOT IMPLEMENTED CORRECTLY** above it in the top-level code.

### ✅ **Added Rule to Clarify Parent/Substep Handling**

  > - **If the parent’s high-level action is implemented, mark the parent as "correct"**, even if one or more of its **substeps are missing or incorrect**.
  > - **Substeps must be evaluated independently**, even if their parent is marked as correct.
  > - **Do not mark the parent as missing just because one or more substeps are missing.**
  > - **Do not consider substeps when deciding the parent’s correctness**, only check the parent’s own **content**.


Clarification on “incorrect”:
This means the logic described in the step does not match what the line does. Do not infer correctness based on expected behavior. Only judge based on content mismatch.

2. DO NOT modify any part of the Tree that doesn't include newly added missing steps!
   - All steps and subSteps (even if they seem empty or partially filled) must be preserved.
   - All keys and values (like "id", "content", "status", etc.) must remain exactly as in the input Tree.
   - **Do not** delete steps or subSteps, even if "code" or "content" is empty.
   - **Do not** reformat or clean the JSON structure in any way.
   - Maintain the exact order and structure of steps and substeps from the input Tree.
  
✅ Check Actual Content Matching Before Labeling as Missing
  - You must not label any step as missing unless:
  - The step has non-empty "content", and
  - You cannot find any corresponding code that implements the described "content".
  - You must check all substeps recursively (e.g., step 3.1) before labeling their parent (e.g., step 3) as missing.
  - You must not mark a parent step as "MISSING STEP" if its substeps already map to implemented code.

  You must process all substeps recursively.

**After processing a parent step, you must continue and process all of its substeps, applying the exact same evaluation rules as for parent steps.**
  Do not stop after processing the parent.
  Each substep must be checked independently for:
  content matching,
  correctness,
  missing status,
  labeling in the top-level code field.

3. If you must insert missing steps, add them into the tree and label them in the "code" field as ** MISSING STEP**.
   - For missing steps, leave the "code", "content" field **empty**
   - And fill general hint, detailed hint, and correctStep fields.

4. Clarification of newly inserted "missing step":
   - Content: ""
   - Code: ""
   - General_hint: filled
   - Detailed_hint: filled
   - CorrectStep: filled
   - Status:
		- correctness: "missing"
		- can_be_further_divided: ""

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

🚨 Important: You must also return a **code** field that includes the full original (full function definition) code with inline **# Step N** comments as described.  
The **def main()** function should appear **at the end of the code**, unmodified and not commented away. Do not label it with a step.

Additional Enforcement Rules:

1. Do **not** consider general_hint, detailed_hint, or correctStep when judging correctness.
   - Only compare the step's "content" with the code implementation.
   - Only compare the step's that have content!

2. For **newly added missing steps**:
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

⚠️ Important Clarification About Handling "missing" Steps in the Tree:

  Only newly added steps by you (not already present in the input Tree)
  must have:
  "content": ""
  "code": ""
  status.correctness: "missing"
  status.can_be_further_divided: ""
  general_hint, detailed_hint, and correctStep (all required)
  If a step already exists in the Tree with "correctness": "missing", but you find matching code in the provided Code:
  Do NOT empty its "code" field.
  You MUST insert the matched code snippet in the "code" field, exactly like any other step.
  You MUST still add the corresponding comment in the top-level "code" field.

⚠️ Skip Processing Steps Without Content

  Only process steps that have a non-empty "content" field.
  Ignore steps that have empty "content", even if they include hints, correctStep, or status.
  Do not insert comments or code for steps that have no "content".

⚠️ **Every** content field must remain as it is in the tree! If The content is empty but the correctStep is not -> DO NOT fill the content!
---

Example JSON Output:

{
  "code": "// Original code with added comments that describe the steps",
  "steps": {
    "1": {
      "id": "unique id",
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
          "id": "unique id",
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

⚠️ How to Validate Code Against Steps/Substeps

  Only check whether the described action is present, not whether the result is fully correct or optimal.
  You must match the described logic, even if details like variable names differ.
  Example:
    Step 4 content: "Return the return variable"
    Code: "return tot"

✅ Match found → Comment it as # Step 4 because the return action exists, even if "tot" may or may not be the correct variable.

⚠️ Substep Comment Placement

  Place substep comments directly above the specific line where the substep is implemented in the code.
  Make sure the comment appears exactly on the correct line representing the substep’s action.

---

Final Instruction:
NEVER ADD CODE, ONLY ADD COMMENTS
Only give as output the json file no words before or after! **Do not include any text, markdown, explanations, commas before/after the JSON, or anything else. Only output the raw JSON.**
DO NOT: output '''JSON {New Tree} '''
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
