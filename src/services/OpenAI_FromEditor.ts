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
- The **def main()** function is a standard wrapper. If and only if present in the original code, you must **keep it in the code output**, but **do not include it in the step tree**.
- You **must treat every comment like # Step X, # Step X.Y, or # Step X.Y.Z as defining a step or substep**. These comments are authoritative and must be reflected in the structure of the step tree.
- If the step number is incorrect, missing, or violates a proper sequence, you **must** fix the comment to reflect the correct step number based on the logical structure of the code and respectively adapt the step tree accordingly.

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
- correctStep (⚠️ **You must provide this if the step is incorrect, missing, or dividable — no exceptions**)  
- general_hint (Required if the step is incorrect, missing, or dividable)  
- detailed_hint (Required if the step is incorrect, missing, or dividable)  
- You may add new **blank steps or substeps** only if the Problem introduces logic that is missing from the Code.

---

⚠️ Mandatory Hint & Correction Logic Rules:

You MUST follow these rules for **correctStep**, **general_hint**, and **detailed_hint**:

| Case                                    	| Must Include correctStep 	| Must Include Hints |
|------------------------------------------	|--------------------------	|--------------------|
| Step is "missing"                    		| ✅ YES                   | ✅ YES             |
| Step is "incorrect"                  		| ✅ YES                   | ✅ YES             |
| Step is "correct" and "can"        		| ❌ NO                    | ✅ YES             |
| Step is "correct" and "cannot"     		| ❌ NO                    | ❌ NO              |

- Never omit "correctStep", "general_hint", or "detailed_hint" when they are required.
- Never include "correctStep" for a step that is already correct and cannot be further divided.
- Do not duplicate "correctStep" and hint explanations across steps. They must be adapted to the specific content.

---

Step Status Definitions:

- correctness: "correct" means the step is valid as written.
- correctness: "incorrect" means the code is wrong — do not delete it; mark it and give correction guidance.
- correctness: "missing" means the step must be added in the correct position.
- can_be_further_divided: "can" means this step should be split into substeps with guidance.
- All missing steps must have "content": "" and "code": "" and be marked as "missing".

---

Step Insertion Rule (Strict Ordering):

- Never append missing steps to the end.
- Insert new blank steps or substeps in the exact logical location they belong.
- Place a new substep under the correct parent step if it's a breakdown.
- Respect and maintain the logical execution order of the code and problem.

---

Common Mistakes to Avoid:

- ❌ Do not delete or blank out incorrect steps. Mark them.
- ❌ Do not mark existing steps as "missing".
- ✅ Always provide all 3: "general_hint", "detailed_hint", "correctStep" when required.
- ✅ Add missing steps exactly where they belong, not at the end.
- ❌ Do not leave out a "correctStep" just because the step is also "can_be_further_divided": "can" — if it is also incorrect or missing, you **must** provide one.

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

📎 Code–Step Alignment Rule (Strict Mapping)

- For every step or substep in the "steps" tree, there must be a **corresponding "# Step X", "# Step X.Y", or "# Step X.Y.Z" comment** in the "code" field.
- These step comments must appear **above the code** they represent.
- The **step number in the comment must exactly match the path in the step tree**.
  - Example: "steps": { "2": { "subSteps": { "1": { ... } } } } must be preceded in the code by "# Step 2.1".
  - When the comment is generated then the step or substep in the step tree must always be generated too!
- If the code for a required step is **missing**:
  - Leave the "code" field as an empty string or write "# MISSING STEP".
- If the code is present but **incorrect**:
  - Add the comment "# NOT IMPLEMENTED CORRECTLY" before the line.

You must maintain **one-to-one alignment** between the "steps" object and the "# Step" comments in the "code" field.

⚠️ Do not generate any step in the "steps" object without a matching "# Step" comment in the code field (unless it is a blank step).

---

📎 Code–Step Alignment Rule (Strict Mapping)

- For every step and substep in the "steps" object:
  - There must be a matching "# Step X", "# Step X.Y", or "# Step X.Y.Z" comment **in the code field**.
  - This comment must be followed by the **exact line(s) of code** that the step refers to.

- Example:
  A step like "steps": { "3": { "subSteps": { "1": { ... } } } }  
  must have a code field like:
  
  "# Step 3.1  
   total += roman_values[char]"

- Do **not** provide only the "# Step" comment — the corresponding code line(s) must also be present.
- The code in the "code" field must be taken exactly from the input "Code", preserving whitespace and indentation.

Special cases:
- If the logic is incorrect, include "# NOT IMPLEMENTED CORRECTLY" before the affected code.
- If the logic is missing, leave the code field blank.

⚠️ You must maintain a **1-to-1 mapping** between steps/substeps and the step comment + code pair in the "code" field.
⚠️ The step number in the "# Step X.Y.Z" comment must match the step’s key in the JSON tree exactly.

Missing Step Requirements (Strict Enforcement)
Any step or substep that is marked as "missing" must always include the following:

"correctness": "missing"
"content": ""
"code": ""

A non-empty "correctStep" describing what the missing logic should do
A non-empty "general_hint" explaining what is missing
A non-empty "detailed_hint" explaining how to fix or implement it
You must never place missing steps at the end of the "steps" object.
Every missing step must be inserted in the correct logical and structural position in the step tree.
If the missing logic is part of an existing step, insert it as a substep under that step.
If the logic belongs at the top level, insert it between other top-level steps in the correct position.
Do not create artificial step numbers like "2.5". Use proper substeps like "subSteps": { "2": { ... } } under step "2".
Do not generate any steps with "correctness": "missing" that are missing a "correctStep", "general_hint", or "detailed_hint".

A valid missing step must follow this structure:

"content": ""
"code": ""
"status.correctness": "missing"
"status.can_be_further_divided": ""
A clearly written "correctStep"
A non-empty "general_hint"
A non-empty "detailed_hint"

Failure to follow these instructions will result in an incomplete and invalid step tree. Every missing step must be treated as an essential placeholder, correctly positioned and documented.

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

	- def main() must remain at the end (if present) of the code exactly as provided, with no # Step labels and no structural changes.

	An example on how the Code should look like:
	/*

	def roman_to_int(s: str) -> int:
		# Step 1
		roman_values = {
			'I': 1, 'V': 5, 'X': 10, 'L': 50, 'C': 100, 'D': 500, 'M': 1000
		}
		
		# MISSSING STEP

		# Step 3
		for char in reversed(s):
			# Step 3.1
			# NOT IMPLEMENTED CORRECTLY
			total += roman_values[char]

		# Step 4
		return total

	def main():
		print(roman_to_int('MCMXCIV'))
	
	*/

	**Notice** The section that is not implemented correctly has a comment # NOT IMPLEMENTED CORRECTLY and if missing there is a # MISSING STEP on that missing line.

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
- Always check that the comments align with the step tree!

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
