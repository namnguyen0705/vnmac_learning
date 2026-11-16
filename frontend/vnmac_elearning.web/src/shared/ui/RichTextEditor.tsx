import { Editor, type IAllProps } from "@tinymce/tinymce-react";
import { useMemo } from "react";
import "tinymce/tinymce";
import "tinymce/models/dom";
import "tinymce/icons/default";
import "tinymce/themes/silver";
import "tinymce/plugins/advlist";
import "tinymce/plugins/anchor";
import "tinymce/plugins/autolink";
import "tinymce/plugins/charmap";
import "tinymce/plugins/code";
import "tinymce/plugins/fullscreen";
import "tinymce/plugins/image";
import "tinymce/plugins/insertdatetime";
import "tinymce/plugins/link";
import "tinymce/plugins/lists";
import "tinymce/plugins/media";
import "tinymce/plugins/preview";
import "tinymce/plugins/quickbars";
import "tinymce/plugins/searchreplace";
import "tinymce/plugins/table";
import "tinymce/plugins/visualblocks";
import "tinymce/plugins/wordcount";
import "tinymce/skins/ui/oxide/skin.css";
import "tinymce/skins/content/default/content.css";
import "tinymce/skins/ui/oxide/content.css";

type TinyMceInit = NonNullable<IAllProps["init"]>;
type TinyMceBlobInfo = {
  blob: () => Blob;
  filename: () => string;
};

export function RichTextEditor({
  value,
  onChange,
  onUploadImage,
  height = 560,
  compact = false,
  disabled = false,
  ariaLabel = "Nội dung có định dạng",
}: {
  value: string;
  onChange: (value: string) => void;
  onUploadImage: (file: File) => Promise<string>;
  height?: number;
  compact?: boolean;
  disabled?: boolean;
  ariaLabel?: string;
}) {
  const init = useMemo<TinyMceInit>(
    () => ({
      height,
      menubar: compact ? false : "file edit view insert format tools table help",
      iframe_aria_text: ariaLabel,
      plugins:
        "advlist anchor autolink charmap code fullscreen image insertdatetime link lists media preview quickbars searchreplace table visualblocks wordcount",
      toolbar: compact ? "undo redo | blocks | bold italic underline forecolor | bullist numlist | alignleft aligncenter alignright | link removeformat | fullscreen" : "undo redo | blocks fontfamily fontsize | bold italic underline forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | image media link table | removeformat visualblocks code fullscreen preview",
      toolbar_mode: compact ? "sliding" : "wrap",
      branding: false,
      promotion: false,
      skin: false,
      content_css: false,
      automatic_uploads: true,
      images_reuse_filename: true,
      images_file_types: "jpeg,jpg,jpe,png,webp,gif",
      file_picker_types: "image",
      paste_data_images: true,
      quickbars_selection_toolbar: "bold italic | quicklink h2 h3 blockquote",
      quickbars_insert_toolbar: "quickimage quicktable",
      images_upload_handler: async (blobInfo: TinyMceBlobInfo, progress: (percent: number) => void) => {
        progress(15);
        const blob = blobInfo.blob();
        const file = new File([blob], blobInfo.filename() || "lesson-image.png", { type: blob.type || "image/png" });
        const url = await onUploadImage(file);
        progress(100);
        return url;
      },
      file_picker_callback: (callback) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/png,image/jpeg,image/webp,image/gif";
        input.onchange = async () => {
          const file = input.files?.[0];
          if (!file) {
            return;
          }
          const url = await onUploadImage(file);
          callback(url, { alt: file.name });
        };
        input.click();
      },
      content_style: `
        body {
          color: #172b4d;
          font-family: Roboto, Inter, Arial, sans-serif;
          font-size: 14px;
          font-weight: 400;
          line-height: 1.5;
          padding: 18px;
        }
        h1 { color: #0f2d55; font-size: 24px; font-weight: 700; line-height: 1.3; margin: 0 0 12px; }
        h2 { color: #159457; font-size: 20px; font-weight: 600; line-height: 1.35; margin: 16px 0 10px; }
        h3 { color: #17345f; font-size: 16px; font-weight: 500; line-height: 1.4; margin: 14px 0 8px; }
        p { margin: 0 0 10px; }
        small, figcaption { font-size: 12px; font-weight: 400; line-height: 1.45; }
        strong { font-weight: 600; }
        img { max-width: 100%; height: auto; border-radius: 8px; }
        table { border-collapse: collapse; width: 100%; }
        td, th { border: 1px solid #dce8f7; padding: 8px 10px; }
        blockquote { border-left: 4px solid #075bd8; margin: 12px 0; padding: 8px 14px; background: #f3f7ff; }
      `,
    }),
    [height, onUploadImage, compact, ariaLabel],
  );

  return (
    <div className="admin-word-editor">
      <Editor init={init} licenseKey="gpl" onEditorChange={onChange} value={value} disabled={disabled} />
    </div>
  );
}

