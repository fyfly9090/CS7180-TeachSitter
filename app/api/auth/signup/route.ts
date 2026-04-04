import { NextResponse } from "next/server";
import { withApiHandler, errors } from "@/lib/errors";
import { signupSchema } from "@/lib/validations";
import { createServerClient } from "@/lib/supabase/server";

export const POST = withApiHandler(async (req) => {
  const { email, password, role, name } = signupSchema.parse(await req.json());
  const supabase = await createServerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { role, full_name: name ?? "" } },
  });

  if (error) throw error;
  if (!data.user) throw errors.internal();

  return NextResponse.json(
    { user: { id: data.user.id, email: data.user.email, role } },
    { status: 201 }
  );
});
