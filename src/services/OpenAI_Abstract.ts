import { test } from '.';
import { Service } from '..';

interface Payload {
	Tree?: string;
}

interface RequestBody {
	requestBody?: Payload;
	Tree: string;
}

const service: Service = {
	path: '/openai/v5/',

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
			const { Tree } = mergedPayload;

			if (!Tree) {
				return new Response('Missing Prompt, Problem, Tree, Context, or Code in request body', {
					status: 400,
					headers: { 'Access-Control-Allow-Origin': '*' },
				});
			}

			const treeJson = typeof Tree === 'string' ? Tree : JSON.stringify(Tree, null, 2);

			const payload = {
				model: 'gpt-4o',
				messages: [
					{
						role: 'user',
						content: `You are a step tree abstraction engine.

Your task is to analyze the given procedural step tree and identify logical patterns that can be generalized into reusable abstractions. These abstractions must be represented as groupings (local logic), recyclings (cross-tree structural or semantic repetition), or general-purpose parameterizations.

---

Your responsibilities:

PART 1: RECYCLING (Cross-Tree Logic Abstraction)  
• Identify repeated multi-step logic patterns that appear in different parts of the tree, even if the IDs or exact tokens differ.  
• These are functionally equivalent steps (e.g., "pop two numbers and an operator" → should become a reusable apply_operator() abstraction).  
• Only include a step ID in one recycling instance. Once a step is recycled, it cannot appear in another group.  
• Include at most one recycling entry grouping all matched instances.  
• Detect structurally or semantically similar logic (e.g., repeated conditionals or duplicated function bodies) and merge them into a single reusable abstraction.

PART 2: GROUPING (Local Logic Abstraction)  
• Identify sequences of steps that are logically cohesive (e.g., "if token is number → do X; else → do Y") and group them into conceptual units.  
• These groups typically reflect functions like handle_token(), tokenize(), etc.  
• Unlike recycling, each grouping entry contains only one instance of locally connected steps.  
• When steps represent clearly separable functional units (e.g., a function that collects data, followed by one that formats it), treat them as distinct groupings.  
• If steps collectively match the behavior of a standalone function, prefer abstracting them as one grouped logical unit named after the action performed.  
• Consider separating concerns like input parsing, string formatting, or print statements into distinct abstraction steps if they are mixed with logic.

PART 3: PARAMETERIZATION (Reusability Enhancements)  
• Identify hardcoded values, operators, or conditionals that could be made configurable via parameters.  
• Suggest how to abstract these parts to make logic more general-purpose.

---

DO NOT:  
• Do not repeat step IDs across multiple groups.  
• Do not group distant, unrelated steps.  
• Do not emit patterns that don't reduce or clarify logic.

---

OUTPUT REQUIREMENTS:  
Each output entry must include:  
• id: a unique ID using this format: abstraction-[timestamp]-[index]  
• steps: a 2D array of step ID sequences  
• correct_answer: an abstracted reusable representation in the same hierarchical format (named steps and substeps)  
	Each Step and Substep in correct_answer:  
	• content: "What the abstraction does"  
	• general_hint: "What kind of logic is being unified"  
	• detailed_hint: "Explain the sequence being replaced and its intention"

---

OUTPUT FORMAT:  
Only give as output the raw JSON file and put "/" to go onto a new line.  
Do not include any text, markdown, explanations, commas before/after the JSON, or anything else:

[
  {
    "id": "abstraction-<timestamp>-1",
    "steps": [
      [ { "id": "A.1" }, { "id": "A.2" } ],
      [ { "id": "B.1" }, { "id": "B.2" } ]
    ],
    "correct_answer": {
      "stepsTree": {
        "FunctionName": {
          "content": "What the abstraction does",
          "general_hint": "What kind of logic is being unified",
          "detailed_hint": "Explain the sequence being replaced and its intention",
          "substeps": {
            "FunctionName1": {
              "content": "First abstract action",
              "general_hint": "Hint A",
              "detailed_hint": "Explanation A",
              "substeps": {}
            },
            "FunctionName2": {
              "content": "Second abstract action",
              "general_hint": "Hint B",
              "detailed_hint": "Explanation B",
              "substeps": {}
            }
          }
        }
      }
    }
  },
  {
    "id": "abstraction-<timestamp>-2",
    "steps": [
      [ { "id": "C.1" }, { "id": "C.2" } ]
    ],
    "correct_answer": {
      "stepsTree": {
        "AnotherFunction": {
          "content": "Local grouping",
          "general_hint": "Purpose of these steps together",
          "detailed_hint": "Why they form one coherent unit",
          "substeps": {
            "AnotherFunction1": {
              "content": "Step 1",
              "substeps": {}
            },
            "AnotherFunction2": {
              "content": "Step 2",
              "substeps": {}
            }
          }
        }
      }
    }
  }
]

---

INPUT:  
The following is the step tree JSON you must analyze:  

${treeJson}

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
