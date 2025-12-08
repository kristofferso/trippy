import { getUserSession } from "@/lib/session";
import { SiteHeader } from "@/components/site-header";
import { LandingPageContent } from "@/components/landing-page-content";

export default async function LandingPage() {
  const session = await getUserSession();
  const user = session?.user ? { email: session.user.email } : null;

  return (
    <>
      <SiteHeader user={user} />
      <LandingPageContent user={user} />
    </>
  );
}
