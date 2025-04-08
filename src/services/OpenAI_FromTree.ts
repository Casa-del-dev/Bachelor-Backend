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
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						content: `Goal: 

Using the input **Code** and **Tree**, follow the instructions below:

1. For each step (and substep) in the Tree:
   - If and only if the described **content** is implemented in the **Code**, extract and insert the corresponding code snippet into the "code" field, **even if the step is marked as incorrect**.
   - If the described logic is present but implemented incorrectly, still extract the matching code snippet and insert it into the "code" field.
   - If the content is not implemented at all, leave the "code" field as "".
   - When filling the top-level **code** field, write **# NOT IMPLEMENTED CORRECTLY** above any line that corresponds to an incorrectly implemented step.

2. DO NOT modify any other part of the Tree!
   - All steps and subSteps (even if they seem empty or partially filled) must be preserved.
   - All keys and values (like "id", "content", "status", etc.) must remain exactly as in the input Tree.
   - Do not delete steps or subSteps, even if "code" or "content" is missing or empty.
   - Do not reformat or clean the JSON structure in any way.
   - Maintain the exact order and structure of steps and substeps from the input Tree.

---

**Additional Clarification**:

- You must apply the exact same logic to all steps **and substeps**, no matter how deeply nested.
- **Every step and substep must have a valid code field.**
- If the logic is implemented but incorrect, still include the relevant code under "code" and label it **# NOT IMPLEMENTED CORRECTLY** in the top-level "code" field.
- If the logic is not implemented at all, then the "code" value must be "".
- This rule applies **recursively**: steps → subSteps → SubSubSteps → etc.
- When generating the final **code** field with inline comments:
  - You must **break down compound statements** like for, while, if, and else blocks across multiple lines.
  - For example, a for loop body should **not** be written on the same line as the for header — break it into:

    for i in range(n):
        # Step description
        do_something()

  - This is required to properly align comments and substep structure to individual lines of logic.

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

🚨 Important: You must also return a **code** field that includes the original code with added inline **# comments** (using Python syntax) placed **above** the relevant lines. These comments should clearly describe the purpose of each step and substep, and they must align with the Tree structure.  
If a line corresponds to a step or substep that is **not implemented correctly**, write **# NOT IMPLEMENTED CORRECTLY** above it instead of a descriptive comment.  
The **def main()** function should appear **at the end of the code**, unmodified and not commented away. Do not label it with a step.

---

Example JSON Output:

{
  "code": "# Step 1\n# Initialize result variable\nresult = 0\n...\ndef main():\n    print(roman_to_int('X'))",
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
