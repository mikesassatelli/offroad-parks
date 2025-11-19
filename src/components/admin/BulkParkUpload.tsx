"use client";

import { useState, useRef } from "react";
import * as Papa from "papaparse";
import { Button } from "@/components/ui/button";
import { ALL_TERRAIN_TYPES, ALL_AMENITIES, ALL_CAMPING_TYPES, ALL_VEHICLE_TYPES, US_STATES } from "@/lib/constants";
import type { Difficulty } from "@/lib/types";

// Difficulty levels array
const ALL_DIFFICULTY_LEVELS: Difficulty[] = [
  "easy",
  "moderate",
  "difficult",
  "extreme",
];

interface BulkParkInput {
  name: string;
  slug?: string;
  city?: string;
  state: string;
  latitude?: number | null;
  longitude?: number | null;
  website?: string;
  phone?: string;
  dayPassUSD?: number | null;
  milesOfTrails?: number | null;
  acres?: number | null;
  notes?: string;
  terrain: string[];
  difficulty: string[];
  amenities?: string[];
  vehicleTypes?: string[];
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

interface BulkUploadResult {
  success: boolean;
  created: number;
  errors: ValidationError[];
}

/**
 * Parses CSV array fields (e.g., "sand,mud,rocks" -> ["sand", "mud", "rocks"])
 */
function parseArrayField(value: string | undefined): string[] {
  if (!value || value.trim().length === 0) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

/**
 * Parses numeric fields from CSV (returns null if empty/invalid)
 */
function parseNumber(value: string | undefined): number | null {
  if (!value || value.trim().length === 0) {
    return null;
  }
  const num = parseFloat(value);
  return isNaN(num) ? null : num;
}

/**
 * Parses integer fields from CSV (returns null if empty/invalid)
 */
function parseInteger(value: string | undefined): number | null {
  if (!value || value.trim().length === 0) {
    return null;
  }
  const num = parseInt(value, 10);
  return isNaN(num) ? null : num;
}

/**
 * Downloads a CSV template file
 */
function downloadCSVTemplate() {
  const headers = [
    "name",
    "slug",
    "city",
    "state",
    "latitude",
    "longitude",
    "website",
    "phone",
    "dayPassUSD",
    "milesOfTrails",
    "acres",
    "notes",
    "terrain",
    "difficulty",
    "amenities",
    "camping",
    "vehicleTypes",
  ];

  const exampleRow = [
    "Example Offroad Park",
    "example-offroad-park",
    "Moab",
    "UT",
    "38.5733",
    "-109.5498",
    "https://example.com",
    "555-123-4567",
    "50",
    "100",
    "5000",
    "Great park with stunning views",
    "rocks,trails,hills",
    "moderate,difficult",
    "restrooms,fuel",
    "tent,rv30A,rv50A",
    "atv,sxs,motorcycle",
  ];

  const csv = Papa.unparse([headers, exampleRow]);
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "park-upload-template.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

export function BulkParkUpload() {
  const [parks, setParks] = useState<BulkParkInput[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<BulkUploadResult | null>(
    null
  );
  const [fileType, setFileType] = useState<"csv" | "json" | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Handles CSV file parsing
   */
  const handleCSVFile = (file: File) => {
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedParks: BulkParkInput[] = results.data.map((row) => ({
          name: row.name || "",
          slug: row.slug || undefined,
          city: row.city || undefined,
          state: row.state || "",
          latitude: parseNumber(row.latitude),
          longitude: parseNumber(row.longitude),
          website: row.website || undefined,
          phone: row.phone || undefined,
          dayPassUSD: parseNumber(row.dayPassUSD),
          milesOfTrails: parseInteger(row.milesOfTrails),
          acres: parseInteger(row.acres),
          notes: row.notes || undefined,
          terrain: parseArrayField(row.terrain),
          difficulty: parseArrayField(row.difficulty),
          amenities: parseArrayField(row.amenities),
          vehicleTypes: parseArrayField(row.vehicleTypes),
        }));

        setParks(parsedParks);
        setFileType("csv");
        setErrors([]);
        setUploadResult(null);
      },
      error: (error) => {
        setErrors([
          {
            row: 0,
            field: "file",
            message: `CSV parsing error: ${error.message}`,
          },
        ]);
      },
    });
  };

  /**
   * Handles JSON file parsing
   */
  const handleJSONFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target?.result as string);
        if (!Array.isArray(json)) {
          setErrors([
            {
              row: 0,
              field: "file",
              message: "JSON must be an array of park objects",
            },
          ]);
          return;
        }

