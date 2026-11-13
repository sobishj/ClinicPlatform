export interface EmailMessage {
	to: string | string[];
	subject: string;
	html: string;
	text?: string;
	replyTo?: string;
}

export interface EmailProvider {
	readonly name: string;
	send(message: EmailMessage): Promise<void>;
}

export interface ResolvedEmailConfig {
	provider: 'none' | 'resend' | 'smtp';
	from: string;
	replyTo?: string;
	resendApiKey?: string;
	smtp?: { host: string; port: number; user?: string; pass?: string; secure: boolean };
}
