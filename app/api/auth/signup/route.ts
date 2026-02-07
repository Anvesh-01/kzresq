import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validation helpers
function validateEmail(email_id: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email_id);
}

function validatePhone(phone: string): boolean {
  const phoneRegex = /^[\d\s\-\+\(\)]+$/;
  return phoneRegex.test(phone) && phone.replace(/\D/g, '').length >= 10;
}

export async function POST(request: NextRequest) {
  try {
    // Check environment variables first
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error("Missing environment variables");
      return NextResponse.json(
        { error: "Server configuration error: Missing Supabase credentials" },
        { status: 500 }
      );
    }

    // Create Supabase client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Parse request body
    let body;
    try {
      body = await request.json();
    } catch (_e) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const {
      name,
      phone,
      email_id,
      password,
      bloodGroup,
      allergies,
      medicalConditions,
    } = body;

    // Validate required fields
    if (!name || !phone || !email_id || !password) {
      return NextResponse.json(
        { error: "Missing required fields: name, phone, email, and password are required" },
        { status: 400 }
      );
    }

    // Validate name length
    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: "Name must be at least 2 characters long" },
        { status: 400 }
      );
    }

    // Validate email format
    if (!validateEmail(email_id)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate phone format
    if (!validatePhone(phone)) {
      return NextResponse.json(
        { error: "Invalid phone number format" },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      );
    }

    // Check if user already exists by email
    const { data: existingUserByEmail } = await supabaseAdmin
      .from("users")
      .select("email_id")
      .eq("email_id", email_id.toLowerCase())
      .single();

    if (existingUserByEmail) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Check if user already exists by phone
    const { data: existingUserByPhone } = await supabaseAdmin
      .from("users")
      .select("phone_number")
      .eq("phone_number", phone.trim())
      .single();

    if (existingUserByPhone) {
      return NextResponse.json(
        { error: "An account with this phone number already exists" },
        { status: 409 }
      );
    }

    console.log(`Creating user account for email: ${email_id}`);

    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user into users table
    const { data: userData, error: dbError } = await supabaseAdmin
      .from("users")
      .insert([
        {
          name: name.trim(),
          phone_number: phone.trim(),
          email_id: email_id.trim().toLowerCase(),
          password: hashedPassword,
          blood_group: bloodGroup || null,
          allergies: allergies?.trim() || null,
          medical_conditions: medicalConditions?.trim() || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
      ])
      .select()
      .single();

    if (dbError) {
      console.error("Database error:", dbError);
      return NextResponse.json(
        { error: `Failed to create user: ${dbError.message}` },
        { status: 500 }
      );
    }

    console.log(`User created successfully with ID: ${userData.id}`);

    // Return success response (excluding password)
    return NextResponse.json(
      {
        success: true,
        message: "Account created successfully! You can now login.",
        user: {
          id: userData.id,
          email_id: userData.email_id,
          name: userData.name,
          phone_number: userData.phone_number,
        },
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("Unexpected signup error:", error);
    return NextResponse.json(
      {
        error: "An unexpected error occurred during signup. Please try again.",
        details: process.env.NODE_ENV === 'development' ? (error as Error).message : undefined
      },
      { status: 500 }
    );
  }
}

// Health check endpoint
export async function GET() {
  try {
    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json(
        {
          status: "error",
          message: "Missing environment variables",
          hasUrl: !!supabaseUrl,
          hasServiceKey: !!supabaseServiceKey
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        status: "ok",
        message: "Signup API is ready",
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    return NextResponse.json(
      {
        status: "error",
        message: (error as Error).message
      },
      { status: 500 }
    );
  }
}