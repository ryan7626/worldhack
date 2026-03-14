-- Photos Table
CREATE TABLE IF NOT EXISTS photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  date_taken TIMESTAMPTZ,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  width INTEGER,
  height INTEGER,
  location_name TEXT,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  uploaded_at TIMESTAMPTZ DEFAULT now(),
  storage_path TEXT,
  storage_url TEXT NOT NULL,
  camera_make TEXT,
  camera_model TEXT
);

-- Worlds Table (Reconstruction Archives)
CREATE TABLE IF NOT EXISTS worlds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  display_name TEXT NOT NULL,
  world_marble_url TEXT NOT NULL,
  status TEXT CHECK (status IN ('generating', 'completed', 'failed')),
  operation_id TEXT,
  thumbnail_url TEXT,
  panorama_url TEXT,
  caption TEXT,
  source_photo_id UUID REFERENCES photos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  asset_ids JSONB DEFAULT '{}' -- Store specific Marble asset IDs (mesh, splats, etc.)
);

-- Indices for search
CREATE INDEX IF NOT EXISTS idx_photos_date_taken ON photos(date_taken);
CREATE INDEX IF NOT EXISTS idx_photos_location ON photos(location_name);
CREATE INDEX IF NOT EXISTS idx_worlds_source_photo ON worlds(source_photo_id);
