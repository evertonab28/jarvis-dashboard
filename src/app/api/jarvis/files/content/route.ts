import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import os from "os";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const filePath = searchParams.get("path");

  if (!filePath) {
    return NextResponse.json({ success: false, error: "Missing file path" }, { status: 400 });
  }

  try {
    // Resolve home directory if ~ is used
    let resolvedPath = filePath;
    if (filePath.startsWith("~")) {
      resolvedPath = path.join(os.homedir(), filePath.slice(1));
    }

    // Security check: Ensure the path is within the allowed output directory
    const allowedDir = path.join(os.homedir(), "jarvis-runner/output");
    const absoluteFilePath = path.resolve(resolvedPath);

    if (!absoluteFilePath.startsWith(allowedDir)) {
      console.warn(`Unauthorized file access attempt: ${absoluteFilePath}`);
      return NextResponse.json({ success: false, error: "Unauthorized access path" }, { status: 403 });
    }

    // Check if file exists
    try {
      await fs.access(absoluteFilePath);
    } catch {
      return NextResponse.json({ success: false, error: "File not found" }, { status: 404 });
    }

    // Read content
    const content = await fs.readFile(absoluteFilePath, "utf-8");

    return NextResponse.json({
      success: true,
      data: {
        path: filePath,
        content: content,
      }
    });
  } catch (error: any) {
    console.error("Error reading artifact file:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
