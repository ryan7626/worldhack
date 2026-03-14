const MARBLE_API_BASE = "https://api.worldlabs.ai/marble/v1";

function getApiKey(): string {
  const key = process.env.MARBLE_API_KEY;
  if (!key) throw new Error("MARBLE_API_KEY environment variable is required");
  return key;
}

function headers() {
  return {
    "WLT-Api-Key": getApiKey(),
    "Content-Type": "application/json",
  };
}

export interface PrepareUploadResponse {
  media_asset: {
    id: string;
    upload_url: string;
    upload_method: string;
    required_headers: Record<string, string>;
  };
}

export async function prepareMediaUpload(
  fileName: string,
  kind: "image" | "video",
  extension: string
): Promise<PrepareUploadResponse> {
  const res = await fetch(`${MARBLE_API_BASE}/media-assets:prepare_upload`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify({ file_name: fileName, kind, extension }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Marble prepare upload failed: ${res.status} ${text}`);
  }
  return res.json();
}

export async function uploadMediaFile(
  uploadUrl: string,
  uploadMethod: string,
  requiredHeaders: Record<string, string>,
  fileBuffer: Buffer
): Promise<void> {
  const res = await fetch(uploadUrl, {
    method: uploadMethod,
    headers: requiredHeaders,
    body: new Uint8Array(fileBuffer),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Marble file upload failed: ${res.status} ${text}`);
  }
}

export async function generateWorldFromImage(
  mediaAssetId: string,
  displayName: string,
  textPrompt?: string
): Promise<{ operationId: string }> {
  const body: Record<string, unknown> = {
    display_name: displayName,
    model: "Marble 0.1-mini",
    world_prompt: {
      type: "image",
      image_prompt: {
        source: "media_asset",
        media_asset_id: mediaAssetId,
      },
    },
  };

  if (textPrompt) {
    (body.world_prompt as Record<string, unknown>).text_prompt = textPrompt;
  }

  const res = await fetch(`${MARBLE_API_BASE}/worlds:generate`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Marble world generation failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  // The response contains an operation object with a name like "operations/{id}"
  const operationName = data.name || data.id;
  const operationId = operationName.includes("/")
    ? operationName.split("/").pop()
    : operationName;
  return { operationId };
}

export async function generateWorldFromUrl(
  imageUrl: string,
  displayName: string,
  textPrompt?: string
): Promise<{ operationId: string }> {
  const body: Record<string, unknown> = {
    display_name: displayName,
    model: "Marble 0.1-mini",
    world_prompt: {
      type: "image",
      image_prompt: {
        source: "uri",
        uri: imageUrl,
      },
    },
  };

  if (textPrompt) {
    (body.world_prompt as Record<string, unknown>).text_prompt = textPrompt;
  }

  const res = await fetch(`${MARBLE_API_BASE}/worlds:generate`, {
    method: "POST",
    headers: headers(),
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Marble world generation failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  const operationName = data.name || data.id;
  const operationId = operationName.includes("/")
    ? operationName.split("/").pop()
    : operationName;
  return { operationId };
}

export async function pollOperation(
  operationId: string
): Promise<{ done: boolean; world?: MarbleWorldResponse }> {
  const res = await fetch(
    `${MARBLE_API_BASE}/operations/${operationId}`,
    { headers: { "WLT-Api-Key": getApiKey() } }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Marble poll failed: ${res.status} ${text}`);
  }

  const data = await res.json();

  if (data.done && data.response) {
    return {
      done: true,
      world: {
        id: data.response.id,
        displayName: data.response.display_name,
        worldMarbleUrl: data.response.world_marble_url,
        thumbnailUrl: data.response.assets?.thumbnail_url,
        panoramaUrl: data.response.assets?.imagery?.pano_url,
        caption: data.response.assets?.caption,
      },
    };
  }

  return { done: false };
}

export interface MarbleWorldResponse {
  id: string;
  displayName: string;
  worldMarbleUrl: string;
  thumbnailUrl?: string;
  panoramaUrl?: string;
  caption?: string;
}

export async function generateWorldFromImageFile(
  fileBuffer: Buffer,
  fileName: string,
  displayName: string,
  textPrompt?: string
): Promise<{ operationId: string }> {
  const ext = fileName.split(".").pop() || "jpg";

  // Step 1: Prepare upload
  const prepared = await prepareMediaUpload(fileName, "image", ext);

  // Step 2: Upload file
  await uploadMediaFile(
    prepared.media_asset.upload_url,
    prepared.media_asset.upload_method,
    prepared.media_asset.required_headers,
    fileBuffer
  );

  // Step 3: Generate world
  return generateWorldFromImage(
    prepared.media_asset.id,
    displayName,
    textPrompt
  );
}
