import { NextResponse } from 'next/server'
import { withApiHandler } from '@/lib/errors'
import { loginSchema } from '@/lib/validations'
import { createServerClient } from '@/lib/supabase/server'

export const POST = withApiHandler(async (req) => {
  const { email, password } = loginSchema.parse(await req.json())
  const supabase = await createServerClient()

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) throw error

  return NextResponse.json({
    session: {
      access_token: data.session.access_token,
      expires_at: data.session.expires_at,
    },
  })
})
