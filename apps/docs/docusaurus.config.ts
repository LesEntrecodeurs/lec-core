import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";

const config: Config = {
	title: "LEC Internal",
	tagline: "Documentation des packages internes LEC",
	favicon: "img/favicon.ico",

	future: {
		v4: true,
	},

	url: "https://lec-internal.dev",
	baseUrl: "/",

	onBrokenLinks: "throw",
	onBrokenMarkdownLinks: "warn",

	i18n: {
		defaultLocale: "fr",
		locales: ["fr"],
	},

	presets: [
		[
			"classic",
			{
				docs: {
					sidebarPath: "./sidebars.ts",
				},
				blog: false,
				theme: {
					customCss: "./src/css/custom.css",
				},
			} satisfies Preset.Options,
		],
	],

	themeConfig: {
		colorMode: {
			respectPrefersColorScheme: true,
		},
		navbar: {
			title: "LEC Internal",
			logo: {
				alt: "LEC Logo",
				src: "img/logo.svg",
			},
			items: [
				{
					type: "docSidebar",
					sidebarId: "packagesSidebar",
					position: "left",
					label: "Packages",
				},
				{
					type: "docSidebar",
					sidebarId: "guidesSidebar",
					position: "left",
					label: "Guides",
				},
			],
		},
		footer: {
			style: "dark",
			links: [
				{
					title: "Documentation",
					items: [
						{
							label: "Packages",
							to: "/docs/intro",
						},
					],
				},
				{
					title: "Packages",
					items: [
						{
							label: "@lec/ddd-tools",
							to: "/docs/packages/ddd-tools/overview",
						},
						{
							label: "@lec/alert",
							to: "/docs/packages/alert-manager/overview",
						},
					],
				},
			],
			copyright: `\u00a9 ${new Date().getFullYear()} - <a href="https://lesentrecodeurs.com" style="color:white;">Les Entrecodeurs</a>.`,
		},
		prism: {
			theme: prismThemes.github,
			darkTheme: prismThemes.dracula,
		},
	} satisfies Preset.ThemeConfig,
};

export default config;
