/**
 * Cloudflare Turnstile verification. If no secret key is configured, verification is skipped
 * (rate limits still apply) so local development and fresh installs work.
 */
export async function verifyTurnstile(secret: string | undefined, token: string | null | undefined, ip?: string): Promise<boolean> {
	if (!secret) return true;
	if (!token) return false;
	try {
		const body = new URLSearchParams({ secret, response: token });
		if (ip && ip !== 'unknown') body.set('remoteip', ip);
		const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
		const data = (await res.json()) as { success?: boolean };
		return data.success === true;
	} catch (err) {
		console.error('Turnstile verification failed', err);
		return false;
	}
}
