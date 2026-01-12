-- Storage bucket setup for Supabase
-- Run this in Supabase SQL Editor after creating the bucket in the dashboard

-- Create storage bucket for images
-- Note: This is usually done through Supabase Dashboard > Storage > New Bucket

-- After creating the 'images' bucket, set it to public and add these policies:

-- Allow public read access to images
CREATE POLICY "Public read access for images"
ON storage.objects FOR SELECT
USING (bucket_id = 'images');

-- Allow authenticated users to upload images
CREATE POLICY "Admin can upload images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'images' 
  AND (auth.role() = 'service_role' OR auth.role() = 'authenticated')
);

-- Allow admin to delete images
CREATE POLICY "Admin can delete images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'images' 
  AND (auth.role() = 'service_role' OR auth.role() = 'authenticated')
);
