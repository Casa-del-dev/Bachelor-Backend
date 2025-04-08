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
   - Compare the step’s **content** with the logic found in the **Code** to determine whether it is implemented.
   - Do **not** use the general_hint or detailed_hint to decide if something is implemented — only use the **content** field.
   - If the described content is implemented in the Code, insert the corresponding code snippet into the "code" field, **even if the step is marked as incorrect**.
   - If the logic is implemented but incorrect, still extract the matching code and put **# NOT IMPLEMENTED CORRECTLY** above the linecode.
   - If the content is not implemented at all, leave the "code" field as an empty string.

With incorrect I mean that the content of the step describes one thing but the programmed line does something else. **NOT** that the content is implemented wrongly and therefore the line is incorrect.

2. DO NOT modify any other part of the Tree!
   - All steps and subSteps (even if they seem empty or partially filled) must be preserved.
   - All keys and values (like "id", "content", "status", etc.) must remain exactly as in the input Tree.
   - Do not delete steps or subSteps, even if "code" or "content" is missing or empty.
   - Do not reformat or clean the JSON structure in any way.
   - Maintain the exact order and structure of steps and substeps from the input Tree.

---

**Additional Clarification**:

- You must apply this logic to all steps and substeps, no matter how deeply nested.
- **Every step and substep must contain a "code" field.**
- Do not remove or rewrite Python function definitions. If the logic is inside a function like def foo(x: str) -> str:, the function must remain and contain the commented lines inside.
- When generating the top-level code field:
  - Insert all comments **above** the corresponding code lines.
  - Always preserve the original function structure (do not extract just parts of the body outside the function).
  - For any incorrectly implemented logic, comment it with **# NOT IMPLEMENTED CORRECTLY** above the line.

- When working with for, while, if, else, etc.:
  - **Do not inline the logic on the same line** as the control structure.
  - Break them into multiple lines for clarity so comments can appear directly above individual logical lines.

Function Preservation Rule:

	- If a described step or substep exists inside a function, you must include the entire function in the top-level "code" field — including its def line.
	- Do not extract just the inner lines or remove the function declaration.
	- This applies to all function definitions (not just main()), e.g. def roman_to_int(...).
	- Steps and substeps must still be annotated inside the function using # comments above the relevant lines.

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

🚨 Important: You must also return a **code** field that includes the full original code with inline **# comments** (using Python syntax) placed **above** the relevant lines. These comments must describe the purpose of each step or substep.  
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
