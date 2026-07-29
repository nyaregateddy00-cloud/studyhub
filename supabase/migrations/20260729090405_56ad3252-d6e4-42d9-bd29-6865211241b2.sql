DROP POLICY IF EXISTS "notes_files_read" ON storage.objects;

CREATE POLICY "notes_files_read_own_or_public" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'notes'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM public.notes n
      WHERE n.is_public = true
        AND n.file_url IS NOT NULL
        AND (n.file_url = storage.objects.name OR n.file_url LIKE '%' || storage.objects.name)
    )
  )
);