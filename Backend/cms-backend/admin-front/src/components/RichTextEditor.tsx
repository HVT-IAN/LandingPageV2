import React, { useEffect, useId, useRef } from "react";
import tinymce, { type Editor } from "tinymce/tinymce";
import "tinymce/icons/default";
import "tinymce/themes/silver";
import "tinymce/models/dom";
import "tinymce/plugins/lists";
import "tinymce/plugins/link";
import "tinymce/plugins/image";
import "tinymce/plugins/table";
import "tinymce/plugins/code";
import "tinymce/plugins/wordcount";
import "tinymce/plugins/autolink";
import "tinymce/plugins/charmap";
import "tinymce/plugins/searchreplace";
import "tinymce/plugins/fullscreen";
import "tinymce/plugins/preview";
import "tinymce/skins/ui/oxide/skin.min.css";
import contentUiCss from "tinymce/skins/ui/oxide/content.min.css?inline";
import contentDefaultCss from "tinymce/skins/content/default/content.min.css?inline";

export interface RichTextEditorProps {
  id?: string;
  label: string;
  value: string;
  onChange: (html: string) => void;
  minHeight?: number;
  helpText?: string;
}

const CUSTOM_CONTENT_STYLE =
  "body { font-family: Montserrat, sans-serif; font-size: 15px; line-height: 1.65; color: #171717; } " +
  "p { margin: 0 0 0.9em; } " +
  "h2, h3, h4 { font-family: Poppins, sans-serif; line-height: 1.2; } " +
  "a { color: inherit; text-decoration: underline; }";

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  id,
  label,
  value,
  onChange,
  minHeight = 360,
  helpText,
}) => {
  const reactId = useId().replace(/:/g, "");
  const editorId = id || `tinymce-rich-${reactId}`;
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const editorInstanceRef = useRef<Editor | null>(null);
  const onChangeRef = useRef(onChange);
  const latestValueRef = useRef(value);

  onChangeRef.current = onChange;
  latestValueRef.current = value;

  useEffect(() => {
    const targetEl = textareaRef.current;
    if (!targetEl) return;

    let cancelled = false;

    tinymce.init({
      target: targetEl,
      license_key: "gpl",
      skin: false,
      content_css: false,
      height: minHeight,
      menubar: false,
      branding: false,
      promotion: false,
      plugins:
        "lists link image table code wordcount autolink charmap searchreplace fullscreen preview",
      toolbar:
        "undo redo | blocks | fontfamily fontsize forecolor | bold italic underline strikethrough | alignleft aligncenter alignright alignjustify | bullist numlist | link image table blockquote | removeformat",
      block_formats: "Párrafo=p; Título 2=h2; Título 3=h3; Título 4=h4",
      font_family_formats:
        "Montserrat=Montserrat,sans-serif; Poppins=Poppins,sans-serif; Arial=Arial,Helvetica,sans-serif; Georgia=Georgia,serif; Courier New=Courier New,monospace",
      font_size_formats: "12px 14px 16px 18px 20px 24px 28px",
      content_style: [contentUiCss, contentDefaultCss, CUSTOM_CONTENT_STYLE].join("\n"),
      image_uploadtab: false,
      automatic_uploads: false,
      paste_data_images: false,
      convert_urls: false,
      toolbar_mode: "wrap",
      setup: (editor: Editor) => {
        editorInstanceRef.current = editor;

        const sync = () => {
          if (cancelled) return;
          const content = editor.getContent();
          if (content !== latestValueRef.current) {
            latestValueRef.current = content;
            onChangeRef.current(content);
          }
        };

        editor.on("init", () => {
          if (cancelled) {
            editor.remove();
            return;
          }
          editor.setContent(latestValueRef.current || "");
        });

        editor.on("change input undo redo keyup setcontent", sync);
      },
    });

    return () => {
      cancelled = true;
      if (editorInstanceRef.current) {
        editorInstanceRef.current.remove();
        editorInstanceRef.current = null;
      }
    };
  }, [minHeight]);

  useEffect(() => {
    const editor = editorInstanceRef.current;
    if (editor && editor.initialized) {
      const currentContent = editor.getContent();
      if ((value || "") !== currentContent) {
        editor.setContent(value || "");
      }
    }
  }, [value]);

  return (
    <div className="field-group">
      <label className="field-label" htmlFor={editorId}>
        {label}
      </label>
      <textarea
        id={editorId}
        ref={textareaRef}
        className="field-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
      />
      {helpText && <p className="field-help">{helpText}</p>}
    </div>
  );
};
