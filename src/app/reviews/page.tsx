import { auth } from "@/lib/auth";
import { RecentReviews } from "./RecentReviews";

// Resolve the header user on the server so the navbar renders signed-in on the
// first paint. As a fully client page it previously derived the user from
// useSession, which flashed the signed-out navbar during navigation.
export default async function RecentReviewsPage() {
  const session = await auth();

  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: session.user.role,
      }
    : null;

  return <RecentReviews user={user} />;
}
