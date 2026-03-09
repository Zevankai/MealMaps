import { list, put } from "@vercel/blob";
import { NextResponse } from "next/server";

const BLOB_PATH = "mealmap-data-v2.json";
const defaults = {
  meals: [],
  calendar: {},
  groceryList: [],
  groceryChecked: {},
  family: [],
};

export async function GET() {
  try {
    const { blobs } = await list({ prefix: BLOB_PATH });
    if (blobs.length === 0) {
      return NextResponse.json(defaults);
    }
    const blob = blobs[0];
    const res = await fetch(blob.url);
    if (!res.ok) {
      return NextResponse.json(defaults);
    }
    const data = await res.json();
    return NextResponse.json({ ...defaults, ...data });
  } catch (err) {
    console.error("GET /api/data error:", err);
    return NextResponse.json(defaults);
  }
}

export async function PUT(request) {
  try {
    const data = await request.json();
    await put(BLOB_PATH, JSON.stringify(data), {
      access: "public",
      allowOverwrite: true,
      contentType: "application/json",
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PUT /api/data error:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
