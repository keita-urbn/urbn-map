// lib/uploadImage.ts
import { getDownloadURL, ref } from "firebase/storage";
import { auth, storage } from "./firebase";

const FileSystem = require("expo-file-system/legacy") as {
  uploadAsync: (url: string, fileUri: string, options?: any) => Promise<{ status: number; body: string }>;
  FileSystemUploadType: { BINARY_CONTENT: number };
};

function extensionFromUri(uri: string) {
  const extension = uri.split(/[?#]/)[0].split(".").pop()?.toLowerCase();
  return extension && /^(jpe?g|png|webp|heic)$/i.test(extension) ? extension : "jpg";
}

function mimeTypeFromUri(uri: string) {
  switch (extensionFromUri(uri)) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "heic":
      return "image/heic";
    default:
      return "image/jpeg";
  }
}

export default async function uploadImage(
  uri: string,
  path = `shops/${Date.now()}/cover.${extensionFromUri(uri)}`
): Promise<string> {
  let stage = "auth";
  const extension = extensionFromUri(uri);
  const mimeType = mimeTypeFromUri(uri);
  const bucket = storage?.app?.options?.storageBucket ?? "urbn-map-5ef26.firebasestorage.app";

  console.log("[uploadImage] uri", uri);
  console.log("[uploadImage] source", {
    scheme: uri.match(/^([a-z][a-z\d+.-]*):/i)?.[1] ?? "unknown",
    mimeType,
    extension,
  });
  console.log("[uploadImage] target", {
    bucket,
    path,
    uid: auth?.currentUser?.uid ?? null,
  });

  try {
    if (!auth?.currentUser) {
      throw new Error("Firebase auth user is required before Storage upload");
    }

    stage = "id token";
    const idToken = await auth.currentUser.getIdToken();
    if (!idToken) {
      throw new Error("Firebase ID token is empty");
    }

    const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(path)}`;

    stage = "native upload";
    const uploadResult = await FileSystem.uploadAsync(uploadUrl, uri, {
      httpMethod: "POST",
      uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
      headers: {
        Authorization: `Bearer ${idToken}`,
        "Content-Type": mimeType,
      },
    });

    console.log("[uploadImage] upload response", {
      status: uploadResult?.status,
      body: uploadResult?.body,
      path,
      bucket,
      mimeType,
    });

    if (uploadResult.status < 200 || uploadResult.status >= 300) {
      throw new Error(
        `Storage upload failed: status=${uploadResult.status}, body=${uploadResult.body}, path=${path}, bucket=${bucket}, mimeType=${mimeType}`
      );
    }

    stage = "storage ref";
    const imageRef = ref(storage, path);

    stage = "download URL";
    return await getDownloadURL(imageRef);
  } catch (error: any) {
    console.error("[uploadImage] failed", {
      stage,
      path,
      bucket,
      mimeType,
      code: error?.code,
      message: error?.message,
      name: error?.name,
      serverResponse: error?.serverResponse,
      customData: error?.customData,
    });
    throw error;
  }
}