        const parsedParks: BulkParkInput[] = json.map((park) => ({
          name: park.name || "",
          slug: park.slug,
          city: park.city,
          state: park.state || "",
          latitude: park.latitude ?? null,
          longitude: park.longitude ?? null,
          website: park.website,
          phone: park.phone,
          dayPassUSD: park.dayPassUSD ?? null,
          milesOfTrails: park.milesOfTrails ?? null,
          acres: park.acres ?? null,
          notes: park.notes,
          terrain: Array.isArray(park.terrain) ? park.terrain : [],
          difficulty: Array.isArray(park.difficulty) ? park.difficulty : [],
          amenities: Array.isArray(park.amenities) ? park.amenities : [],
          vehicleTypes: Array.isArray(park.vehicleTypes) ? park.vehicleTypes : [],
        }));

        setParks(parsedParks);
        setFileType("json");
        setErrors([]);
        setUploadResult(null);
      } catch (error) {
        setErrors([
          {
            row: 0,
            field: "file",
            message: `JSON parsing error: ${error instanceof Error ? error.message : "Invalid JSON"}`,
          },
        ]);
      }
    };
    reader.readAsText(file);
  };

  /**
   * Handles file input change
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split(".").pop()?.toLowerCase();

    if (fileExtension === "csv") {
      handleCSVFile(file);
    } else if (fileExtension === "json") {
      handleJSONFile(file);
    } else {
      setErrors([
        {
          row: 0,
          field: "file",
          message: "Invalid file type. Please upload a .csv or .json file",
        },
      ]);
    }
  };

  /**
   * Submits parks to the API
   */
  const handleSubmit = async () => {
    if (parks.length === 0) return;

    setIsUploading(true);
    setErrors([]);
    setUploadResult(null);

    try {
      const response = await fetch("/api/admin/parks/bulk-upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ parks }),
      });

      const result: BulkUploadResult = await response.json();
      setUploadResult(result);

      if (result.success) {
        // Clear form on success
        setParks([]);
        setFileType(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        setErrors(result.errors);
      }
    } catch (error) {
      setErrors([
        {
          row: 0,
          field: "system",
          message: `Upload failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ]);
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Resets the form
   */
  const handleReset = () => {
    setParks([]);
    setErrors([]);
    setUploadResult(null);
    setFileType(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold">Bulk Upload Parks</h2>
        <p className="text-muted-foreground mt-2">
          Upload multiple parks at once using CSV or JSON format. All uploaded
          parks will be automatically approved.
        </p>
      </div>

      {/* Download Template */}
      <div className="border rounded-lg p-4 bg-muted/50">
        <h3 className="font-semibold mb-2">CSV Template</h3>
        <p className="text-sm text-muted-foreground mb-3">
          Download a template file to see the required format and example data.
        </p>
        <Button
          type="button"
          variant="outline"
          onClick={downloadCSVTemplate}
          size="sm"
        >
          Download CSV Template
        </Button>
      </div>

      {/* Format Guide */}
      <div className="border rounded-lg p-4 space-y-3">
        <h3 className="font-semibold">Format Guide</h3>
        <div className="text-sm space-y-2">
          <div>
            <strong>Required fields:</strong> name, state, terrain (comma-separated), difficulty (comma-separated)
          </div>
          <div>
            <strong>Valid states:</strong> {US_STATES.join(", ")}
          </div>
          <div>
            <strong>Valid terrain types:</strong> {ALL_TERRAIN_TYPES.join(", ")}
          </div>
          <div>
            <strong>Valid difficulty levels:</strong> {ALL_DIFFICULTY_LEVELS.join(", ")}
          </div>
          <div>
            <strong>Valid amenities:</strong> {ALL_AMENITIES.join(", ")}
          </div>
          <div>
            <strong>Valid camping types:</strong> {ALL_CAMPING_TYPES.join(", ")}
          </div>
          <div>
            <strong>Valid vehicle types:</strong> {ALL_VEHICLE_TYPES.join(", ")}
          </div>
          <div>
            <strong>Array fields (CSV):</strong> Use comma-separated values
            (e.g., &quot;sand,mud,rocks&quot;)
          </div>
          <div>
            <strong>Array fields (JSON):</strong> Use arrays (e.g., [&quot;sand&quot;,
            &quot;mud&quot;, &quot;rocks&quot;])
          </div>
        </div>
      </div>

      {/* File Upload */}
      <div className="space-y-3">
        <label htmlFor="file-upload" className="block font-medium">
          Upload File
        </label>
        <input
          ref={fileInputRef}
          id="file-upload"
          type="file"
          accept=".csv,.json"
          onChange={handleFileChange}
          className="block w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
        />
        {fileType && (
          <p className="text-sm text-muted-foreground">
            Loaded {parks.length} park{parks.length !== 1 ? "s" : ""} from{" "}
            {fileType.toUpperCase()} file
          </p>
        )}
      </div>

      {/* Preview Table */}
      {parks.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <div className="bg-muted px-4 py-3 border-b">
            <h3 className="font-semibold">
              Preview ({parks.length} park{parks.length !== 1 ? "s" : ""})
            </h3>
          </div>
          <div className="overflow-x-auto max-h-96 overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 sticky top-0">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">#</th>
                  <th className="px-4 py-2 text-left font-medium">Name</th>
                  <th className="px-4 py-2 text-left font-medium">State</th>
                  <th className="px-4 py-2 text-left font-medium">Terrain</th>
                  <th className="px-4 py-2 text-left font-medium">
                    Difficulty
                  </th>
                  <th className="px-4 py-2 text-left font-medium">Coords</th>
                </tr>
              </thead>
              <tbody>
                {parks.map((park, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-4 py-2 text-muted-foreground">
                      {index + 1}
                    </td>
                    <td className="px-4 py-2 font-medium">{park.name}</td>
                    <td className="px-4 py-2">{park.state}</td>
                    <td className="px-4 py-2">
                      {park.terrain.join(", ") || (
                        <span className="text-destructive">Missing</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {park.difficulty.join(", ") || (
                        <span className="text-destructive">Missing</span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-muted-foreground">
                      {park.latitude && park.longitude
                        ? `${park.latitude.toFixed(4)}, ${park.longitude.toFixed(4)}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="border border-red-200 bg-red-50 rounded-lg p-4">
          <h3 className="font-semibold text-red-900 mb-2">
            Validation Errors ({errors.length})
          </h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-red-800">
            {errors.slice(0, 10).map((error, index) => (
              <li key={index}>
                <strong>Row {error.row}</strong> - {error.field}:{" "}
                {error.message}
              </li>
            ))}
            {errors.length > 10 && (
              <li className="text-red-600">
                ... and {errors.length - 10} more error
                {errors.length - 10 !== 1 ? "s" : ""}
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Success Message */}
      {uploadResult?.success && (
        <div className="border border-green-200 bg-green-50 rounded-lg p-4">
          <h3 className="font-semibold text-green-900 mb-2">
            Upload Successful!
          </h3>
          <p className="text-sm text-green-800">
            Successfully created {uploadResult.created} park
            {uploadResult.created !== 1 ? "s" : ""}. All parks have been
            automatically approved.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleSubmit}
          disabled={parks.length === 0 || isUploading}
          size="lg"
        >
          {isUploading
            ? "Uploading..."
            : `Upload ${parks.length} Park${parks.length !== 1 ? "s" : ""}`}
        </Button>
        <Button
          onClick={handleReset}
          variant="outline"
          disabled={isUploading}
          size="lg"
        >
          Reset
        </Button>
      </div>
    </div>
  );
}
