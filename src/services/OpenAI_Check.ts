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
						content: `'You are a code review assistant. You will receive a JSON object which you are required to analyze and provide feedback on, through the Problem description. 
	You are expected to return a raw JSON. Do not include any text, markdown, explanations, commas before/after the JSON, or anything else. Only output the raw JSON.

	---

	JSON Input:
	Tree: ${Tree}

	Problem Description:
	${Problem}

	---

	I want you to evaluate the Problem description, such that you can check the JSON input and see if the steps are correct. I any steps are missing or steps are incomplete for correctness and soundness you can add missing steps. Rest is described below:

	## ✅ Status Evaluation

	For each step and substep, fill in:

	- correctness: '"correct"' / '"incorrect"' / '"missing"'
	- can_be_further_divided: '"can"' / '"cannot"'

	### ✅ Evaluation Rules Based on Problem Description

	- If the step is correct and complete, mark as:
	correctness: '"correct"'
	can_be_further_divided: '"cannot"'

	- If the step is correct but can be broken down, mark as:
	correctness: '"correct"'
	can_be_further_divided: '"can"'

	- If the step is incorrect, mark as:
	correctness: '"incorrect"'
	can_be_further_divided: '"can"' or '"cannot"'

	- If a required step is missing, add a blank step yourself with:
	correctness: '"missing"'
	can_be_further_divided: '""'
	content: '""'

	---

	## ✅ Mandatory Hints and Correct Step for Non-Final Steps

	For every step marked as:
	- correctness: '"incorrect"'
	- correctness: '"missing"'
	- can_be_further_divided: '"can"'

	You must and have to provide all of the following:
	- A general_hint explaining why the step is incorrect, incomplete, or missing.
	- A detailed_hint explaining how to fix it or what is expected.
	- A correctStep showing the correct action or solution.

	---

	## ✅ SubStep Rules

	- A substep is any action that:
	- Depends on the parent step to make sense  
	- Breaks down the parent into smaller actions  
	- Is logically part of completing the parent step

	- Do not flatten all steps if they belong together.
	- Add substeps when the Problem describes finer details.
	- Do not add random substeps—apply this rule only when justified by dependency or breakdown.

	---

	## ✅ Placement of Missing Steps

	- You **must insert** missing steps in the **correct logical position**, never at the end by default.
	- Always check the **logical sequence** of the problem.

	### ✅ **Where to Place Missing Steps**
	- **Before** dependent steps, if they are prerequisites (e.g., initialization).
	- **After** other steps only if they are **independent**.
	- **Nested as substeps** if they are **part of a broader step**.
	- Example:
		- For loop:
		- Something happens **in the loop** → The step is a **substep of the loop**.

	### ✅ **When Adding a Missing Step, You Must:**
	1. **Place it correctly** in the sequence (before dependents, as substep if needed).
	2. **Leave the content field empty ("")**.
	3. **Provide all of the following**:
	- general_hint (required)
	- detailed_hint (required)
	- correctStep (required only when step **not** correct or dividable, describing what this missing step should achieve)


	---
### IMPORTANT 
	- When marking can_be_further_divided: "can", or correctness: "incorrect / missing" you **must provide**:
	- general_hint (required)
	- detailed_hint (required, describing how to divide it)
	- correctStep (required, except when can_be_further_divided: "can")

	- If correct **and only and** **not** dividable too: remove all hints and the correctStep if present in the input.


	---

	## ✅ Do Not Use Hints or Correct Step to Evaluate Correctness

	- Only use the content field to check if a step is correct.
	- Do not check general_hint, detailed_hint, or correctStep to evaluate correctness.
	- Do not modify the content of any existing step or substep.

	---

## ✅ Step Uniqueness & Cleanup (Strict)

Every step and substep you output must be **fully unique in logic and purpose**.

A step (or substep) is considered a **duplicate** if **any** of the following are true:

- It has the same "content" as another step
- It has the same "correctStep" as another step
- It has the same "general_hint" and "detailed_hint" pair as another step
- It serves the same function, even if worded slightly differently
- It has the same combination of "correctStep",n "general_hint", and "detailed_hint" as another step, **regardless of content**

### 🧹 What You Must Do:

- You must **delete** any steps or substeps that are duplicates under the above rules.
- Do **not** generate new steps that repeat the same reasoning, explanation, or correction as another.
- Do **not** reuse the same hint/correction wording across multiple steps — all must be specific and adapted to their context.
- If a duplicate is present in the input, **you must delete it.**
- If you are adding a new step, verify that its purpose and explanation are not already present elsewhere.

> ⚠ Even if two steps differ slightly in text, if they contain the **same explanation, same correctStep, and same hint**, only one is allowed.

You are not required to replace removed duplicates unless a concept becomes **semantically missing**.

---

## ✅ Finality and Completeness of Output (Strict)

Your output must be a **complete, final result**:

- All required fields (correctness, can_be_further_divided, etc.) must be filled in according to the above rules.
- All required **hints and correctSteps must be present** for every incorrect, missing, or dividable step.
- There must be **no TODOs, placeholders, or partial step trees**.
- Do **not** omit valid steps unless they are redundant.
- Your output will be **used directly by a system**—you have **one chance** to produce a correct, validated result.
- Never rely on a second pass, fallback logic, or external checking.

---

You are to generate a JSON object following a specific format.

## ✅ Output Rules:
- Output only raw JSON.
- Do **not** wrap the output in triple backticks or markdown.
- Do **not** escape any quotes.
- Do **not** include any explanation or commentary before or after the JSON.
- Do **not** use commas between JSON objects.
- Use a single forward slash "/" to indicate a new line between top-level JSON objects, if needed.
- This is not a JSONL file; each block is a full JSON object.

## ✅ JSON Format Template:
{
  "steps": {
    "1": {
      "content": {stays the same},
      "correctStep": "Only if not correct",
      "code": {stays the same},
      "status": {
        "correctness": "correct / incorrect / missing",
        "can_be_further_divided": "can / cannot"
      },
      "general_hint": "Only if not correct",
      "detailed_hint": "Only if not correct",
      "subSteps": {
        "1": {
          "content": {stays the same},
          "correctStep": "Only if not correct",
          "code": {stays the same},
          "status": {
            "correctness": "correct" / "incorrect" / "missing",
            "can_be_further_divided": "can" / "cannot"
          },
          "general_hint": "Only if not correct",
          "detailed_hint": "Only if not correct"
        }
      }
    },
    "2": {
      "//": "Same structure as above"
    }
  }
}

Respond with your filled-in JSON **following these rules exactly**.
	


	---

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
