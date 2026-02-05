import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebars: SidebarsConfig = {
	guidesSidebar: [
		"guides/ajouter-un-package",
		"guides/integration-nestjs-alert",
		"guides/publication-npm",
	],
	packagesSidebar: [
		"intro",
		{
			type: "category",
			label: "@lec-packages/ddd-tools",
			items: [
				"packages/ddd-tools/overview",
				"packages/ddd-tools/entity",
				"packages/ddd-tools/value-object",
				"packages/ddd-tools/result",
				"packages/ddd-tools/command",
				"packages/ddd-tools/repository",
				"packages/ddd-tools/pagination",
				"packages/ddd-tools/errors",
			],
		},
		{
			type: "category",
			label: "@lec-packages/alert",
			items: [
				"packages/alert-manager/overview",
				"packages/alert-manager/alert-manager",
				"packages/alert-manager/failure-detector",
				"packages/alert-manager/providers",
				"packages/alert-manager/types",
			],
		},
	],
};

export default sidebars;
