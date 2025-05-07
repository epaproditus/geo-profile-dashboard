-- Create extension for UUID generation if it doesn't exist
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create policies table
CREATE TABLE IF NOT EXISTS public.policies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  locations JSONB DEFAULT '[]'::jsonb,
  ip_ranges JSONB DEFAULT '[]'::jsonb,
  devices JSONB DEFAULT '[]'::jsonb,
  profiles JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.policies ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to see only their own policies
CREATE POLICY "Users can only view their own policies" 
  ON public.policies 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy to allow users to insert only their own policies
CREATE POLICY "Users can only insert their own policies" 
  ON public.policies 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy to allow users to update only their own policies
CREATE POLICY "Users can only update their own policies" 
  ON public.policies 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policy to allow users to delete only their own policies
CREATE POLICY "Users can only delete their own policies" 
  ON public.policies 
  FOR DELETE 
  USING (auth.uid() = user_id);

-- Add triggers for updating the updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_policies_updated_at
BEFORE UPDATE ON public.policies
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();