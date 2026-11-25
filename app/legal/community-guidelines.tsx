import LegalDocumentScreen from "../../components/legal/LegalDocumentScreen";
import { legalDocuments } from "../../content/legal/metadata";

export default function LegalRoute() {
  return <LegalDocumentScreen document={legalDocuments.community} />;
}
