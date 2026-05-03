'use strict';

/* ══════════════════════════════════════════════
   SUPABASE-CONFIG.JS — configuração do cliente Supabase
   Substitua SUPABASE_URL e SUPABASE_ANON_KEY pelos
   valores do seu projeto em supabase.com
══════════════════════════════════════════════ */

'use strict';

const SUPABASE_URL = '';
const SUPABASE_ANON_KEY = '';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
