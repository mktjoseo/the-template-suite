import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Get these from your Supabase project settings!
const supabaseUrl = 'https://elmennxvqfxlznjzwhda.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVsbWVubnh2cWZ4bHpuanp3aGRhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ1NjAzMDgsImV4cCI6MjA3MDEzNjMwOH0.TJClXSeOgsiYUMtZG8wNBDBeELxME9z4CZ-V4XLffeU';

// Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);