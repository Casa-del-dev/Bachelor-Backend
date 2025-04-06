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
				model: 'gpt-4',
				messages: [
					{
						role: 'user',
						content: `Goal:

Use the input Tree as a base and revise only the fields specified below. However, if the Problem describes steps or substeps that are **missing or unrepresented** in the Tree, you **must add new blank steps or substeps** to capture that logic.

The goal is to produce a new JSON file that is **semantically equivalent to a complete solution** for the Problem — meaning:
- All required steps and substeps described or implied in the Problem are present,
- The original structure is preserved **unless** the Problem clearly requires additions.

**Tree:**  
"${Tree}"

**Problem:**  
"${Problem}"

You should update only the following properties, based on the Problem:

- status.correctness
- status.can_be_further_divided
- correctStep (**Provide the correct step only if the existing step is incorrect or missing**)
- general_hint (**Required if step is incorrect, missing, or can be further divided**)
- detailed_hint (**Required if step is incorrect, missing, or can be further divided**)
- Add missing steps or substeps if the Problem context requires any that are not already present in the Tree

Important:
- If a step exists but has incorrect content, mark it as "incorrect" — do NOT mark it as "missing" or delete its content.
- Only mark a step as "missing" if it is **entirely absent** from the Tree.
- When status.can_be_further_divided = "can", you must provide hints explaining how the step could be broken down further.


Return Format:

- steps → Keep all original steps, unless the Problem clearly requires an additional step (as a blank step).
- Each step contains:
  - "content" → Keep as input.
  - "correctStep" → Only include if correctness is not "correct".
  - "prompt" → Keep as input.
  - "status":
    - "correctness" → "correct" / "incorrect" / "missing"
    - "can_be_further_divided" → "can" / "cannot"
  - "general_hint" → Only if correctness is not "correct".
  - "detailed_hint" → Only if correctness is not "correct".
  - "subSteps" → Keep as input, unless the Problem describes or implies new blank substeps that should be added.

What qualifies as a substep?

- A task required to complete a larger step.
- A process dependent on the parent step.
- A breakdown of a broad action into finer details.

What is a blank step or substep?

A step or substep that contains all empty string values ("") except:

"status": {
  "correctness": "missing",
  "can_be_further_divided": ""
}

You **must** add blank steps/substeps if a part of the Problem logic is not accounted for in the Tree.

Common mistakes to avoid:
- Do not overwrite or blank out existing steps marked as "incorrect".
- Never mark a step as "missing" unless it is truly not present in the input Tree.
- Always provide general and detailed hints when correctness is not "correct", or when a step can be further divided.

Example JSON Output:

{
  "code": "",
  "steps": {
    "1": {
      "id": "step-${Date.now()}-${Math.floor(Math.random() * 10000)}",
      "content": "Same as input",
      "correctStep": "The correct step, only if not correct",
      "code": "",
      "prompt": "Same as input",
      "status": {
        "correctness": "correct / incorrect / missing",
        "can_be_further_divided": "can / cannot"
      },
      "general_hint": "Only if not correct",
      "detailed_hint": "Only if not correct",
      "subSteps": {
        "1": {
          "id": "step-${Date.now()}-${Math.floor(Math.random() * 10000)}",
          "content": "Same as input",
          "correctStep": "Only if not correct",
          "code": "",
          "prompt": "Same as input",
          "status": {
            "correctness": "correct / incorrect / missing",
            "can_be_further_divided": "can / cannot"
          },
          "general_hint": "Only if not correct",
          "detailed_hint": "Only if not correct"
        }
      }
    },
    "2": {
      // Same structure as above
    }
  }
}

### **Warning:**
Only give as output the json file no words before or after!
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
