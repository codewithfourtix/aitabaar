import OfficerQueue from "./pages/OfficerQueue";
import ApplicationDetail from "./pages/ApplicationDetail";
import WhatsAppBot from "./pages/WhatsAppBot";
import { useState } from "react";

type Page = "queue" | "detail" | "whatsapp";

export default function App() {
  const [navState, setNavState] = useState<{ page: Page; params?: any }>({
    page: "queue",
  });

  const nav = (p: string, params?: any) => setNavState({ page: p as Page, params });

  switch (navState.page) {
    case "detail":   return <ApplicationDetail onNav={nav} appId={navState.params?.appId} />;
    case "whatsapp": return <WhatsAppBot onNav={nav} />;
    case "queue":
    default:          return <OfficerQueue onNav={nav} />;
  }
}
