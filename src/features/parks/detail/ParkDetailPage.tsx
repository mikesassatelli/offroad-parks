"use client";

import { useState, useEffect } from "react";
import { PhotoGallery } from "@/components/parks/PhotoGallery";
import { PhotoUploadForm } from "@/components/parks/PhotoUploadForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Park } from "@/lib/types";
import { Camera, Check, CheckCircle, Clock, MapPin, MessageSquare, Pencil, Share2, Star, StarOff } from "lucide-react";
import { SessionProvider, useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ParkAttributesCards } from "./components/ParkAttributesCards";
import { ParkContactSidebar } from "./components/ParkContactSidebar";
import { ParkOperationalCard } from "./components/ParkOperationalCard";
import { ParkOverviewCard } from "./components/ParkOverviewCard";
import { CampingInfoCard } from "./components/CampingInfoCard";
import { ParkMapHero } from "@/components/parks/ParkMapHero";
import Image from "next/image";
import { ParkAlertsBanner, type ParkAlertDisplay } from "@/components/parks/ParkAlertsBanner";
import { WeatherCard } from "@/components/parks/WeatherCard";
import { WeatherAlertsBanner } from "@/components/parks/WeatherAlertsBanner";
import type {
  CurrentConditions,
  DailyForecast,
  WeatherAlert,
} from "@/lib/weather/types";
import { ReviewList, ReviewForm, StarRating, DifficultyRating } from "@/components/reviews";
import { TrailConditionsDisplay } from "@/features/trail-conditions/TrailConditionsDisplay";
import { useReviews } from "@/hooks/useReviews";
import { useParkReview } from "@/hooks/useParkReview";
import { AppHeader } from "@/components/layout/AppHeader";
import { useSignInPrompt } from "@/components/auth/SignInPromptProvider";
import { useFavorites } from "@/hooks/useFavorites";
import { formatDate } from "@/lib/formatting";
import { ParkClaimCTA } from "./components/ParkClaimCTA";
import { SuggestCorrectionDialog } from "./components/SuggestCorrectionDialog";
import { findTrailOverlay } from "./trailOverlays";
import type { TrailFeatureCollection } from "@/features/map/components/TrailOverlay";

// Dynamically import map to avoid SSR issues
const MapView = dynamic(
  /* v8 ignore next */
  () => import("@/features/map/MapView").then((mod) => mod.MapView),
  { ssr: false },
);

interface Photo {
  id: string;
  url: string;
  caption: string | null;
  createdAt: Date;
  user: {
    name: string | null;
    email: string | null;
  } | null;
  userId: string | null;
}

interface ParkDetailPageProps {
  park: Park;
  photos: Photo[];
  currentUserId?: string;
  isAdmin?: boolean;
  /** DB id of the park — used to build the admin edit link. */
  parkDbId?: string;
  existingClaim?: { status: string; reviewNotes: string | null } | null;
  isOperatorOfPark?: boolean;
  operatorName?: string | null;
  alerts?: ParkAlertDisplay[];
  /** OP-53: server-fetched current conditions. Null when unavailable. */
  weatherCurrent?: CurrentConditions | null;
  /** OP-53: server-fetched 5-day forecast. Empty when unavailable. */
  weatherForecast?: DailyForecast[];
  /** OP-54: server-fetched active NWS alerts. Empty when none / unavailable. */
  weatherAlerts?: WeatherAlert[];
}

