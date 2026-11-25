import terms from "./terms";
import privacy from "./privacy";
import communityGuidelines from "./communityGuidelines";

export type LegalDocument = {
  id: "terms" | "privacy" | "community-guidelines";
  sourceTitle: string;
  title: string;
  heading: string;
  version: string;
  effectiveDate: string | null;
  lastUpdatedDate: string | null;
  status: "draft" | "published";
  source: string;
};

const draft = { version: "1.0", effectiveDate: null, lastUpdatedDate: null, status: "draft" } as const;
export const legalDocuments = {
  terms: { ...draft, id: "terms", sourceTitle: "URBn 利用規約", title: "利用規約", heading: "TERMS OF SERVICE", source: terms },
  privacy: { ...draft, id: "privacy", sourceTitle: "URBn Privacy Policy", title: "プライバシーポリシー", heading: "PRIVACY POLICY", source: privacy },
  community: { ...draft, id: "community-guidelines", sourceTitle: "URBn Community Guidelines", title: "コミュニティガイドライン", heading: "COMMUNITY GUIDELINES", source: communityGuidelines },
} satisfies Record<string, LegalDocument>;

export const legalLinks = [
  { title: legalDocuments.terms.title, href: "/legal/terms" },
  { title: legalDocuments.privacy.title, href: "/legal/privacy" },
  { title: legalDocuments.community.title, href: "/legal/community-guidelines" },
  { title: "お問い合わせ", href: "/support" },
] as const;

export const supportConfig: { email: string | null } = { email: null };

export function supportEmailLink(email: string | null, subject: string) {
  const address = email?.trim();
  return address && /^[A-Z0-9._+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(address)
    ? `mailto:${address}?subject=${encodeURIComponent(subject)}`
    : null;
}

// Enable only after the approved rules, effective versions and staged rollout are verified.
export const agreementRollout = { enabled: false };

export function activeVersion(document: LegalDocument, now = Date.now()) {
  const validDate = (value: string | null) => {
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(value);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  };
  if (document.status !== "published" || !validDate(document.effectiveDate)
    || !validDate(document.lastUpdatedDate) || !/^\d+(\.\d+)*$/.test(document.version)) return null;
  return now >= Date.parse(`${document.effectiveDate}T00:00:00+09:00`) ? document.version : null;
}

export function legalBlocks(source: string) {
  return source.trim().split("\n").flatMap((line) => {
    if (!line) return [];
    const heading = /^(#{2,3}) (.+)$/.exec(line);
    if (heading) return [{ kind: heading[1].length === 2 ? "heading" : "subheading", text: heading[2] }];
    if (line === "---") return [{ kind: "rule", text: "" }];
    if (/^(-|\d+\.) /.test(line)) return [{ kind: "list", text: line.replace(/^- /, "• ") }];
    return [{ kind: "paragraph", text: line }];
  });
}
