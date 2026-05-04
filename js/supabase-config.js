'use strict';

const SUPABASE_URL = 'https://yraotjbgoecyokrlcjvj.supabase.co';

const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlyYW90amJnb2VjeW9rcmxjanZqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc3NTkwMTAsImV4cCI6MjA5MzMzNTAxMH0._buTXfXtDyzKbZoeD_BqGqK485_ubOtTj7e0sBwqhTY';

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

window.supabaseClient = supabaseClient;

console.log('✅ Supabase conectado');