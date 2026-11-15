import { UPLOAD_IMAGE_MUTATION } from "./operations";
import type { UploadResult } from "../generated/graphql";

export type GraphQLErrorCode =
  | "BAD_USER_INPUT"
  | "UNAUTHENTICATED"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "TOO_MANY_REQUESTS"
  | "INTERNAL_SERVER_ERROR"
  | "NETWORK_ERROR";

export interface ValidationDetail {
  field: string;
  message: string;
}

export class ApiError extends Error {
  readonly code: GraphQLErrorCode;
  readonly details: ValidationDetail[];

  constructor(message: string, code: GraphQLErrorCode = "INTERNAL_SERVER_ERROR", details: ValidationDetail[] = []) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.details = details;
  }
}

type UnauthenticatedHandler = () => void;
let onUnauthenticatedCallback: UnauthenticatedHandler | null = null;

export function setOnUnauthenticated(handler: UnauthenticatedHandler | null): void {
  onUnauthenticatedCallback = handler;
}

interface RawGraphQLError {
  message?: string;
  extensions?: {
    code?: string;
    details?: ValidationDetail[];
  };
}

interface RawGraphQLResponse<T> {
  data?: T;
  errors?: RawGraphQLError[];
}

function parseGraphQLErrors(
  errors: RawGraphQLError[],
  suppressUnauthenticatedRedirect = false
): ApiError {
  const first = errors[0] ?? {};
  const code = (first.extensions?.code as GraphQLErrorCode) || "INTERNAL_SERVER_ERROR";
  const details = Array.isArray(first.extensions?.details) ? first.extensions!.details : [];
  const message = first.message || "Error al procesar la solicitud en el servidor.";

  if (code === "UNAUTHENTICATED" && !suppressUnauthenticatedRedirect && onUnauthenticatedCallback) {
    onUnauthenticatedCallback();
  }

  return new ApiError(message, code, details);
}

export async function graphqlRequest<TData, TVariables = Record<string, unknown>>(
  query: string,
  variables?: TVariables,
  options?: { suppressUnauthenticatedRedirect?: boolean }
): Promise<TData> {
  let response: Response;
  try {
    response = await fetch("/graphql", {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query,
        variables: variables ?? {},
      }),
    });
  } catch {
    throw new ApiError("No se pudo conectar con el servidor (/graphql).", "NETWORK_ERROR");
  }

  let payload: RawGraphQLResponse<TData>;
  try {
    payload = (await response.json()) as RawGraphQLResponse<TData>;
  } catch {
    throw new ApiError(`Respuesta inválida del servidor (HTTP ${response.status}).`, "INTERNAL_SERVER_ERROR");
  }

  if (payload.errors && payload.errors.length > 0) {
    throw parseGraphQLErrors(payload.errors, options?.suppressUnauthenticatedRedirect);
  }

  if (!payload.data) {
    throw new ApiError("La respuesta GraphQL no contiene datos.", "INTERNAL_SERVER_ERROR");
  }

  return payload.data;
}

/**
 * Sube una imagen usando el GraphQL multipart request spec y XMLHttpRequest
 * para exponer progreso real de subida en el cliente.
 */
export function uploadImageWithProgress(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/graphql", true);
    xhr.withCredentials = true;

    xhr.upload.onprogress = (event: ProgressEvent) => {
      if (event.lengthComputable && onProgress) {
        const percent = Math.min(100, Math.max(0, Math.round((event.loaded / event.total) * 100)));
        onProgress(percent);
      }
    };

    xhr.onerror = () => {
      reject(new ApiError("Error de red durante la subida de la imagen.", "NETWORK_ERROR"));
    };

    xhr.onabort = () => {
      reject(new ApiError("Subida cancelada.", "BAD_USER_INPUT"));
    };

    xhr.onload = () => {
      let payload: RawGraphQLResponse<{ uploadImage: UploadResult }>;
      try {
        payload = JSON.parse(xhr.responseText) as RawGraphQLResponse<{ uploadImage: UploadResult }>;
      } catch {
        reject(new ApiError(`Respuesta inválida al subir imagen (HTTP ${xhr.status}).`, "INTERNAL_SERVER_ERROR"));
        return;
      }

      if (payload.errors && payload.errors.length > 0) {
        reject(parseGraphQLErrors(payload.errors));
        return;
      }

      if (!payload.data?.uploadImage) {
        reject(new ApiError("No se recibió el resultado de la imagen subida.", "INTERNAL_SERVER_ERROR"));
        return;
      }

      if (onProgress) {
        onProgress(100);
      }
      resolve(payload.data.uploadImage);
    };

    const operations = JSON.stringify({
      query: UPLOAD_IMAGE_MUTATION,
      variables: { file: null },
    });
    const map = JSON.stringify({ "0": ["variables.file"] });

    const formData = new FormData();
    formData.append("operations", operations);
    formData.append("map", map);
    formData.append("0", file, file.name);

    xhr.send(formData);
  });
}

/**
 * Resuelve URLs relativas (/uploads/...) contra el origen actual para previsualización,
 * preservando URLs absolutas (http/https/data/blob).
 */
export function resolveAssetUrl(url: string | null | undefined): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (
    trimmed.startsWith("http://") ||
    trimmed.startsWith("https://") ||
    trimmed.startsWith("data:") ||
    trimmed.startsWith("blob:")
  ) {
    return trimmed;
  }
  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  if (typeof window !== "undefined" && window.location?.origin) {
    return `${window.location.origin}${normalizedPath}`;
  }
  return normalizedPath;
}
