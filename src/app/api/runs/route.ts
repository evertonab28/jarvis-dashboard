import { NextRequest, NextResponse } from "next/server";

const NOCODB_URL = process.env.NOCODB_URL || "http://localhost:8080";
const NOCODB_TOKEN = process.env.NOCODB_TOKEN;

// NocoDB Table and Project IDs
const PROJECT_ID = "pqy4tca0bm5w50o";
const RUNS_TABLE_ID = "miiorrg0wrrvbzx";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      workflow_type,
      project_name,
      input_type,
      input_text,
      objective,
      constraints,
      source_type,
      source_url,
      uploaded_file_name,
      source_path,
      run_folder,
      source_folder,
    } = body;

    // 1. Validation Logic
    if (!workflow_type) {
      return NextResponse.json(
        { success: false, error: "workflow_type is required" },
        { status: 400 }
      );
    }

    if (workflow_type === "novo_sistema") {
      if (input_type !== "brief") {
        return NextResponse.json(
          { success: false, error: "novo_sistema requires input_type = 'brief'" },
          { status: 400 }
        );
      }
      if (!project_name) {
        return NextResponse.json(
          { success: false, error: "project_name is required for novo_sistema" },
          { status: 400 }
        );
      }
    } else if (workflow_type === "sistema_existente") {
      if (input_type !== "zip" && input_type !== "github") {
        return NextResponse.json(
          {
            success: false,
            error: "sistema_existente requires input_type = 'zip' or 'github'",
          },
          { status: 400 }
        );
      }
    }

    if (input_type === "github" && !source_url) {
      return NextResponse.json(
        { success: false, error: "source_url is required for github input" },
        { status: 400 }
      );
    }

    // 2. Automatic Field Generation
    const timestamp = new Date().toISOString().split("T")[0];
    const generatedTitle = `Run - ${project_name || "Untitled"} - ${timestamp}`;

    if (!NOCODB_URL || !NOCODB_TOKEN) {
      return NextResponse.json(
        { success: false, error: "NocoDB credentials not configured" },
        { status: 500 }
      );
    }

    // 3. Prepare NocoDB Payload
    const nocoUrl = `${NOCODB_URL}/api/v3/data/${PROJECT_ID}/${RUNS_TABLE_ID}/records`;
    
    const payload = {
      workflow_type,
      project_name,
      input_type,
      input_text,
      objective,
      constraints,
      source_type,
      source_url,
      uploaded_file_name,
      source_path,
      run_folder,
      source_folder,
      status: "queued",
      current_step: "",
      error_message: "",
      Title: generatedTitle,
    };

    // 4. Save to NocoDB
    const response = await fetch(nocoUrl, {
      method: "POST",
      headers: {
        "xc-token": NOCODB_TOKEN,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { success: false, error: data.message || "Failed to create run in NocoDB" },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      data: data,
    });
  } catch (error: any) {
    console.error("Error in /api/runs:", error.message);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
