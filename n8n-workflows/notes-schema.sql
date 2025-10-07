-- Database schema for Notes and Folders
-- Run this to create the notes and folders tables in Neon

-- Folders table
CREATE TABLE IF NOT EXISTS folders (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  parent_id VARCHAR(50) REFERENCES folders(id) ON DELETE CASCADE,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Notes table
CREATE TABLE IF NOT EXISTS notes (
  id VARCHAR(50) PRIMARY KEY,
  title VARCHAR(500) NOT NULL DEFAULT 'Untitled',
  content TEXT NOT NULL DEFAULT '',
  folder_id VARCHAR(50) REFERENCES folders(id) ON DELETE SET NULL,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_folders_parent_id ON folders(parent_id);
CREATE INDEX IF NOT EXISTS idx_folders_updated_at ON folders(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_notes_folder_id ON notes(folder_id);
CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC);

-- View for folder hierarchy
CREATE OR REPLACE VIEW folder_tree AS
WITH RECURSIVE folder_hierarchy AS (
  -- Base case: root folders
  SELECT 
    id,
    name,
    parent_id,
    created_at,
    updated_at,
    0 as depth,
    ARRAY[id] as path
  FROM folders
  WHERE parent_id IS NULL
  
  UNION ALL
  
  -- Recursive case: child folders
  SELECT 
    f.id,
    f.name,
    f.parent_id,
    f.created_at,
    f.updated_at,
    fh.depth + 1,
    fh.path || f.id
  FROM folders f
  INNER JOIN folder_hierarchy fh ON f.parent_id = fh.id
)
SELECT * FROM folder_hierarchy
ORDER BY path;

-- View for notes with folder info
CREATE OR REPLACE VIEW notes_with_folders AS
SELECT 
  n.id,
  n.title,
  n.content,
  n.folder_id,
  n.created_at,
  n.updated_at,
  f.name as folder_name,
  f.parent_id as folder_parent_id
FROM notes n
LEFT JOIN folders f ON n.folder_id = f.id
ORDER BY n.updated_at DESC;

-- Function to get all descendant folder IDs (for cascade delete)
CREATE OR REPLACE FUNCTION get_descendant_folders(folder_id_param VARCHAR(50))
RETURNS TABLE(descendant_id VARCHAR(50)) AS $$
BEGIN
  RETURN QUERY
  WITH RECURSIVE descendants AS (
    SELECT id FROM folders WHERE id = folder_id_param
    UNION ALL
    SELECT f.id FROM folders f
    INNER JOIN descendants d ON f.parent_id = d.id
  )
  SELECT id FROM descendants WHERE id != folder_id_param;
END;
$$ LANGUAGE plpgsql;

-- Sample queries for testing

-- Get all root folders
-- SELECT * FROM folders WHERE parent_id IS NULL ORDER BY name;

-- Get all notes in a specific folder
-- SELECT * FROM notes WHERE folder_id = 'folder_xxx' ORDER BY updated_at DESC;

-- Get folder hierarchy
-- SELECT * FROM folder_tree;

-- Get notes with folder information
-- SELECT * FROM notes_with_folders LIMIT 10;

-- Count notes per folder
-- SELECT 
--   COALESCE(f.name, 'No Folder') as folder_name,
--   COUNT(n.id) as note_count
-- FROM folders f
-- LEFT JOIN notes n ON f.id = n.folder_id
-- GROUP BY f.id, f.name
-- ORDER BY note_count DESC;