function ParkDetailPageInner({
  park,
  photos,
  currentUserId,
  isAdmin,
  parkDbId,
  existingClaim,
  isOperatorOfPark,
  operatorName,
  alerts,
  weatherCurrent,
  weatherForecast,
  weatherAlerts,
}: ParkDetailPageProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { promptSignIn } = useSignInPrompt();
  const { isFavorite, toggleFavorite } = useFavorites();
  const [showReviewForm, setShowReviewForm] = useState(false);
  // Controlled tab state (lets other controls jump the user between tabs).
  const [activeTab, setActiveTab] = useState("overview");
  // Share control: prefer the native Web Share API; otherwise copy the URL to
  // the clipboard and show a transient "Copied!" confirmation.
  const [shareCopied, setShareCopied] = useState(false);
  const handleShare = async () => {
    const url = window.location.href;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: park.name, url });
      } catch {
        /* user dismissed the share sheet or it failed — no-op */
      }
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      /* clipboard unavailable — leave state unchanged */
    }
  };

  // Trail-geometry overlay for the Location tab. Source priority:
  //   1. DB — park.trailGeometry.geojson (ParkTrailGeometry table).
  //   2. Fallback — a bundled static GeoJSON matched by park name
  //      (./trailOverlays), which keeps rendering if the DB row is absent.
  // Point *markers* (trailheads / rec areas) come from park.mapMarkers.
  const trailOverlayCfg = findTrailOverlay(park.name);
  const dbTrailGeometry =
    (park.trailGeometry?.geojson as TrailFeatureCollection | undefined) ?? null;
  const overlayUrl = !dbTrailGeometry
    ? (trailOverlayCfg?.geojsonUrl ?? null)
    : null;
  const [fetchedOverlay, setFetchedOverlay] =
    useState<TrailFeatureCollection | null>(null);
  useEffect(() => {
    if (!overlayUrl) return;
    let cancelled = false;
    fetch(overlayUrl)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled) setFetchedOverlay(data);
      })
      .catch(() => {
        /* overlay is best-effort; leave it unset on failure */
      });
    return () => {
      cancelled = true;
    };
  }, [overlayUrl]);
  const activeTrailOverlay =
    dbTrailGeometry ?? (overlayUrl ? fetchedOverlay : null);

  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: session.user.role,
      }
    : null;

  // Review hooks
  const { reviews, pagination, isLoading: reviewsLoading, setPage, refresh: refreshReviews } = useReviews({ parkSlug: park.id });
  const {
    userReview,
    isLoading: userReviewLoading,
    createReview,
    updateReview,
    deleteReview,
    loadUserReview,
  } = useParkReview(park.id);

  // Load user's review on mount
  useEffect(() => {
    if (session?.user) {
      loadUserReview();
    }
  }, [session?.user, loadUserReview]);

  const handlePhotoUploadSuccess = () => {
    router.refresh();
  };

  const handleReviewSubmit = async (data: Parameters<typeof createReview>[0]) => {
    let result;
    if (userReview) {
      result = await updateReview(data);
    } else {
      result = await createReview(data);
    }
    if (result.success) {
      setShowReviewForm(false);
      setPage(1);
      refreshReviews();
      loadUserReview();
    }
    return result;
  };

  const handleDeleteReview = async () => {
    if (confirm("Are you sure you want to delete your review?")) {
      const result = await deleteReview();
      if (result.success) {
        setPage(1);
        refreshReviews();
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20">
        <AppHeader user={user} showBackButton />
      </div>

      {/* Park Title Section */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground break-words">
                {park.name}
              </h1>
              <div className="flex items-center gap-2 text-muted-foreground mt-2">
                <MapPin className="w-4 h-4" />
                <span>
                  {park.address.city ? `${park.address.city}, ` : ""}
                  {park.address.state}
                </span>
              </div>
              {park.lastResearchedAt && (
                <p className="text-xs text-muted-foreground mt-1">
                  Last verified {formatDate(park.lastResearchedAt)}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Favorite (star) toggle. Keyed by park slug (park.id). The
                  hook handles the signed-out sign-in prompt internally. */}
              <Button
                size="icon"
                variant={isFavorite(park.id) ? "default" : "secondary"}
                onClick={() => toggleFavorite(park.id)}
                aria-pressed={isFavorite(park.id)}
                aria-label={
                  isFavorite(park.id)
                    ? "Remove from favorites"
                    : "Add to favorites"
                }
              >
                {isFavorite(park.id) ? (
                  <Star className="w-4 h-4 fill-current" />
                ) : (
                  <StarOff className="w-4 h-4" />
                )}
              </Button>
              {/* Share: native share sheet where supported, else copy-link. */}
              <Button
                size="icon"
                variant="secondary"
                onClick={handleShare}
                aria-label="Share this park"
              >
                {shareCopied ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Share2 className="w-4 h-4" />
                )}
                <span className="sr-only">
                  {shareCopied ? "Copied!" : "Share"}
                </span>
              </Button>
              {/* Contextual edit action: admins jump straight to the admin
                  editor; everyone else gets the data-correction modal (the
                  "Help keep this listing accurate" card is retired — photos
                  are collected via the Photos tab + reviews instead). */}
              {isAdmin && parkDbId ? (
                <Button asChild variant="outline" size="sm">
                  <Link
                    href={`/admin/parks/${parkDbId}/edit`}
                    aria-label="Edit in Admin"
                  >
                    <Pencil className="w-4 h-4" />
                    Edit in Admin
                  </Link>
                </Button>
              ) : (
                <SuggestCorrectionDialog
                  parkSlug={park.id}
                  parkName={park.name}
                  triggerLabel="Suggest an edit"
                />
              )}
            </div>
          </div>
          {(park.averageRating || park.averageDifficulty || park.averageTerrain || park.averageFacilities) && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4">
              {park.averageRating && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Overall:</span>
                  <StarRating rating={park.averageRating} size="md" />
                </div>
              )}
              {park.averageTerrain && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Terrain:</span>
                  <StarRating rating={park.averageTerrain} size="md" />
                </div>
              )}
              {park.averageFacilities && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Facilities:</span>
                  <StarRating rating={park.averageFacilities} size="md" />
                </div>
              )}
              {park.averageDifficulty && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Difficulty:</span>
                  <DifficultyRating rating={Math.round(park.averageDifficulty)} size="md" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* OP-54: NWS severe-weather alerts. Renders above operator alerts
            because weather can be life-safety; operator messaging is
            generally informational. Self-hides when no Severe+ alert. */}
        {weatherAlerts && weatherAlerts.length > 0 && (
          <div className="mb-4">
            <WeatherAlertsBanner alerts={weatherAlerts} />
          </div>
        )}
        {alerts && alerts.length > 0 && (
          <div className="mb-6">
            <ParkAlertsBanner alerts={alerts} />
          </div>
        )}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content with Tabs. `min-w-0` lets this grid column shrink
              below its content's intrinsic width on mobile — without it the
              column grows to the widest child (e.g. the tab bar / cards) and
              pushes the whole page past the viewport. */}
          <div className="lg:col-span-2 min-w-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full justify-start mb-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="photos">
                  Photos ({photos.length})
                </TabsTrigger>
                <TabsTrigger value="reviews">
                  Reviews ({park.reviewCount ?? 0})
                </TabsTrigger>
                {park.coords && (
                  <TabsTrigger value="location">Location</TabsTrigger>
                )}
              </TabsList>

              {/* Overview Tab */}
              {/* Main column is pure park data. Glanceable/reference info
                  (weather, trail conditions, contact, claim) lives in the
                  sidebar rail. */}
              <TabsContent value="overview" className="space-y-6">
                <ParkOverviewCard park={park} />
                <ParkAttributesCards park={park} />
                <ParkOperationalCard park={park} />
                <CampingInfoCard park={park} />
              </TabsContent>

              {/* Photos Tab */}
              <TabsContent value="photos" className="space-y-6">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Camera className="w-5 h-5" />
                        Photo Gallery ({photos.length})
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <PhotoGallery
                      photos={photos}
                      currentUserId={currentUserId}
                      isAdmin={isAdmin}
                    />
                  </CardContent>
                </Card>

                {session?.user ? (
                  <PhotoUploadForm
                    parkSlug={park.id}
                    onSuccess={handlePhotoUploadSuccess}
                  />
                ) : (
                  <div className="text-center py-6 px-4 border border-dashed border-border rounded-lg bg-muted/30 space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {photos.length === 0
                        ? "Been here? Add the first photos of this park."
                        : "Been here? Share your own photos of this park."}
                    </p>
                    <Button
                      size="sm"
                      onClick={() =>
                        promptSignIn({
                          description:
                            "Sign in to add your photos of this park.",
                        })
                      }
                    >
                      Sign in to add photos
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Reviews Tab */}
              <TabsContent value="reviews">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5" />
                        Reviews ({park.reviewCount || 0})
                      </CardTitle>
                      {session?.user && !userReview && !showReviewForm && (
                        <Button onClick={() => setShowReviewForm(true)} size="sm">
                          Write a Review
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Signed-out prompt to contribute a review */}
                    {!session?.user && (
                      <div className="text-center py-6 px-4 border border-dashed border-border rounded-lg bg-muted/30 space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Been here? Sign in to rate this park and share your
                          experience.
                        </p>
                        <Button
                          size="sm"
                          onClick={() =>
                            promptSignIn({
                              description:
                                "Sign in to write a review and rate this park.",
                            })
                          }
                        >
                          Sign in to write a review
                        </Button>
                      </div>
                    )}

                    {/* User's own review or form */}
                    {session?.user && (showReviewForm || userReview) && (
                      <div className="border-b pb-6">
                        {showReviewForm ? (
                          <ReviewForm
                            initialData={userReview}
                            onSubmit={handleReviewSubmit}
                            onCancel={() => setShowReviewForm(false)}
                            isSubmitting={userReviewLoading}
                          />
                        ) : userReview ? (
                          <div>
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-sm font-medium">Your Review</h4>
                              {userReview.status === "PENDING" ? (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                  <Clock className="w-3 h-3" />
                                  Pending Approval
                                </span>
                              ) : userReview.status === "APPROVED" ? (
                                <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                  <CheckCircle className="w-3 h-3" />
                                  Approved
                                </span>
                              ) : null}
                            </div>
                            <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                              {/* Ratings */}
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground">Overall</span>
                                  <StarRating rating={userReview.overallRating} size="sm" />
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Terrain</span>
                                  <StarRating rating={userReview.terrainRating} size="sm" />
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Facilities</span>
                                  <StarRating rating={userReview.facilitiesRating} size="sm" />
                                </div>
                                <div>
                                  <span className="text-muted-foreground">Difficulty</span>
                                  <DifficultyRating rating={userReview.difficultyRating} size="sm" />
                                </div>
                              </div>

                              {/* Title */}
                              {userReview.title && (
                                <p className="font-medium text-sm">{userReview.title}</p>
                              )}

                              {/* Body */}
                              <p className="text-sm whitespace-pre-wrap">{userReview.body}</p>

                              {/* Actions */}
                              <div className="flex gap-2 pt-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setShowReviewForm(true)}
                                >
                                  Edit Review
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={handleDeleteReview}
                                >
                                  Delete
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>
                    )}

                    {/* Reviews list */}
                    {reviewsLoading ? (
                      <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-32 bg-muted animate-pulse rounded" />
                        ))}
                      </div>
                    ) : (
                      <ReviewList
                        reviews={reviews}
                        pagination={pagination}
                        onPageChange={setPage}
                      />
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Location Tab — only rendered when coords exist */}
              {park.coords && (
                <TabsContent value="location">
                  <Card>
                    <CardHeader>
                      <CardTitle>Location</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {/* `fitOnVisible` fixes the Leaflet "centered too far
                          north" bug: the Tabs panel isn't sized at MapView
                          mount, so Leaflet caches stale container
                          dimensions. The handler re-invalidates size + sets
                          the view on the park's coords once the container
                          stabilises. `containerClassName` overrides MapView's
                          default full-viewport height so the map respects
                          the surrounding Card layout. `alwaysShowLabel`
                          forces the park name tooltip to render regardless
                          of zoom — the default `fitOnVisibleZoom` of 8 is
                          below the search map's label threshold (9) and
                          there is only one marker so there is no overlap
                          risk. */}
                      {/* When a trail overlay is configured for this park we
                          frame the map on the trail network (initialCenter/
                          Zoom) instead of the single park pin, and render the
                          trail lines + point markers on top. Otherwise the map
                          keeps its original single-park behaviour. */}
                      <MapView
                        parks={[park]}
                        trailOverlay={activeTrailOverlay}
                        mapMarkers={park.mapMarkers}
                        fitOnVisible={!trailOverlayCfg}
                        initialCenter={trailOverlayCfg?.center}
                        initialZoom={trailOverlayCfg?.zoom}
                        alwaysShowLabel
                        containerClassName="h-96 w-full rounded-lg overflow-hidden border shadow-sm"
                      />
                      {/* Trail-geometry provenance / attribution. Shown only
                          when the DB row carries a source name. */}
                      {park.trailGeometry?.sourceName && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          Trail data: {park.trailGeometry.sourceName}
                          {park.trailGeometry.license
                            ? ` (${park.trailGeometry.license})`
                            : ""}
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>
              )}
            </Tabs>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 min-w-0">
            <div className="sticky top-20 space-y-6">
              {/* Sidebar header image. Source priority mirrors the park
                  card (OP-90 + operator hero selection):
                    1. Operator-chosen photo (resolved server-side into
                       `park.heroImage`) when heroSource is PHOTO, or the
                       first APPROVED photo when AUTO.
                    2. Generated/live map hero when heroSource is MAP, or
                       AUTO with no approved photos.
                    3. Nothing when neither is available. */}
              {park.heroImage ? (
                <div className="rounded-lg border border-border shadow-sm overflow-hidden bg-card">
                  <div className="relative h-48 w-full bg-muted">
                    <Image
                      src={park.heroImage}
                      alt={park.name}
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 33vw"
                    />
                  </div>
                </div>
              ) : (
                (park.mapHeroUrl || park.coords) && (
                  <div className="rounded-lg border border-border shadow-sm overflow-hidden bg-card">
                    <ParkMapHero park={park} size="card" />
                  </div>
                )
              )}
              {/* Weather sits high (above Contact) so it clears the fold.
                  Self-hides for parks without coords / NWS coverage. */}
              <WeatherCard
                current={weatherCurrent ?? null}
                forecast={weatherForecast ?? []}
              />
              {/* Contact / directions — a primary reference box. */}
              <ParkContactSidebar park={park} />
              {/* Trail conditions: compact, community-reported, usually empty —
                  fine low in the rail rather than taking prime content space. */}
              <TrailConditionsDisplay parkSlug={park.id} />
              {/* Operator claim flow as its own slim card. */}
              <ParkClaimCTA
                parkSlug={park.id}
                isLoggedIn={!!session?.user}
                hasOperator={park.hasOperator}
                existingClaim={existingClaim}
                isOperatorOfPark={isOperatorOfPark}
                operatorName={operatorName}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export function ParkDetailPage(props: ParkDetailPageProps) {
  return (
    <SessionProvider>
      <ParkDetailPageInner {...props} />
    </SessionProvider>
  );
}
