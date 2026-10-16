import { NextResponse } from 'next/server';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const ESPN_BASE_URL = "https://site.api.espn.com/apis/site/v2/sports/soccer";

const ALL_LEAGUES_SLUGS = [
  "uefa.champions",
  "conmebol.libertadores",
  "eng.1",
  "bra.1",
  "esp.1",
  "ger.1",
  "ita.1"
];

function getSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseServiceKey);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get("secret");

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ 
      error: "Supabase credentials are not configured in environment variables." 
    }, { status: 500 });
  }

  try {
    // 1. Fetch current active matchweek for all tracked leagues
    const promises = ALL_LEAGUES_SLUGS.map((slug) =>
      axios.get(`${ESPN_BASE_URL}/${slug}/scoreboard`, {
        params: { lang: "pt", region: "br", _t: Date.now() }
      }).then(res => ({
        slug,
        events: res.data.events
      })).catch(() => null)
    );

    const results = await Promise.all(promises);
    let upsertData: any[] = [];

    results.forEach((res) => {
      if (res && res.events) {
        const eventsForDb = res.events.map((e: any) => ({
          id: e.id,
          league_slug: res.slug,
          status_state: e.status.type.state,
          date: new Date(e.date).toISOString(),
          data: e,
          updated_at: new Date().toISOString()
        }));
        upsertData = [...upsertData, ...eventsForDb];
      }
    });

    if (upsertData.length > 0) {
      // 2. Upsert into Supabase `matches` table
      // It matches by 'id' (Primary Key)
      const { error } = await supabase
        .from('matches')
        .upsert(upsertData, { onConflict: 'id' });

      if (error) {
        console.error("Supabase upsert error:", error);
        throw error;
      }
    } else {
      // Keep-alive touch: registra atividade no banco mesmo em horários sem jogos
      try {
        await supabase.from('matches').select('id').limit(1);
      } catch (err) {
        console.warn("Keep-alive touch warning:", err);
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Synced ${upsertData.length} matches to Supabase successfully.` 
    });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
