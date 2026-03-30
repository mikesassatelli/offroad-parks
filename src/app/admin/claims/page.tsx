"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, Building2, User, MapPin, Phone, Mail, MessageSquare } from "lucide-react";

type ClaimStatus = "PENDING" | "APPROVED" | "REJECTED";

interface ParkClaim {
  id: string;
  status: ClaimStatus;
  claimantName: string;
  claimantEmail: string;
  claimantPhone: string | null;
  businessName: string | null;
  message: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  createdAt: string;
  park: {
    id: string;
    name: string;
    slug: string;
    address: { city: string | null; state: string } | null;
  };
  user: {
    id: string;
    name: string | null;
    email: string | null;
    image: string | null;
  };
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AdminClaimsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const status = (searchParams.get("status") as ClaimStatus) || "PENDING";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [claims, setClaims] = useState<ParkClaim[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [rejectNotes, setRejectNotes] = useState<Record<string, string>>({});
  const [expandedReject, setExpandedReject] = useState<string | null>(null);

  const fetchClaims = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/claims?status=${status}&page=${page}&limit=20`
      );
      if (response.ok) {
        const data = await response.json();
        setClaims(data.claims);
        setPagination(data.pagination);
      }
    } catch (error) {
      console.error("Error fetching claims:", error);
    } finally {
      setIsLoading(false);
    }
  }, [status, page]);

  useEffect(() => {
    fetchClaims();
  }, [fetchClaims]);

  const handleStatusChange = (newStatus: string) => {
    router.push(`/admin/claims?status=${newStatus}&page=1`);
  };

  const handleApprove = async (claimId: string) => {
    setActionLoading(claimId);
    try {
      const response = await fetch(`/api/admin/claims/${claimId}/approve`, {
        method: "POST",
      });
      if (response.ok) {
        fetchClaims();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to approve claim");
      }
    } catch {
      alert("Failed to approve claim");
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (claimId: string) => {
    setActionLoading(claimId);
    try {
      const response = await fetch(`/api/admin/claims/${claimId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reviewNotes: rejectNotes[claimId] || "" }),
      });
      if (response.ok) {
        setExpandedReject(null);
        setRejectNotes((prev) => {
          const next = { ...prev };
          delete next[claimId];
          return next;
        });
        fetchClaims();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to reject claim");
      }
    } catch {
      alert("Failed to reject claim");
    } finally {
      setActionLoading(null);
    }
  };

  const statusBadgeVariant = (s: ClaimStatus) => {
    if (s === "APPROVED") return "default";
    if (s === "REJECTED") return "destructive";
    return "secondary";
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Park Claims</h1>
          <p className="text-gray-500 text-sm mt-1">
            Review and action park ownership claim requests
          </p>
        </div>
        <Badge variant="secondary" className="text-sm px-3 py-1">
          {pagination.total} total
        </Badge>
      </div>

      <Tabs value={status} onValueChange={handleStatusChange} className="mb-6">
        <TabsList>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="REJECTED">Rejected</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-gray-100 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : claims.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No {status.toLowerCase()} claims found.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {claims.map((claim) => (
            <Card key={claim.id} className="overflow-hidden">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <CardTitle className="text-base">
                        <a
                          href={`/parks/${claim.park.slug}`}
                          className="hover:underline text-blue-700"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {claim.park.name}
                        </a>
                      </CardTitle>
                      {claim.park.address && (
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3" />
                          {claim.park.address.city
                            ? `${claim.park.address.city}, `
                            : ""}
                          {claim.park.address.state}
                        </p>
                      )}
                    </div>
                  </div>
                  <Badge variant={statusBadgeVariant(claim.status)}>
                    {claim.status}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Claimant info */}
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-gray-700">
                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    <div>
                      <p className="font-medium">{claim.claimantName}</p>
                      {claim.businessName && (
                        <p className="text-xs text-gray-500">{claim.businessName}</p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Mail className="w-3.5 h-3.5 text-gray-400" />
                      <a
                        href={`mailto:${claim.claimantEmail}`}
                        className="hover:underline truncate"
                      >
                        {claim.claimantEmail}
                      </a>
                    </div>
                    {claim.claimantPhone && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Phone className="w-3.5 h-3.5 text-gray-400" />
                        <span>{claim.claimantPhone}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Message */}
                {claim.message && (
                  <div className="bg-gray-50 rounded-md px-3 py-2 flex gap-2">
                    <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-gray-700">{claim.message}</p>
                  </div>
                )}

                {/* Account info */}
                <p className="text-xs text-gray-400">
                  Account:{" "}
                  <span className="text-gray-600">
                    {claim.user.name || claim.user.email}
                  </span>{" "}
                  · Submitted {new Date(claim.createdAt).toLocaleDateString()}
                </p>

                {/* Review notes */}
                {claim.reviewNotes && (
                  <div className="text-xs text-gray-500 bg-yellow-50 border border-yellow-200 rounded px-3 py-2">
                    <span className="font-medium text-yellow-800">Admin note:</span>{" "}
                    {claim.reviewNotes}
                  </div>
                )}

                {/* Actions — only for PENDING */}
                {claim.status === "PENDING" && (
                  <div className="flex flex-col gap-2 pt-1">
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleApprove(claim.id)}
                        disabled={actionLoading === claim.id}
                        data-testid={`approve-${claim.id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        {actionLoading === claim.id ? "Processing…" : "Approve"}
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        className="flex-1"
                        onClick={() =>
                          setExpandedReject((v) => (v === claim.id ? null : claim.id))
                        }
                        disabled={actionLoading === claim.id}
                        data-testid={`reject-toggle-${claim.id}`}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                    </div>
                    {expandedReject === claim.id && (
                      <div className="space-y-2" data-testid={`reject-form-${claim.id}`}>
                        <textarea
                          className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background"
                          rows={2}
                          placeholder="Optional: reason for rejection (visible to admin only)"
                          value={rejectNotes[claim.id] || ""}
                          onChange={(e) =>
                            setRejectNotes((prev) => ({
                              ...prev,
                              [claim.id]: e.target.value,
                            }))
                          }
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          className="w-full"
                          onClick={() => handleReject(claim.id)}
                          disabled={actionLoading === claim.id}
                          data-testid={`reject-confirm-${claim.id}`}
                        >
                          Confirm Rejection
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() =>
              router.push(`/admin/claims?status=${status}&page=${page - 1}`)
            }
          >
            Previous
          </Button>
          <span className="flex items-center text-sm text-gray-600 px-3">
            Page {page} of {pagination.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pagination.totalPages}
            onClick={() =>
              router.push(`/admin/claims?status=${status}&page=${page + 1}`)
            }
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
