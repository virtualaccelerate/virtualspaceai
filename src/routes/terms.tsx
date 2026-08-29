import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms of Service — Virtual Space" },
      {
        name: "description",
        content:
          "The terms governing your use of Virtual Space, an AI-powered workspace platform with Google Drive integration.",
      },
      { property: "og:title", content: "Terms of Service — Virtual Space" },
      {
        property: "og:description",
        content:
          "Virtual Space Terms of Service: accounts, Google Drive integration, user content, AI features, acceptable use, and liability.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://ai-virtualspace.com/terms" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://ai-virtualspace.com/terms" }],
  }),
});

const SECTIONS: { title: string; body: (string | string[])[] }[] = [
  {
    title: "1. Acceptance of Terms",
    body: [
      "By accessing or using Virtual Space (the “Service”), you agree to be bound by these Terms of Service (the “Terms”). If you do not agree with any part of these Terms, you must not access or use the Service.",
      "If you use the Service on behalf of an organization, you represent that you have authority to bind that organization to these Terms, and “you” refers to that organization.",
      "You must be at least 13 years old (or the minimum age required in your jurisdiction) to use the Service.",
    ],
  },
  {
    title: "2. Description of Virtual Space",
    body: [
      "Virtual Space is an AI-powered web platform that provides a shared workspace for teams, including task management, a knowledge base, document processing, analytics, integrations with third-party services such as Google Drive, and AI assistants that can work with content you provide.",
      "We may add, modify, or remove features at any time. Some features may be offered as beta or experimental functionality and may change or be discontinued without notice.",
    ],
  },
  {
    title: "3. User Accounts",
    body: [
      "You need an account to use most parts of the Service. You may create an account using email authentication or a supported identity provider such as Google.",
      "You are responsible for:",
      [
        "Providing accurate and current account information.",
        "Maintaining the confidentiality of your credentials and access to your account.",
        "All activity that occurs under your account.",
        "Notifying us promptly of any unauthorized use of your account.",
      ],
      "Workspace owners and administrators may invite, manage, and remove members, and may have access to content created within their workspace.",
    ],
  },
  {
    title: "4. Google Drive Integration",
    body: [
      "Virtual Space allows you to connect your Google account and Google Drive. Connecting is optional and always initiated by you.",
      "When you connect Google Drive, you authorize Virtual Space to access, read, create, or update files as required by the features you use. Each Google connection is personal to the user who authorized it and is not shared with other users.",
      "Virtual Space's use and transfer of information received from Google APIs complies with the Google API Services User Data Policy, including the Limited Use requirements.",
      "You may revoke access at any time by disconnecting the integration inside Virtual Space or through your Google Account security settings. Revoking access may disable features that depend on it.",
      "You are responsible for ensuring that you have the right to grant access to any files, folders, or shared drives you make available to the Service.",
    ],
  },
  {
    title: "5. User Content",
    body: [
      "“User Content” means any files, documents, tasks, messages, data, and other materials you upload, create, or make available through the Service.",
      "You retain all ownership rights in your User Content. We do not claim ownership of it.",
      "You grant Virtual Space a limited, non-exclusive, worldwide license to host, store, process, transmit, and display your User Content solely for the purpose of operating and providing the Service to you and your workspace.",
      "You are solely responsible for your User Content and confirm that you have the necessary rights to it and that it does not violate applicable law or third-party rights.",
      "You are responsible for maintaining your own backups. We are not a backup service.",
    ],
  },
  {
    title: "6. AI-Powered Features",
    body: [
      "The Service includes AI features that may analyze documents, spreadsheets, messages, tasks, and other information you provide or authorize, in order to generate answers, summaries, suggestions, and other outputs.",
      "AI output may be inaccurate, incomplete, or misleading. You must review and verify AI output before relying on it, particularly for financial, legal, medical, tax, or other consequential decisions. AI output does not constitute professional advice.",
      "AI features may be provided using third-party model providers. Content you submit may be transmitted to those providers solely to generate the requested output.",
      "Your Google Drive content is not used to train general-purpose AI models without your explicit consent.",
      "You are responsible for how you use AI output, including any content you publish, share, or act upon.",
    ],
  },
  {
    title: "7. Acceptable Use",
    body: [
      "You agree not to:",
      [
        "Use the Service in violation of any applicable law or regulation.",
        "Upload or process content you do not have the right to use, or that infringes intellectual property or privacy rights.",
        "Upload malicious code, or attempt to disrupt, overload, or interfere with the Service or its infrastructure.",
        "Attempt to gain unauthorized access to accounts, workspaces, systems, or data.",
        "Reverse engineer, decompile, scrape, or attempt to extract source code or underlying models, except where such restriction is prohibited by law.",
        "Resell, sublicense, or provide the Service to third parties without our written permission.",
        "Use the Service to generate or distribute unlawful, harassing, deceptive, or abusive content.",
      ],
      "We may investigate suspected violations and take appropriate action, including restricting access.",
    ],
  },
  {
    title: "8. Intellectual Property",
    body: [
      "The Service, including its software, design, interfaces, branding, and documentation, is owned by Virtual Space and protected by intellectual property laws.",
      "Subject to these Terms, we grant you a limited, non-exclusive, non-transferable, revocable right to access and use the Service for your internal business or personal purposes.",
      "No rights are granted other than those expressly stated in these Terms. You may not use our name, logo, or trademarks without prior written permission.",
      "If you send us feedback or suggestions, you grant us the right to use them without restriction or compensation.",
    ],
  },
  {
    title: "9. Third-Party Services",
    body: [
      "The Service may integrate with third-party services such as Google Drive, Google Workspace, Telegram, messaging platforms, storage providers, payment providers, and AI model providers.",
      "Your use of a third-party service is governed by that provider's own terms and privacy policy. We do not control third-party services and are not responsible for their availability, accuracy, security, or actions.",
      "A third-party service may change, restrict, or terminate its API access, which may affect or disable related Virtual Space functionality.",
    ],
  },
  {
    title: "10. Disclaimer of Warranties",
    body: [
      "The Service is provided “as is” and “as available,” without warranties of any kind, whether express, implied, or statutory, including implied warranties of merchantability, fitness for a particular purpose, title, and non-infringement.",
      "We do not warrant that the Service will be uninterrupted, secure, error-free, or that any content or AI output will be accurate, complete, or suitable for your purposes.",
      "Some jurisdictions do not allow certain disclaimers, so parts of this section may not apply to you.",
    ],
  },
  {
    title: "11. Limitation of Liability",
    body: [
      "To the maximum extent permitted by law, Virtual Space and its team shall not be liable for any indirect, incidental, special, consequential, exemplary, or punitive damages, or for any loss of profits, revenue, data, goodwill, or business opportunities, arising out of or related to your use of the Service.",
      "To the maximum extent permitted by law, our total aggregate liability arising out of or related to the Service shall not exceed the greater of (a) the amount you paid to us for the Service in the twelve (12) months preceding the event giving rise to the claim, or (b) one hundred US dollars (USD 100).",
      "These limitations apply regardless of the legal theory and even if we have been advised of the possibility of such damages.",
    ],
  },
  {
    title: "12. Account Suspension or Termination",
    body: [
      "You may stop using the Service at any time and may request deletion of your account and associated data.",
      "We may suspend or terminate your access, with or without notice, if you violate these Terms, if your use creates a security, legal, or operational risk, or if required by law.",
      "Upon termination, your right to use the Service ends immediately. We may delete your User Content after a reasonable period, except where retention is required by law.",
      "Sections that by their nature should survive termination — including intellectual property, disclaimers, limitation of liability, and governing law — will survive.",
    ],
  },
  {
    title: "13. Changes to the Terms",
    body: [
      "We may update these Terms from time to time. If we make material changes, we will update the “Last updated” date shown on this page and, where appropriate, provide additional notice.",
      "Your continued use of the Service after the changes take effect constitutes your acceptance of the updated Terms.",
    ],
  },
  {
    title: "14. Governing Law",
    body: [
      "These Terms are governed by the laws of the Kyrgyz Republic, without regard to its conflict-of-law rules.",
      "Any dispute arising out of or relating to these Terms or the Service shall be subject to the exclusive jurisdiction of the competent courts of the Kyrgyz Republic, unless mandatory law in your country of residence provides otherwise.",
      "Before initiating a formal dispute, we encourage you to contact us so we can try to resolve the matter informally.",
    ],
  },
];

function TermsPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>

        <h1 className="mt-6 font-display text-3xl sm:text-5xl text-foreground">Terms of Service</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: August 29, 2026</p>

        <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-muted-foreground">
          <p>Welcome to Virtual Space.</p>
          <p>
            These Terms of Service govern your access to and use of the Virtual Space platform, an AI-powered workspace
            that can integrate with Google Drive and other third-party services. Please read them carefully together
            with our{" "}
            <Link className="text-primary hover:underline" to="/privacy">
              Privacy Policy
            </Link>
            , which explains how we handle your information.
          </p>
          <p>
            Website:{" "}
            <a className="text-primary hover:underline" href="https://ai-virtualspace.com">
              https://ai-virtualspace.com
            </a>
            <br />
            Contact email:{" "}
            <a className="text-primary hover:underline" href="mailto:zukhra.akylbek23uni@gmail.com">
              zukhra.akylbek23uni@gmail.com
            </a>
          </p>
        </div>

        <div className="mt-10 space-y-10">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
              <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground">
                {section.body.map((block, i) =>
                  Array.isArray(block) ? (
                    <ul key={i} className="list-disc space-y-1.5 pl-5">
                      {block.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ) : (
                    <p key={i}>{block}</p>
                  ),
                )}
              </div>
            </section>
          ))}

          <section>
            <h2 className="text-xl font-semibold text-foreground">15. Contact Information</h2>
            <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground">
              <p>If you have questions about these Terms, please contact us:</p>
              <p>
                Virtual Space
                <br />
                Website:{" "}
                <a className="text-primary hover:underline" href="https://ai-virtualspace.com">
                  https://ai-virtualspace.com
                </a>
                <br />
                Email:{" "}
                <a className="text-primary hover:underline" href="mailto:zukhra.akylbek23uni@gmail.com">
                  zukhra.akylbek23uni@gmail.com
                </a>
              </p>
              <p>
                See also our{" "}
                <Link className="text-primary hover:underline" to="/privacy">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
