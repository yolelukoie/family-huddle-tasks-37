-- Create reports table for content moderation
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  reporter_id uuid NOT NULL,
  family_id uuid REFERENCES public.families(id) ON DELETE CASCADE,
  content_id uuid NOT NULL,
  content_type text NOT NULL DEFAULT 'task_template',
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending'
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert their own reports
CREATE POLICY "Users can insert their own reports"
ON public.reports
FOR INSERT
TO authenticated
WITH CHECK (reporter_id = auth.uid());

-- Users can view their own reports
CREATE POLICY "Users can view their own reports"
ON public.reports
FOR SELECT
TO authenticated
USING (reporter_id = auth.uid());

-- Create index for efficient querying
CREATE INDEX idx_reports_content_id ON public.reports(content_id);
CREATE INDEX idx_reports_reporter_id ON public.reports(reporter_id);
CREATE INDEX idx_reports_family_id ON public.reports(family_id);