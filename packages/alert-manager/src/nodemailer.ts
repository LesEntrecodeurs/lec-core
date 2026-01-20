import type { Transporter } from "nodemailer";
import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";

/**
 * Configuration for the Nodemailer client
 */
export interface NodemailerConfig {
	host: string;
	port: number;
	secure: boolean; // true for 465, false for other ports
	auth?: {
		user: string;
		pass: string;
	};
}

/**
 * Email send parameters
 */
export interface SendEmailParams {
	from: string;
	to: string | string[];
	subject: string;
	html?: string;
	text?: string;
	replyTo?: string;
	cc?: string | string[];
	bcc?: string | string[];
	attachments?: Array<{
		filename: string;
		content: Buffer | string;
		contentType?: string;
	}>;
}

/**
 * Email send result
 */
export interface SendEmailResult {
	data: { id: string } | null;
	error: { message: string; statusCode?: number } | null;
}

/**
 * Nodemailer client class with similar interface to Resend
 */
export class NodemailerClient {
	private transporter: Transporter<SMTPTransport.SentMessageInfo>;
	private config: NodemailerConfig;

	constructor(config?: Partial<NodemailerConfig>) {
		this.config = this.resolveConfig(config);
		this.transporter = this.createTransporter();
	}

	/**
	 * Resolve configuration from params or environment variables
	 */
	private resolveConfig(config?: Partial<NodemailerConfig>): NodemailerConfig {
		return {
			host: config?.host ?? process.env.SMTP_HOST ?? "localhost",
			port: config?.port ?? Number(process.env.SMTP_PORT) ?? 587,
			secure: config?.secure ?? process.env.SMTP_SECURE === "true",
			auth:
				config?.auth ??
				(process.env.SMTP_USER && process.env.SMTP_PASS
					? {
							user: process.env.SMTP_USER,
							pass: process.env.SMTP_PASS,
						}
					: undefined),
		};
	}

	/**
	 * Create the nodemailer transporter
	 */
	private createTransporter(): Transporter<SMTPTransport.SentMessageInfo> {
		return nodemailer.createTransport({
			host: this.config.host,
			port: this.config.port,
			secure: this.config.secure,
			auth: this.config.auth,
			// Connection timeout settings
			connectionTimeout: 10000, // 10 seconds
			greetingTimeout: 10000,
			socketTimeout: 30000,
		});
	}

	/**
	 * Verify SMTP connection
	 */
	async verify(): Promise<boolean> {
		try {
			await this.transporter.verify();
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Send an email
	 * Returns a result object similar to Resend's API
	 */
	async send(params: SendEmailParams): Promise<SendEmailResult> {
		try {
			const info = await this.transporter.sendMail({
				from: params.from,
				to: params.to,
				subject: params.subject,
				html: params.html,
				text: params.text,
				replyTo: params.replyTo,
				cc: params.cc,
				bcc: params.bcc,
				attachments: params.attachments,
			});

			return {
				data: { id: info.messageId },
				error: null,
			};
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);

			// Map common SMTP errors to status codes
			const statusCode = this.getErrorStatusCode(error);

			return {
				data: null,
				error: {
					message: errorMessage,
					statusCode,
				},
			};
		}
	}

	/**
	 * Map error to HTTP-like status code for consistency
	 */
	private getErrorStatusCode(error: unknown): number | undefined {
		if (!(error instanceof Error)) return undefined;

		const msg = error.message.toLowerCase();

		// Authentication errors
		if (msg.includes("auth") || msg.includes("credentials")) {
			return 401;
		}

		// Rate limiting
		if (msg.includes("rate") || msg.includes("too many")) {
			return 429;
		}

		// Connection errors
		if (
			msg.includes("econnrefused") ||
			msg.includes("timeout") ||
			msg.includes("network")
		) {
			return 503;
		}

		// Invalid recipient
		if (msg.includes("recipient") || msg.includes("address")) {
			return 400;
		}

		return 500;
	}

	/**
	 * Close the transporter connection
	 */
	close(): void {
		this.transporter.close();
	}
}

// Singleton instance
let instance: NodemailerClient | null = null;

/**
 * Get singleton instance of NodemailerClient
 */
export function getNodemailerClient(
	config?: Partial<NodemailerConfig>,
): NodemailerClient {
	if (!instance) {
		instance = new NodemailerClient(config);
	}
	return instance;
}

/**
 * Reset singleton (useful for testing)
 */
export function resetNodemailerClient(): void {
	if (instance) {
		instance.close();
		instance = null;
	}
}
