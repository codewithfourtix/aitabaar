import Landing from "./pages/Landing";
import Consent from "./pages/Consent";
import BusinessForm from "./pages/BusinessForm";
import DocumentUpload from "./pages/DocumentUpload";
import ReviewSubmit from "./pages/ReviewSubmit";
import Confirmation from "./pages/Confirmation";
import OfficerQueue from "./pages/OfficerQueue";
import ApplicationDetail from "./pages/ApplicationDetail";
import WhatsAppBot from "./pages/WhatsAppBot";
import Configure from "./pages/Configure";
import { useState } from "react";

type Page =
  | "landing"
  | "consent"
  | "business"
  | "documents"
  | "review"
  | "confirmation"
  | "status"
  | "queue"
  | "detail"
  | "whatsapp"
  | "configure";

export default function App() {
  const [navState, setNavState] = useState<{ page: Page; params?: any }>({
    page: "landing",
  });

  const nav = (p: string, params?: any) => setNavState({ page: p as Page, params });

  switch (navState.page) {
    case "landing":      return <Landing onNav={nav} />;
    case "consent":      return <Consent onNav={nav} />;
    case "business":     return <BusinessForm onNav={nav} />;
    case "documents":    return <DocumentUpload onNav={nav} />;
    case "review":       return <ReviewSubmit onNav={nav} />;
    case "confirmation": return <Confirmation onNav={nav} />;
    case "status":       return <Confirmation onNav={nav} />;
    case "queue":        return <OfficerQueue onNav={nav} />;
    case "detail":       return <ApplicationDetail onNav={nav} appId={navState.params?.appId} />;
    case "whatsapp":     return <WhatsAppBot onNav={nav} />;
    case "configure":    return <Configure onNav={nav} />;
    default:             return <Landing onNav={nav} />;
  }
}
