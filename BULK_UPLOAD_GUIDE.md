# Bulk Park Upload Guide

## Overview

The Bulk Park Upload feature allows admin users to upload multiple parks at once using CSV or JSON files. All uploaded parks are automatically approved.

## Accessing the Feature

1. Sign in as an admin user
2. Navigate to `/admin/parks/bulk-upload`
3. Or click **Bulk Upload** in the admin sidebar navigation

## CSV Format

### Required Fields
- `name` - Park name (max 100 characters)
- `state` - Two-letter state code (e.g., UT, CO, AZ)
- `terrain` - Comma-separated terrain types
- `difficulty` - Comma-separated difficulty levels

### Optional Fields
- `slug` - Custom URL slug (auto-generated if not provided)
- `city` - City name
- `latitude` - Latitude coordinate (-90 to 90)
- `longitude` - Longitude coordinate (-180 to 180)
- `website` - Park website URL
- `phone` - Phone number (any format, will be sanitized)
- `dayPassUSD` - Day pass price in USD
- `milesOfTrails` - Total trail miles (integer)
- `acres` - Park size in acres (integer)
- `notes` - Additional notes (max 2000 characters)
- `amenities` - Comma-separated amenity types
- `camping` - Comma-separated camping types
- `vehicleTypes` - Comma-separated vehicle types

### Valid Values

**Terrain Types:**
- sand
- rocks
- mud
- trails
- hills

**Difficulty Levels:**
- easy
- moderate
- difficult
- extreme

**Amenity Types:**
- restrooms
- showers
- food
- fuel
- repair

**Camping Types:**
- tent
- rv30A
- rv50A
- fullHookup
- cabin
- groupSite
- backcountry

**Vehicle Types:**
- motorcycle
- atv
- sxs
- fullSize

**States:**
All US states as two-letter codes (e.g., UT, CO, AZ, CA, etc.)

### CSV Example

```csv
name,slug,city,state,latitude,longitude,website,phone,dayPassUSD,milesOfTrails,acres,notes,terrain,difficulty,amenities,camping,vehicleTypes
Example Offroad Park,example-offroad-park,Moab,UT,38.5733,-109.5498,https://example.com,555-123-4567,50,100,5000,Great park with stunning views,"rocks,trails,hills","moderate,difficult","restrooms,fuel","tent,rv30A,rv50A","atv,sxs,motorcycle"
Desert Adventure Park,,Phoenix,AZ,33.4484,-112.0740,,,25,50,2000,Perfect for beginners,sand,easy,"restrooms,food",tent,"atv,motorcycle"
Mountain Trails Park,mountain-trails,Denver,CO,,,https://mountaintrails.com,555-987-6543,,,3000,,"trails,hills","moderate,difficult,extreme",,cabin,sxs
```

## JSON Format

JSON files should contain an array of park objects:

```json
[
  {
    "name": "Example Offroad Park",
    "slug": "example-offroad-park",
    "city": "Moab",
    "state": "UT",
    "latitude": 38.5733,
    "longitude": -109.5498,
    "website": "https://example.com",
    "phone": "555-123-4567",
    "dayPassUSD": 50,
    "milesOfTrails": 100,
    "acres": 5000,
    "notes": "Great park with stunning views",
    "terrain": ["rocks", "trails", "hills"],
    "difficulty": ["moderate", "difficult"],
    "amenities": ["restrooms", "fuel"],
    "camping": ["tent", "rv30A", "rv50A"],
    "vehicleTypes": ["atv", "sxs", "motorcycle"]
  },
  {
    "name": "Desert Adventure Park",
    "city": "Phoenix",
    "state": "AZ",
    "latitude": 33.4484,
    "longitude": -112.0740,
    "dayPassUSD": 25,
    "milesOfTrails": 50,
    "acres": 2000,
    "notes": "Perfect for beginners",
    "terrain": ["sand"],
    "difficulty": ["easy"],
    "amenities": ["restrooms", "food"],
    "camping": ["tent"],
    "vehicleTypes": ["atv", "motorcycle"]
  }
]
```

## Upload Process

1. **Download Template** (optional)
   - Click "Download CSV Template" to get a pre-formatted example file

2. **Prepare Your File**
   - Use CSV or JSON format
   - Ensure all required fields are present
   - Validate data against the format guide

3. **Upload File**
   - Click "Choose File" and select your CSV or JSON file
   - The system will parse and display a preview

