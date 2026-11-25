import { doc, getDocFromServer, runTransaction, serverTimestamp } from "firebase/firestore";
import { activeVersion, agreementRollout, legalDocuments } from "../content/legal/metadata";
import { auth, db } from "./firebase";

type Agreement =
  | { id: string; termsVersion: string; privacyPolicyVersion: string }
  | { id: string; communityGuidelinesVersion: string };

export function currentSignupAgreement(): Agreement | null {
  if (!agreementRollout.enabled) return null;
  const termsVersion = activeVersion(legalDocuments.terms);
  const privacyPolicyVersion = activeVersion(legalDocuments.privacy);
  if (!termsVersion || !privacyPolicyVersion) return null;
  return { id: `signup-${termsVersion}-${privacyPolicyVersion}`, termsVersion, privacyPolicyVersion };
}

export function currentReviewAgreement(): Agreement | null {
  if (!agreementRollout.enabled) return null;
  const communityGuidelinesVersion = activeVersion(legalDocuments.community);
  return communityGuidelinesVersion
    ? { id: `community-${communityGuidelinesVersion}`, communityGuidelinesVersion }
    : null;
}

function agreementRef(uid: string, agreement: Agreement) {
  if (!db || auth?.currentUser?.uid !== uid) throw new Error("AGREEMENT_AUTH_REQUIRED");
  return doc(db, "users", uid, "legalAgreements", agreement.id);
}

function matchesAgreement(data: Record<string, unknown> | undefined, agreement: Agreement) {
  if (!data) return false;
  return "termsVersion" in agreement
    ? data.termsVersion === agreement.termsVersion && data.privacyPolicyVersion === agreement.privacyPolicyVersion
      && !!data.termsAcceptedAt && !!data.privacyPolicyAcknowledgedAt
    : data.communityGuidelinesVersion === agreement.communityGuidelinesVersion && !!data.communityGuidelinesAcknowledgedAt;
}

export async function hasAgreement(uid: string, agreement: Agreement) {
  const snapshot = await getDocFromServer(agreementRef(uid, agreement));
  return matchesAgreement(snapshot.data(), agreement);
}

export async function recordAgreement(uid: string, requested: Agreement) {
  const agreement = "termsVersion" in requested ? currentSignupAgreement() : currentReviewAgreement();
  if (agreement?.id !== requested.id) throw new Error("AGREEMENT_VERSION_CHANGED");
  const ref = agreementRef(uid, agreement);
  await runTransaction(db, async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists()) {
      if (!matchesAgreement(existing.data(), agreement)) throw new Error("INVALID_AGREEMENT_RECORD");
      return;
    }
    if (auth?.currentUser?.uid !== uid) throw new Error("AGREEMENT_AUTH_REQUIRED");
    const timestamp = serverTimestamp();
    transaction.set(ref, "termsVersion" in agreement ? {
      termsVersion: agreement.termsVersion,
      termsAcceptedAt: timestamp,
      privacyPolicyVersion: agreement.privacyPolicyVersion,
      privacyPolicyAcknowledgedAt: timestamp,
    } : {
      communityGuidelinesVersion: agreement.communityGuidelinesVersion,
      communityGuidelinesAcknowledgedAt: timestamp,
    });
  });
}
