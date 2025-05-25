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
				model: 'gpt-4o',
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
- If a comment’s step number does **not match** the correct logical structure, **fix the comment**. Do **not ignore** or misplace any line with a # Step comment. 
		Eg.'''		# Step 1					# Step 1
					x = 1						x = 1

												# MISSING STEP
					x = x * x + x 		-> 		x = x * x + x

					# Step 2					# Step 3
					return x					return x	'''

- if a step is **missing** write **# MISSING STEP** in the code field and add a blank step in the tree.
- If a step is **incorrect**, always write **# NOT IMPLEMENTED CORRECTLY** in the code field.
---

Code:  
${Code}

Problem Descrition:  
${Problem}

---

Update Only the Following Properties (when needed):

- status.correctness
- status.can_be_further_divided
- correctStep (**Mandatory if a step is incorrect, missing, or can be further divided**)
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
- Put a Substep under a Step: Step has a substeps section, in there you can put substeps 1,2,3, etc.

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

	🚨 Code Editing Restrictions — Read Carefully:

	- You must return a "code" field that is **byte-for-byte identical** to the input Code, except for the addition of **# Step comments above existing lines**.
	- ⚠️ **Do not add, modify, rearrange, or fix** any line of code. No logic, declarations, or corrections are allowed — only comments.
	- The output "code" must:
	- Retain all original whitespace, line breaks, indentation, and structure.
	- Preserve any syntax errors or undefined behavior exactly as they appear.
	- **Not include any new code lines**, even if a step is marked as "missing".
	- If the Problem requires a step that is not implemented in the Code, you must:
	- Add a **blank step or substep** in the tree.
	- **Do not add a corresponding comment or line in the code field.**

	- def main() must remain at the end of the code exactly as provided, with no # Step labels and no structural changes.

	An example on how the Code should look like:
	/*

	def roman_to_int(s: str) -> int:
		# Step 1: Define a dictionary to map Roman numerals to their corresponding integer values.
		roman_values = {
			'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000
		}
		
		# MISSSING STEP

		# Step 3: Iterate over the characters in the reversed string 's'.
		for char in reversed(s):
			# Step 3.1: Add the integer value of the current Roman numeral to 'total'.
			# NOT IMPLEMENTED CORRECTLY
			total += roman_values[char]

		# Step 4: Return the total.
		return total

	def main():
		print(roman_to_int('MCMXCIV'))
	
	*/

	**Notice** The section that is not implemented correctly has a comment # NOT IMPLEMENTED CORRECTLY and if missing there is a # MISSING STEP

---

📐 Step Insertion Rule (Strict Ordering):

	🔁 You must insert any missing step or substep in the exact correct position within the Tree.
	- Do not append missing steps to the end of the "steps" object.
	- If a blank step or substep belongs logically before another, place it before.
	- If a substep is missing under step "3", add it as "steps": { "3": { "subSteps": { "1": { ... } } } } — never as step "3.1" or as a new top-level step.
	- The entire "steps" object must maintain a semantically and logically correct execution order.

---


Common Mistakes to Avoid:

- Do not delete or clear content of incorrect steps — mark them and add guidance.
- Do not mark existing steps as **missing**.
- Always provide both **general_hint** and **detailed_hint** when a step is **incorrect**, **missing**, or **can_be_further_divided**.
- Always provide **correctStep** when a step or substep is marked **incorrect** or **missing**.
- Add **missing** step in the correct order place in the step tree
- Do not add missing steps to the end — always insert them in logical order.

---

Return Format:

Only give as output the raw JSON file and put "/" to go onto a new line.  
Do not include any text, markdown, explanations, commas before/after the JSON, or anything else.'

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