4. **Review Preview**
   - Check the preview table to ensure data loaded correctly
   - Red "Missing" indicators show required fields that are empty

5. **Upload**
   - Click "Upload X Parks" button
   - Wait for validation and upload to complete

6. **Handle Errors**
   - If validation errors occur, they will be displayed with row numbers
   - Fix errors in your source file and re-upload

7. **Success**
   - Upon success, all parks are created with APPROVED status
   - Parks immediately appear in the admin parks list and public site

## Validation Rules

The system validates all data before insertion:

- **Name:** Required, max 100 characters
- **State:** Required, must be valid US state code
- **Terrain:** At least one required, all must be valid types
- **Difficulty:** At least one required, all must be valid levels
- **Amenities:** Optional, all must be valid types if provided
- **Camping:** Optional, all must be valid types if provided
- **Vehicle Types:** Optional, all must be valid types if provided
- **Website:** Must be valid URL format if provided
- **Phone:** Max 15 digits (formatting characters removed)
- **Coordinates:** Latitude must be -90 to 90, longitude -180 to 180
- **Numeric Fields:** Cannot be negative
- **Notes:** Max 2000 characters

## Tips

1. **Test with Small Batches:** Start with 1-2 parks to verify your format
2. **Use the Template:** Download and modify the CSV template for consistency
3. **Slugs:** Leave slug empty to auto-generate from park name
4. **Coordinates:** Include lat/long to enable map display features
5. **Phone Numbers:** Any format works (555-123-4567, (555) 123-4567, etc.)
6. **Array Fields in CSV:** Use comma-separated values: "sand,rocks,mud"
7. **Empty Fields:** Leave optional fields blank - they'll be stored as null

## Troubleshooting

**"No parks provided or invalid format"**
- Ensure your file contains valid CSV or JSON
- CSV must have headers in the first row
- JSON must be an array of objects

**"Park name is required"**
- Check for empty name fields
- Ensure CSV headers match exactly

**"Invalid state"**
- Use two-letter state codes (UT not Utah)
- Check for typos or invalid codes

**"At least one terrain type is required"**
- Terrain field cannot be empty
- In CSV, use comma-separated values
- In JSON, use an array with at least one item

**"Invalid terrain types" / "Invalid difficulty levels" / "Invalid amenities" / "Invalid camping types" / "Invalid vehicle types"**
- Check spelling matches exactly (lowercase for terrain/difficulty/amenities, camelCase for camping/vehicleTypes)
- Remove any invalid or custom values
- Refer to the valid values list above

## API Endpoint

**Endpoint:** `POST /api/admin/parks/bulk-upload`

**Authentication:** Required (Admin role)

**Request Body:**
```json
{
  "parks": [
    {
      "name": "string",
      "slug": "string (optional)",
      "city": "string (optional)",
      "state": "string",
      "latitude": number | null,
      "longitude": number | null,
      "website": "string (optional)",
      "phone": "string (optional)",
      "dayPassUSD": number | null,
      "milesOfTrails": number | null,
      "acres": number | null,
      "notes": "string (optional)",
      "terrain": ["string"],
      "difficulty": ["string"],
      "amenities": ["string"] (optional),
      "camping": ["string"] (optional),
      "vehicleTypes": ["string"] (optional)
    }
  ]
}
```

**Response:**
```json
{
  "success": boolean,
  "created": number,
  "errors": [
    {
      "row": number,
      "field": "string",
      "message": "string"
    }
  ]
}
```

## Implementation Details

- **Transaction-Based:** All parks in a batch are created atomically
- **Slug Generation:** Automatic slug generation with uniqueness checks
- **Phone Sanitization:** Non-digit characters automatically removed
- **Status:** All parks set to APPROVED (no review needed)
- **Submitter:** Admin user ID recorded as submitter
- **Relations:** Terrain, difficulty, amenities, camping, and vehicleTypes stored in junction tables

## File Locations

- **Page:** `/src/app/admin/parks/bulk-upload/page.tsx`
- **Component:** `/src/components/admin/BulkParkUpload.tsx`
- **API Route:** `/src/app/api/admin/parks/bulk-upload/route.ts`
- **Tests:**
  - `/test/app/api/admin/parks/bulk-upload/route.test.ts`
  - `/test/components/admin/BulkParkUpload.test.tsx`
