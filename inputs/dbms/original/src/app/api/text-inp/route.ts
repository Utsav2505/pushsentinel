import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { prompt, type } = await req.json();
    //do work here
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: false });
  }
}
