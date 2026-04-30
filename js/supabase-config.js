'use strict';

/* ══════════════════════════════════════════════
   SUPABASE-CONFIG.JS — configuração do cliente Supabase
   Substitua SUPABASE_URL e SUPABASE_ANON_KEY pelos
   valores do seu projeto em supabase.com
══════════════════════════════════════════════ */

'use strict';

const SUPABASE_URL = 'https://zrjixyasidkomvrmepcy.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_8T-opzsiTMuDoO59qkUxow_h83E2S50';

const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
