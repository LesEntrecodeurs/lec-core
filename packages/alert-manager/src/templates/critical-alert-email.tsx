import {
	Body,
	Button,
	Container,
	Head,
	Hr,
	Html,
	Preview,
	Section,
	Text,
} from "@react-email/components";
import * as React from "react";
import type { Alert, AlertSeverity, AlertType } from "../types";

export interface CriticalAlertEmailProps {
	alerts: Alert[];
	alertType: AlertType;
	severity: AlertSeverity;
	bullBoardUrl?: string;
}

/**
 * Critical alert email template
 * Displays grouped alerts with severity-based color coding
 */
export function CriticalAlertEmail({
	alerts,
	alertType,
	severity,
	bullBoardUrl = "http://localhost:3001",
}: CriticalAlertEmailProps) {
	const severityColor = getSeverityColor(severity);
	const severityIcon = getSeverityIcon(severity);

	return (
		<Html>
			<Head />
			<Preview>
				{severityIcon} {severity} Alert: {alertType}
			</Preview>
			<Body style={main}>
				<Container style={container}>
					{/* Alert Header */}
					<Section style={{ ...header, backgroundColor: severityColor }}>
						<Text style={headerText}>
							{severityIcon} {severity} Alert: {alertType}
						</Text>
					</Section>

					{/* Alert Summary */}
					<Section style={summarySection}>
						<Text style={summaryText}>
							<strong>Total Alerts:</strong> {alerts.length}
						</Text>
						<Text style={summaryText}>
							<strong>Alert Type:</strong> {alertType}
						</Text>
						<Text style={summaryText}>
							<strong>Severity:</strong> {severity}
						</Text>
					</Section>

					<Hr style={hr} />

					{/* Alert Details */}
					<Section style={alertsSection}>
						{alerts.map((alert, index) => (
							<React.Fragment key={alert.type}>
								<div style={alertCard}>
									<Text style={alertIndex}>
										Alert {index + 1} of {alerts.length}
									</Text>
									<Text style={alertField}>
										<strong>Worker:</strong> {alert.workerName}
									</Text>
									<Text style={alertField}>
										<strong>Time:</strong>{" "}
										{new Date(alert.timestamp).toISOString()}
									</Text>
									<Text style={alertField}>
										<strong>Message:</strong> {alert.message}
									</Text>
									{alert.context && Object.keys(alert.context).length > 0 && (
										<>
											<Text style={alertField}>
												<strong>Context:</strong>
											</Text>
											<pre style={contextPre}>
												{JSON.stringify(alert.context, null, 2)}
											</pre>
										</>
									)}
								</div>
								{index < alerts.length - 1 && <Hr style={alertDivider} />}
							</React.Fragment>
						))}
					</Section>

					<Hr style={hr} />

					{/* CTA Section */}
					<Section style={ctaSection}>
						<Text style={ctaText}>
							View failed jobs and retry them in the Bull Board dashboard:
						</Text>
						<Button style={button} href={bullBoardUrl}>
							View Bull Board Dashboard
						</Button>
						<Text style={ctaFallback}>
							<a href={bullBoardUrl} style={link}>
								{bullBoardUrl}
							</a>
						</Text>
					</Section>

					{/* Footer */}
					<Hr style={hr} />
					<Section style={footer}>
						<Text style={footerText}>
							This is an automated alert from Ragnar monitoring system.
						</Text>
						<Text style={footerText}>
							Please take action based on the severity level.
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
}

/**
 * Get severity color for header background
 */
function getSeverityColor(severity: AlertSeverity): string {
	switch (severity) {
		case "CRITICAL":
			return "#dc2626"; // red-600
		case "HIGH":
			return "#f59e0b"; // amber-500
		case "MEDIUM":
			return "#3b82f6"; // blue-500
		case "LOW":
			return "#6b7280"; // gray-500
		default:
			return "#6b7280";
	}
}

/**
 * Get severity icon
 */
function getSeverityIcon(severity: AlertSeverity): string {
	switch (severity) {
		case "CRITICAL":
			return "🚨";
		case "HIGH":
			return "⚠️";
		case "MEDIUM":
			return "ℹ️";
		case "LOW":
			return "📝";
		default:
			return "ℹ️";
	}
}

// Styles (inline CSS for email clients)
const main = {
	backgroundColor: "#f3f4f6",
	fontFamily:
		'-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
	backgroundColor: "#ffffff",
	margin: "0 auto",
	padding: "0 0 48px",
	marginBottom: "64px",
	maxWidth: "600px",
};

const header = {
	padding: "20px 24px",
};

const headerText = {
	color: "#ffffff",
	fontSize: "20px",
	fontWeight: "bold" as const,
	margin: "0",
	textAlign: "center" as const,
};

const summarySection = {
	padding: "24px 24px 0",
};

const summaryText = {
	fontSize: "14px",
	lineHeight: "1.5",
	color: "#374151",
	margin: "8px 0",
};

const hr = {
	borderColor: "#e5e7eb",
	margin: "20px 0",
};

const alertsSection = {
	padding: "0 24px",
};

const alertCard = {
	backgroundColor: "#f9fafb",
	padding: "16px",
	borderRadius: "6px",
	marginBottom: "8px",
};

const alertIndex = {
	fontSize: "12px",
	color: "#6b7280",
	fontWeight: "600" as const,
	margin: "0 0 12px",
	textTransform: "uppercase" as const,
};

const alertField = {
	fontSize: "14px",
	lineHeight: "1.5",
	color: "#1a202c",
	margin: "6px 0",
};

const contextPre = {
	fontSize: "12px",
	lineHeight: "1.4",
	color: "#4b5563",
	backgroundColor: "#ffffff",
	padding: "12px",
	borderRadius: "4px",
	border: "1px solid #e5e7eb",
	overflowX: "auto" as const,
	margin: "8px 0",
};

const alertDivider = {
	borderColor: "#e5e7eb",
	margin: "16px 0",
};

const ctaSection = {
	padding: "32px 24px",
	textAlign: "center" as const,
};

const ctaText = {
	fontSize: "14px",
	color: "#374151",
	margin: "0 0 16px",
};

const button = {
	backgroundColor: "#3b82f6",
	borderRadius: "6px",
	color: "#fff",
	fontSize: "16px",
	fontWeight: "600" as const,
	textDecoration: "none",
	textAlign: "center" as const,
	display: "inline-block",
	padding: "12px 32px",
};

const ctaFallback = {
	fontSize: "12px",
	color: "#6b7280",
	marginTop: "16px",
};

const link = {
	color: "#3b82f6",
	textDecoration: "underline",
};

const footer = {
	padding: "20px 24px",
};

const footerText = {
	fontSize: "12px",
	color: "#6b7280",
	lineHeight: "1.5",
	margin: "8px 0",
	textAlign: "center" as const,
};

export default CriticalAlertEmail;
