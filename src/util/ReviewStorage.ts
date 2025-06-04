import type { R2Bucket, R2ObjectBody } from '@cloudflare/workers-types';
import type { ReviewPayload } from '../types';

const REVIEW_FILENAME = 'Review.json';

export async function saveReview(env: { problemTree: R2Bucket }, username: string, rating: number, message: string): Promise<void> {
	const key = `${username}/${REVIEW_FILENAME}`;
	const payload: ReviewPayload = { rating, message };
	const json = JSON.stringify(payload);

	await env.problemTree.put(key, json, {
		httpMetadata: { contentType: 'application/json' },
	});
}

export async function loadReview(env: { problemTree: R2Bucket }, username: string): Promise<ReviewPayload | null> {
	const key = `${username}/${REVIEW_FILENAME}`;
	try {
		const obj = await env.problemTree.get(key);
		if (!obj) return null;
		const text = await (obj as R2ObjectBody).text();
		return JSON.parse(text) as ReviewPayload;
	} catch {
		return null;
	}
}

export async function loadAllReviews(env: { problemTree: R2Bucket }): Promise<
	{
		username: string;
		rating: number;
		message: string;
	}[]
> {
	const allReviews: { username: string; rating: number; message: string }[] = [];

	let cursor: string | undefined = undefined;
	do {
		const listResp = await env.problemTree.list({ cursor, prefix: '' });
		cursor = listResp.truncated ? listResp.cursor : undefined;

		for (const item of listResp.objects) {
			if (!item.key.endsWith(`/${REVIEW_FILENAME}`)) continue;

			const segments = item.key.split('/');
			if (segments.length !== 2) continue;
			const username = segments[0];

			try {
				const obj = await env.problemTree.get(item.key);
				if (!obj) continue;
				const text = await (obj as R2ObjectBody).text();
				const parsed = JSON.parse(text) as ReviewPayload;

				// **Skip any review whose rating is 0**
				if (parsed.rating === 0) continue;

				allReviews.push({
					username,
					rating: parsed.rating,
					message: parsed.message,
				});
			} catch {
				continue;
			}
		}
	} while (cursor);

	return allReviews;
}
