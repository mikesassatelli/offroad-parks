"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, X, Check, AlertCircle, Loader2 } from "lucide-react";

interface ParkOption {
  id: string;
  name: string;
  slug: string;
  hasPhoto: boolean;
}

interface FileEntry {
  file: File;
  preview: string;
  parkId: string;
  caption: string;
}

export default function BulkPhotoUploadPage() {
  const [parks, setParks] = useState<ParkOption[]>([]);
  const [parksLoaded, setParksLoaded] = useState(false);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [uploading, setUploading] = useState(false);
  const [results, setResults] = useState<{
    uploaded: number;
    errors: number;
  } | null>(null);
  const [filterNoPhoto, setFilterNoPhoto] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load parks on first render
  const loadParks = useCallback(async () => {
    if (parksLoaded) return;
    try {
      const res = await fetch("/api/admin/parks/list");
      if (res.ok) {
        const data = await res.json();
        const parkList = data.parks.map((p: { id: string; name: string; slug: string; photoCount: number }) => ({
          id: p.id,
          name: p.name,
          slug: p.slug,
          hasPhoto: (p.photoCount ?? 0) > 0,
        }));
        setParks(parkList);
        setParksLoaded(true);
      }
    } catch (e) {
      console.error("Failed to load parks:", e);
    }
  }, [parksLoaded]);

  // Load parks on mount
  useState(() => {
    loadParks();
  });

  const filteredParks = filterNoPhoto
    ? parks.filter((p) => !p.hasPhoto)
    : parks;

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newEntries: FileEntry[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      parkId: "",
      caption: "",
    }));
    setEntries((prev) => [...prev, ...newEntries]);
    // Reset input so the same files can be re-selected
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files).filter((f) =>
      f.type.startsWith("image/"),
    );
    const newEntries: FileEntry[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
      parkId: "",
      caption: "",
    }));
    setEntries((prev) => [...prev, ...newEntries]);
  };

  const removeEntry = (index: number) => {
    setEntries((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const updateEntry = (index: number, updates: Partial<FileEntry>) => {
    setEntries((prev) =>
      prev.map((entry, i) => (i === index ? { ...entry, ...updates } : entry)),
    );
  };

  const assignAllToFirstAvailable = () => {
    // Auto-assign each photo to the next park without a photo
    const parksWithoutPhotos = parks.filter((p) => !p.hasPhoto);
    setEntries((prev) =>
      prev.map((entry, i) => ({
        ...entry,
        parkId: entry.parkId || parksWithoutPhotos[i]?.id || "",
      })),
    );
  };

  const handleUpload = async () => {
    const validEntries = entries.filter((e) => e.parkId);
    if (!validEntries.length) return;

    setUploading(true);
    setResults(null);

    try {
      const formData = new FormData();

      const mappings = validEntries.map((entry, index) => ({
        parkId: entry.parkId,
        fileIndex: index,
        caption: entry.caption || undefined,
      }));

      formData.append("mappings", JSON.stringify(mappings));
      validEntries.forEach((entry) => {
        formData.append("files", entry.file);
      });

      const res = await fetch("/api/admin/photos/bulk-upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok) {
        setResults({ uploaded: data.uploaded, errors: data.errors });
        // Remove successfully uploaded entries
        if (data.results) {
          const failedIndices = new Set(
            data.results
              .map((r: { success: boolean }, i: number) => (!r.success ? i : -1))
              .filter((i: number) => i >= 0),
          );
          setEntries((prev) =>
            prev.filter((_, i) => failedIndices.has(i)),
          );
          // Refresh parks list to update hasPhoto status
          setParksLoaded(false);
          loadParks();
        }
      } else {
        setResults({ uploaded: 0, errors: validEntries.length });
      }
    } catch (error) {
      console.error("Upload failed:", error);
      setResults({ uploaded: 0, errors: validEntries.length });
    } finally {
      setUploading(false);
    }
  };

  const readyCount = entries.filter((e) => e.parkId).length;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Bulk Photo Upload</h1>
        <p className="text-gray-600 mt-1">
          Upload photos for multiple parks at once. Photos are auto-approved.
        </p>
        {parks.length > 0 && (
          <p className="text-sm text-gray-500 mt-2">
            {parks.filter((p) => !p.hasPhoto).length} of {parks.length} parks
            have no photos.
          </p>
        )}
      </div>

      {/* Results banner */}
      {results && (
        <div
          className={`mb-6 p-4 rounded-lg border ${
            results.errors === 0
              ? "bg-green-50 border-green-200 text-green-800"
              : "bg-yellow-50 border-yellow-200 text-yellow-800"
          }`}
        >
          <div className="flex items-center gap-2">
            {results.errors === 0 ? (
              <Check className="w-5 h-5" />
            ) : (
              <AlertCircle className="w-5 h-5" />
            )}
            <span className="font-medium">
              {results.uploaded} photo{results.uploaded !== 1 ? "s" : ""}{" "}
              uploaded successfully.
              {results.errors > 0 &&
                ` ${results.errors} failed.`}
            </span>
          </div>
        </div>
      )}

      {/* Drop zone */}
      <div
        className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-gray-400 transition-colors cursor-pointer mb-6"
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <Upload className="w-10 h-10 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-600 font-medium">
          Drop images here or click to browse
        </p>
        <p className="text-gray-400 text-sm mt-1">
          JPEG, PNG, or WebP. Max 5MB each.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleFilesSelected}
        />
      </div>

      {/* Entries list */}
      {entries.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {entries.length} photo{entries.length !== 1 ? "s" : ""} selected
            </h2>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-600">
                <input
                  type="checkbox"
                  checked={filterNoPhoto}
                  onChange={(e) => setFilterNoPhoto(e.target.checked)}
                  className="rounded"
                />
                Show only parks without photos
              </label>
              <button
                onClick={assignAllToFirstAvailable}
                className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-md text-gray-700 transition-colors"
              >
                Auto-assign to parks without photos
              </button>
            </div>
          </div>

          <div className="space-y-3 mb-6">
            {entries.map((entry, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-3 bg-white border border-gray-200 rounded-lg"
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={entry.preview}
                    alt={entry.file.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* File info */}
                <div className="min-w-0 flex-shrink-0 w-36">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {entry.file.name}
                  </p>
                  <p className="text-xs text-gray-500">
                    {(entry.file.size / 1024 / 1024).toFixed(1)} MB
                  </p>
                </div>

                {/* Park selector */}
                <select
                  value={entry.parkId}
                  onChange={(e) =>
                    updateEntry(index, { parkId: e.target.value })
                  }
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a park...</option>
                  {filteredParks.map((park) => (
                    <option key={park.id} value={park.id}>
                      {park.name}
                      {!park.hasPhoto ? " (no photo)" : ""}
                    </option>
                  ))}
                </select>

                {/* Caption */}
                <input
                  type="text"
                  value={entry.caption}
                  onChange={(e) =>
                    updateEntry(index, { caption: e.target.value })
                  }
                  placeholder="Caption (optional)"
                  className="w-48 border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />

                {/* Remove */}
                <button
                  onClick={() => removeEntry(index)}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Upload button */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleUpload}
              disabled={uploading || readyCount === 0}
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Upload {readyCount} photo{readyCount !== 1 ? "s" : ""}
                </>
              )}
            </button>
            {readyCount < entries.length && (
              <p className="text-sm text-gray-500">
                {entries.length - readyCount} photo
                {entries.length - readyCount !== 1 ? "s" : ""} still need a park
                assigned.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
