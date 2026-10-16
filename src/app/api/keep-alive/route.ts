import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export async function GET() {
  const timestamp = new Date().toISOString();

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({
      status: 'error',
      message: 'Supabase credentials are not configured in environment variables.',
      timestamp
    }, { status: 500 });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Consulta mínima no Supabase para registrar atividade e evitar pausa por inatividade (7 dias)
    const { data, error } = await supabase.from('matches').select('id').limit(1);

    return NextResponse.json({
      status: 'ok',
      message: 'Supabase keep-alive executado com sucesso! Projeto ativo.',
      database_connected: !error,
      error: error ? error.message : null,
      timestamp
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'error',
      message: err?.message || 'Falha ao conectar com o Supabase',
      timestamp
    }, { status: 500 });
  }
}
