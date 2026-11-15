import React, { useRef, useState } from "react";
import { ApiError, resolveAssetUrl, uploadImageWithProgress } from "../api/client";

const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const ALLOWED_EXTENSIONS = /\.(jpe?g|png|webp)$/i;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

export interface ImageUploaderProps {
  idPrefix: string;
  label: string;
  value: string;
  onChange: (url: string) => void;
  altLabel?: string;
  altValue?: string;
  onAltChange?: (alt: string) => void;
  helpText?: string;
}

export const ImageUploader: React.FC<ImageUploaderProps> = ({
  idPrefix,
  label,
  value,
  onChange,
  altLabel = "Texto alternativo (alt)",
  altValue,
  onAltChange,
  helpText,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [uploadMeta, setUploadMeta] = useState<{ width: number; height: number } | null>(null);

  const resolvedUrl = resolveAssetUrl(value);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError(null);
    setUploadMeta(null);

    // Validación en cliente de tipo y tamaño antes de iniciar la petición
    const validType = ALLOWED_MIME_TYPES.has(file.type) || ALLOWED_EXTENSIONS.test(file.name);
    if (!validType) {
      setError("Formato no válido. Solo se permiten imágenes JPG, PNG o WebP.");
      event.target.value = "";
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      const sizeMb = (file.size / (1024 * 1024)).toFixed(2);
      setError(`El archivo pesa ${sizeMb} MB y supera el límite máximo de 5 MB.`);
      event.target.value = "";
      return;
    }

    setUploading(true);
    setProgress(0);

    try {
      const result = await uploadImageWithProgress(file, (pct) => {
        setProgress(pct);
      });
      onChange(result.url);
      setUploadMeta({ width: result.width, height: result.height });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Error inesperado al subir la imagen.");
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className="image-uploader">
      <div className="field-row">
        <div className="field-group">
          <label className="field-label" htmlFor={`${idPrefix}-url`}>
            {label}
          </label>
          <div className="image-uploader__controls">
            <input
              id={`${idPrefix}-url`}
              type="text"
              className="field-input"
              value={value}
              onChange={(e) => {
                setError(null);
                onChange(e.target.value);
              }}
              placeholder="/uploads/ejemplo.webp o https://..."
            />
            <label
              htmlFor={`${idPrefix}-file`}
              className={`btn btn--secondary ${uploading ? "btn--disabled" : ""}`}
            >
              {uploading ? `Subiendo ${progress}%` : "Subir archivo"}
            </label>
            <input
              ref={fileInputRef}
              id={`${idPrefix}-file`}
              type="file"
              accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
              onChange={handleFileChange}
              disabled={uploading}
              className="sr-only"
            />
          </div>
          {helpText ? (
            <p className="field-help">{helpText}</p>
          ) : (
            <p className="field-help">JPG, PNG o WebP (máx. 5 MB). Se optimiza a WebP automáticamente.</p>
          )}
        </div>

        {onAltChange !== undefined && (
          <div className="field-group">
            <label className="field-label" htmlFor={`${idPrefix}-alt`}>
              {altLabel}
            </label>
            <input
              id={`${idPrefix}-alt`}
              type="text"
              className="field-input"
              value={altValue ?? ""}
              onChange={(e) => onAltChange(e.target.value)}
              placeholder="Descripción breve de la imagen"
            />
          </div>
        )}
      </div>

      {uploading && (
        <div className="upload-progress" aria-live="polite">
          <div
            className="upload-progress__bar"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Progreso de subida de imagen"
          >
            <div className="upload-progress__fill" style={{ width: `${progress}%` }} />
          </div>
          <span className="upload-progress__text">{progress}% completado</span>
        </div>
      )}

      {error && (
        <div className="alert alert--error" role="alert">
          {error}
        </div>
      )}

      {uploadMeta && !error && (
        <p className="upload-meta" role="status">
          Imagen procesada en WebP ({uploadMeta.width} × {uploadMeta.height} px).
        </p>
      )}

      {resolvedUrl && (
        <div className="image-uploader__preview">
          <img
            src={resolvedUrl}
            alt={altValue || "Vista previa"}
            className="image-uploader__thumb"
          />
          <div className="image-uploader__preview-info">
            <span className="mono-badge">URL resuelta</span>
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="image-uploader__resolved-link"
            >
              {resolvedUrl}
            </a>
          </div>
        </div>
      )}
    </div>
  );
};
