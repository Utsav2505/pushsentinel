import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import streamifier from "streamifier";
export const dynamic = "force-dynamic";

interface UploadResponse {
  url: string; // or whatever other properties it has
}

cloudinary.config({
  cloud_name: "dp2cgqs14",
  api_key: "397893488711772",
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  try {
    const body = await req.formData();
    const file = body.get("image") as File;
    const type = body.get("type");
    //do work here

    const buffer = Buffer.from(await file.arrayBuffer());
    const uploadResponse = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "image" },
        (error, result) => {
          if (error) {
            reject(new Error(`Cloudinary upload error: ${error.message}`));
          }
          resolve(result);
        }
      );

      streamifier.createReadStream(buffer).pipe(uploadStream);
    });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ success: false });
  }
}
