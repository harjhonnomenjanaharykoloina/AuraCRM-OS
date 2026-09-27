import { getT } from "@/i18n/server";
import Image from "next/image";
import Link from "next/link";
import { poppins as headingFont, openSans as bodyFont } from "@/lib/fonts";
import { cn } from "@/lib/utils";
import { PublicSiteHeader } from "@/components/shared/public-site-header";
import { PublicSiteFooter } from "@/components/shared/public-site-footer";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Code,
  Database,
  Globe,
  Headset,
  LayoutDashboard,
  Lock,
  Server,
  ShieldCheck,
  TrendingUp,
  Users,
  Workflow,
} from "lucide-react";

const valuePropIcons: LucideIcon[] = [Code, Server, ShieldCheck];

const featureItems: Array<{ icon: LucideIcon; titleKey: string; descKey: string }> = [
  { icon: BarChart3, titleKey: "pipelineTitle", descKey: "pipelineDesc" },
  { icon: Database, titleKey: "customer360Title", descKey: "customer360Desc" },
  { icon: Users, titleKey: "collaborationTitle", descKey: "collaborationDesc" },
  { icon: Workflow, titleKey: "automationTitle", descKey: "automationDesc" },
];

const securityItems: Array<{ icon: LucideIcon; titleKey: string; descKey: string }> = [
  { icon: ShieldCheck, titleKey: "complianceTitle", descKey: "complianceDesc" },
  { icon: Lock, titleKey: "encryptionTitle", descKey: "encryptionDesc" },
  { icon: Users, titleKey: "rbacTitle", descKey: "rbacDesc" },
  { icon: Database, titleKey: "backupTitle", descKey: "backupDesc" },
];

const howItWorksSteps: Array<{ icon: LucideIcon; titleKey: string; descKey: string }> = [
  { icon: Server, titleKey: "step1Title", descKey: "step1Desc" },
  { icon: LayoutDashboard, titleKey: "step2Title", descKey: "step2Desc" },
  { icon: TrendingUp, titleKey: "step3Title", descKey: "step3Desc" },
];

const useCaseIcons: LucideIcon[] = [TrendingUp, Users, Headset];

const resourceItems: Array<{ icon: LucideIcon; titleKey: string; descKey: string; href: string }> = [
  { icon: LayoutDashboard, titleKey: "docsTitle", descKey: "docsDesc", href: "https://docs.auracrm.com" },
  { icon: Globe, titleKey: "blogTitle", descKey: "blogDesc", href: "https://blog.auracrm.com" },
  { icon: Users, titleKey: "communityTitle", descKey: "communityDesc", href: "https://github.com/auracrm/auracrm/discussions" },
  { icon: Database, titleKey: "githubTitle", descKey: "githubDesc", href: "https://github.com/auracrm/auracrm" },
];

const pricingTiers: Array<{
  nameKey: string;
  descKey: string;
  priceKey: string;
  featuresPrefix: string;
  ctaKey: string;
  highlight?: boolean;
  icon: LucideIcon;
}> = [
  { nameKey: "freeName", descKey: "freeDesc", priceKey: "freePrice", featuresPrefix: "freeFeatures", ctaKey: "freeCta", icon: Server },
  { nameKey: "proName", descKey: "proDesc", priceKey: "proPrice", featuresPrefix: "proFeatures", ctaKey: "proCta", highlight: true, icon: TrendingUp },
  { nameKey: "enterpriseName", descKey: "enterpriseDesc", priceKey: "enterprisePrice", featuresPrefix: "enterpriseFeatures", ctaKey: "enterpriseCta", icon: ShieldCheck },
];

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="text-center">
      <h2 className={cn(headingFont.className, "text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl")}>
        {title}
      </h2>
      <p className="mt-5 text-lg leading-relaxed text-slate-600 max-w-3xl mx-auto">
        {subtitle}
      </p>
    </div>
  );
}

function ValuePropCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-3xl border border-white/60 bg-white/60 p-7 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-blue-100 hover:bg-white hover:shadow-xl hover:shadow-blue-100/50">
      <div className="rounded-2xl border border-blue-50 bg-blue-50/50 p-3 text-blue-600">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className={cn(headingFont.className, "mt-5 text-xl font-bold text-slate-900")}>
        {title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        {description}
      </p>
    </article>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-white/60 bg-white/60 p-7 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-blue-100 hover:bg-white hover:shadow-xl">
      <div className="flex items-start gap-5">
        <div className="rounded-2xl border border-blue-50 bg-blue-50/50 p-3 text-blue-600">
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <h3 className={cn(headingFont.className, "text-xl font-bold text-slate-900")}>
            {title}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

function HowItWorksStep({
  number,
  icon: Icon,
  title,
  description,
}: {
  number: number;
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-blue-100 bg-white text-blue-600 shadow-sm">
        <Icon className="h-6 w-6" />
      </div>
      <div className={cn(headingFont.className, "mt-4 text-xs font-bold uppercase tracking-widest text-blue-600")}>
        {number}
      </div>
      <h3 className={cn(headingFont.className, "mt-3 text-xl font-bold text-slate-900")}>
        {title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-slate-600">
        {description}
      </p>
    </div>
  );
}

function PricingCard({
  icon: Icon,
  name,
  description,
  price,
  features,
  cta,
  highlight,
}: {
  icon: LucideIcon;
  name: string;
  description: string;
  price: string;
  features: string[];
  cta: string;
  highlight?: boolean;
}) {
  return (
    <div className={cn(
      "rounded-3xl border p-8 shadow-sm backdrop-blur-xl transition-all",
      highlight
        ? "border-blue-200 bg-blue-50/50 ring-2 ring-blue-500/30"
        : "border-white/60 bg-white/60 hover:-translate-y-1 hover:border-blue-100 hover:bg-white hover:shadow-xl"
    )}>
      <div className="flex items-center gap-3">
        <div className="rounded-2xl border border-blue-50 bg-blue-50/50 p-2.5 text-blue-600">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className={cn(headingFont.className, "text-xl font-bold text-slate-900")}>
          {name}
        </h3>
      </div>
      <p className="mt-4 text-sm leading-relaxed text-slate-600">
        {description}
      </p>
      <div className={cn(headingFont.className, "mt-6 text-4xl font-extrabold text-slate-900")}>
        {price}
      </div>
      <ul className="mt-6 space-y-3">
        {features.map((feature, idx) => (
          <li key={idx} className="flex items-center gap-3">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-sm text-slate-600">{feature}</span>
          </li>
        ))}
      </ul>
      <Button asChild size="lg" className="mt-8 w-full">
        <Link href="/register">{cta}</Link>
      </Button>
    </div>
  );
}

function ResourceCard({
  icon: Icon,
  title,
  description,
  href,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group rounded-3xl border border-white/60 bg-white/60 p-7 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-blue-100 hover:bg-white hover:shadow-xl flex flex-col"
    >
      <div className="rounded-2xl border border-blue-50 bg-blue-50/50 p-3 text-blue-600 group-hover:scale-110 transition-transform">
        <Icon className="h-6 w-6" />
      </div>
      <h3 className={cn(headingFont.className, "mt-5 text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors")}>
        {title}
      </h3>
      <p className="mt-3 text-sm leading-relaxed text-slate-600 flex-1">
        {description}
      </p>
    </a>
  );
}

export default async function Home() {
  const t = await getT();

  return (
    <div className={cn("relative min-h-screen bg-[#FAFAFA] text-slate-900", bodyFont.className, "selection:bg-blue-100 selection:text-blue-900")}>
      {/* Hero Background */}
      <div className="absolute top-0 inset-x-0 h-[720px] pointer-events-none overflow-hidden">
        <div className="absolute inset-0 opacity-80 [mask-image:linear-gradient(to_bottom,white_55%,transparent_100%)]">
          <Image src="/imgs/hero-bg.png" alt="Abstract background" fill className="object-cover object-top" priority unoptimized />
        </div>
        <div className="absolute top-[-12%] left-[-10%] h-[460px] w-[460px] rounded-full bg-blue-200/40 blur-[110px] mix-blend-multiply"></div>
        <div className="absolute top-[18%] right-[-5%] h-[380px] w-[380px] rounded-full bg-cyan-200/30 blur-[90px] mix-blend-multiply"></div>
      </div>

      <PublicSiteHeader />

      <main className="relative z-10">
        {/* Hero Section */}
        <section id="hero" className="relative isolate flex flex-col items-center text-center pt-28 pb-16 sm:pt-36 sm:pb-20">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <h1 className={cn(headingFont.className, "text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl")}>
              {t("landing.hero.title")}
            </h1>
            <p className="mt-8 text-lg leading-relaxed text-slate-600 max-w-3xl mx-auto">
              {t("landing.hero.subtitle")}
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild size="lg" className="w-full sm:w-auto bg-primary text-primary-foreground shadow-sm hover:bg-primary/90">
                <Link href="/register">{t("landing.hero.primaryCta")}</Link>
              </Button>
              <Button asChild variant="ghost" size="lg" className="w-full sm:w-auto text-slate-700 hover:bg-slate-100">
                <a href="#pricing">{t("landing.hero.secondaryCta")}</a>
              </Button>
            </div>
          </div>
        </section>

        {/* Value Props Section */}
        <section id="value-props" className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionTitle
              title={t("landing.valueProps.title")}
              subtitle={t("landing.valueProps.subtitle")}
            />
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <ValuePropCard
                  key={i}
                  icon={valuePropIcons[i]}
                  title={t(`landing.valueProps.items.${i}.title`)}
                  description={t(`landing.valueProps.items.${i}.description`)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionTitle
              title={t("landing.features.title")}
              subtitle={t("landing.features.subtitle")}
            />
            <div className="mt-14 grid gap-6 lg:grid-cols-2">
              {featureItems.map((item) => (
                <FeatureCard
                  key={item.titleKey}
                  icon={item.icon}
                  title={t(`landing.features.${item.titleKey}`)}
                  description={t(`landing.features.${item.descKey}`)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Security / Compliance Section */}
        <section id="security" className="py-20 bg-slate-50/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionTitle
              title={t("landing.security.title")}
              subtitle={t("landing.security.subtitle")}
            />
            <div className="mt-14 grid gap-6 lg:grid-cols-2">
              {securityItems.map((item, i) => (
                <FeatureCard
                  key={i}
                  icon={item.icon}
                  title={t(`landing.security.${item.titleKey}`)}
                  description={t(`landing.security.${item.descKey}`)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionTitle
              title={t("landing.howItWorks.title")}
              subtitle={t("landing.howItWorks.subtitle")}
            />
            <div className="mt-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {howItWorksSteps.map((step, i) => (
                <HowItWorksStep
                  key={i}
                  number={i + 1}
                  icon={step.icon}
                  title={t(`landing.howItWorks.${step.titleKey}`)}
                  description={t(`landing.howItWorks.${step.descKey}`)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Use Cases / Solutions Section */}
        <section id="solutions" className="py-20 bg-slate-50/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionTitle
              title={t("landing.useCases.title")}
              subtitle={t("landing.useCases.subtitle")}
            />
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((i) => (
                <ValuePropCard
                  key={i}
                  icon={useCaseIcons[i]}
                  title={t(`landing.useCases.items.${i}.title`)}
                  description={t(`landing.useCases.items.${i}.description`)}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionTitle
              title={t("landing.pricing.title")}
              subtitle={t("landing.pricing.subtitle")}
            />
            <div className="mt-14 grid gap-8 lg:grid-cols-3">
              {pricingTiers.map((tier) => {
                const features = [
                  t(`landing.pricing.${tier.featuresPrefix}0`),
                  t(`landing.pricing.${tier.featuresPrefix}1`),
                  t(`landing.pricing.${tier.featuresPrefix}2`),
                ];
                return (
                  <PricingCard
                    key={tier.nameKey}
                    icon={tier.icon}
                    name={t(`landing.pricing.${tier.nameKey}`)}
                    description={t(`landing.pricing.${tier.descKey}`)}
                    price={t(`landing.pricing.${tier.priceKey}`)}
                    features={features}
                    cta={t(`landing.pricing.${tier.ctaKey}`)}
                    highlight={tier.highlight}
                  />
                );
              })}
            </div>
          </div>
        </section>

        {/* Resources Section */}
        <section id="resources" className="py-20 bg-slate-50/50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <SectionTitle
              title={t("landing.resources.title")}
              subtitle={t("landing.resources.subtitle")}
            />
            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {resourceItems.map((item) => (
                <ResourceCard
                  key={item.titleKey}
                  icon={item.icon}
                  title={t(`landing.resources.${item.titleKey}`)}
                  description={t(`landing.resources.${item.descKey}`)}
                  href={item.href}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="py-20">
          <div className="mx-auto max-w-5xl text-center">
            <h2 className={cn(headingFont.className, "text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl")}>
              {t("landing.features.ctaTitle")}
            </h2>
            <p className="mt-5 text-lg leading-relaxed text-slate-600 max-w-3xl mx-auto">
              {t("landing.features.ctaDesc")}
            </p>
            <div className="mt-8">
              <Button asChild size="lg" className="bg-primary text-primary-foreground shadow-sm hover:bg-primary/90">
                <Link href="/register" className="inline-flex items-center justify-center gap-2">
                  {t("landing.features.ctaButton")}
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <PublicSiteFooter />
    </div>
  );
}
