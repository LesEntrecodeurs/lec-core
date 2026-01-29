import Link from "@docusaurus/Link";
import Heading from "@theme/Heading";
import Layout from "@theme/Layout";
import type { ReactNode } from "react";

import styles from "./index.module.css";

function HomepageHeader() {
	return (
		<header className={styles.heroBanner}>
			<div className="container">
				<Heading as="h1">LEC Internal</Heading>
				<p className={styles.heroSubtitle}>
					Packages internes pour les projets LEC.
				</p>
				<div className={styles.buttons}>
					<Link
						className="button button--secondary button--lg"
						to="/docs/intro"
					>
						Documentation
					</Link>
				</div>
			</div>
		</header>
	);
}

type PackageItem = {
	name: string;
	description: string;
	badge: string;
	href: string;
};

const packages: PackageItem[] = [
	{
		name: "@lec-packages/ddd-tools",
		description:
			"Primitives DDD : Entity, ValueObject, Result, Command, Repository, Pagination et erreurs typees.",
		badge: "Domain",
		href: "/docs/packages/ddd-tools/overview",
	},
	{
		name: "@lec-packages/alert",
		description:
			"Systeme d'alertes multi-providers (Discord, Email) avec detection de pannes et templates React Email.",
		badge: "Infrastructure",
		href: "/docs/packages/alert-manager/overview",
	},
];

function PackageCard({ name, description, badge, href }: PackageItem) {
	return (
		<Link to={href} className={styles.packageCard}>
			<div className={styles.packageName}>{name}</div>
			<div className={styles.packageDesc}>{description}</div>
			<span className={styles.packageBadge}>{badge}</span>
		</Link>
	);
}

export default function Home(): ReactNode {
	return (
		<Layout description="Documentation des packages internes LEC">
			<HomepageHeader />
			<main className="container">
				<section>
					<Heading as="h2" className="text--center margin-top--lg">
						Packages
					</Heading>
					<p className="text--center margin-bottom--lg">
						Tous nos packages sont publiés sur npm et peuvent être installés
						indépendamment dans nos projets.
					</p>
					<div className={styles.packageGrid}>
						{packages.map((pkg) => (
							<PackageCard key={pkg.name} {...pkg} />
						))}
					</div>
				</section>
			</main>
		</Layout>
	);
}
