// POST /api/auth/login — Sign in with email + password

import { NextResponse } from "next/server";
import { withApiHandler, errors } from "@/lib/errors";
import { loginSchema } from "@/lib/validations";
import { createServerClient } from "@/lib/supabase/server";

export const POST = withApiHandler(async (req: Request) => {
  const body = await req.json();
  const { email, password } = loginSchema.parse(body);

  const supabase = await createServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.session) {
    throw errors.unauthorized("The Email or Password doesn't match our records.");
  }

  return NextResponse.json({
    session: {
      access_token: data.session.access_token,
      expires_at: data.session.expires_at,
    },
    user: {
      role: data.user?.user_metadata?.role ?? "parent",
    },
  });
});
