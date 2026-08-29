import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy — Virtual Space" },
      {
        name: "description",
        content:
          "How Virtual Space collects, uses, stores, and protects your information, including Google account and Google Drive data.",
      },
      { property: "og:title", content: "Privacy Policy — Virtual Space" },
      {
        property: "og:description",
        content: "Virtual Space Privacy Policy: data collection, Google Drive access, AI features, security, and your rights.",
      },
      { property: "og:type", content: "article" },
      { property: "og:url", content: "https://ai-virtualspace.com/privacy" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [{ rel: "canonical", href: "https://ai-virtualspace.com/privacy" }],
  }),
});

const SECTIONS: { title: string; body: (string | string[])[] }[] = [
  {
    title: "1. Information We Collect",
    body: [
      "When you use Virtual Space, we may collect:",
      [
        "Your name and email address associated with your Google account.",
        "Information required to authenticate your Google account.",
        "Files and documents from your Google Drive that you explicitly authorize Virtual Space to access.",
        "Information and content that you voluntarily provide through the platform.",
        "Technical information necessary to operate, maintain, secure, and improve the platform.",
      ],
      "We request access only to information that is necessary to provide the functionality you use.",
    ],
  },
  {
    title: "2. Google Drive Data",
    body: [
      "If you connect Google Drive to Virtual Space, the App may access Google Drive data that you explicitly authorize.",
      "We may use this access to:",
      [
        "Read files and documents that you choose to make available to Virtual Space.",
        "Create or update files or documents when you request a feature that requires this functionality.",
        "Process authorized files to provide requested platform features.",
        "Enable AI-powered features to analyze or work with documents that you choose to provide.",
      ],
      "Virtual Space does not sell Google user data.",
      "We do not use Google Drive data for advertising purposes.",
      "We do not use Google Drive data for purposes unrelated to providing the functionality requested by you.",
    ],
  },
  {
    title: "3. Google API Services",
    body: [
      "Virtual Space's use and transfer of information received from Google APIs will comply with the Google API Services User Data Policy, including the Limited Use requirements.",
      "We request only the minimum permissions necessary to provide the functionality of the platform.",
      "You can revoke Virtual Space's access to your Google account at any time through your Google Account security settings.",
    ],
  },
  {
    title: "4. AI-Powered Features",
    body: [
      "Virtual Space provides AI-powered functionality that may process documents, files, text, and other information that you choose to provide or authorize.",
      "AI processing is used to provide the features and services requested by you.",
      "Your Google Drive content is not used to train general-purpose AI models without your explicit consent.",
    ],
  },
  {
    title: "5. Data Storage and Security",
    body: [
      "We take reasonable technical and organizational measures to protect your information from unauthorized access, disclosure, alteration, or destruction.",
      "Information may be processed and stored using secure third-party infrastructure and service providers that help us operate Virtual Space.",
      "We retain information only for as long as reasonably necessary to provide our services, maintain security, comply with legal obligations, resolve disputes, and enforce our agreements.",
    ],
  },
  {
    title: "6. Sharing of Information",
    body: [
      "Virtual Space does not sell, rent, or trade your personal information.",
      "We may share information with trusted service providers when necessary to:",
      [
        "Operate and maintain the platform.",
        "Provide requested functionality.",
        "Process information on your behalf.",
        "Maintain security and prevent abuse.",
        "Comply with applicable laws and legal requirements.",
      ],
      "Such service providers may process information only as necessary to provide their services.",
    ],
  },
  {
    title: "7. Your Choices and Rights",
    body: [
      "You may:",
      [
        "Choose whether to connect your Google account to Virtual Space.",
        "Disconnect Google Drive from Virtual Space at any time.",
        "Revoke Virtual Space's access through your Google Account settings.",
        "Request deletion of personal information associated with your account.",
        "Contact us with questions or requests regarding your personal information.",
      ],
    ],
  },
  {
    title: "8. Data Deletion",
    body: [
      "You may request deletion of your personal information and data associated with your use of Virtual Space by contacting: zukhra.akylbek23uni@gmail.com",
      "When legally and technically possible, we will delete the requested information within a reasonable period.",
      "You can also revoke Virtual Space's access to Google Drive through your Google Account settings. Once access is revoked, Virtual Space will no longer be able to access your Google Drive through that authorization.",
    ],
  },
  {
    title: "9. Children's Privacy",
    body: [
      "Virtual Space is not intended for children under the age of 13.",
      "We do not knowingly collect personal information from children under 13.",
    ],
  },
  {
    title: "10. Changes to This Privacy Policy",
    body: [
      "We may update this Privacy Policy from time to time.",
      "If we make material changes, we will update the “Last updated” date displayed at the top of this page.",
      "We encourage users to periodically review this Privacy Policy.",
    ],
  },
  {
    title: "11. Contact Us",
    body: [
      "If you have questions, concerns, or requests regarding this Privacy Policy or the processing of your personal information, please contact us:",
      "Virtual Space",
      "Website: https://ai-virtualspace.com",
      "Email: zukhra.akylbek23uni@gmail.com",
    ],
  },
];

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 py-10 sm:py-16">
        <Link
          to="/"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition"
        >
          <ArrowLeft className="h-4 w-4" /> Home
        </Link>

        <h1 className="mt-6 font-display text-3xl sm:text-5xl text-foreground">Privacy Policy</h1>
        <p className="mt-3 text-sm text-muted-foreground">Last updated: August 29, 2026</p>

        <div className="mt-8 space-y-4 text-[15px] leading-relaxed text-muted-foreground">
          <p>Welcome to Virtual Space.</p>
          <p>
            This Privacy Policy explains how Virtual Space (“we,” “our,” or “the App”) collects, uses, stores, and
            protects information when you use our platform and connect your Google account or Google Drive.
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
        </div>
      </div>
    </div>
  );
}
