import { Editor, type IAllProps } from "@tinymce/tinymce-react";
import { useEffect, useMemo, useRef, type ChangeEvent, type ReactNode } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Loader2, UploadCloud } from "lucide-react";
import { linesToText, textToLines } from "./contentModel";

type TinyMceInit = NonNullable<IAllProps["init"]>;
type TinyMceBlobInfo = {
  blob: () => Blob;
  filename: () => string;
};

export function RichTextEditor({
  value,
  onChange,
  onUploadImage,
}: {
  value: string;
  onChange: (value: string) => void;
  onUploadImage: (file: File) => Promise<string>;
}) {
  const init = useMemo<TinyMceInit>(
    () => ({
      height: 560,
      menubar: "file edit view insert format tools table help",
      plugins:
        "advlist anchor autolink charmap code fullscreen image insertdatetime link lists media preview quickbars searchreplace table visualblocks wordcount",
      toolbar:
        "undo redo | blocks fontfamily fontsize | bold italic underline forecolor backcolor | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | image media link table | removeformat visualblocks code fullscreen preview",
      toolbar_mode: "wrap",
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
    [onUploadImage],
  );

  return (
    <div className="admin-word-editor">
      <Editor init={init} licenseKey="gpl" onEditorChange={onChange} value={value} />
    </div>
  );
}

export function LegacyRichTextEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const editorRef = useRef<HTMLDivElement>(null);
  const actions = [
    { label: "H1", title: "Tieu de lon", command: "formatBlock", value: "h1" },
    { label: "H2", title: "Tieu de nho", command: "formatBlock", value: "h2" },
    { label: "P", title: "Doan van", command: "formatBlock", value: "p" },
    { label: "B", title: "In dam", command: "bold" },
    { label: "I", title: "In nghieng", command: "italic" },
    { label: "UL", title: "Danh sach gach dau dong", command: "insertUnorderedList" },
    { label: "OL", title: "Danh sach so", command: "insertOrderedList" },
    { label: "Clear", title: "Xoa dinh dang", command: "removeFormat" },
  ];

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || document.activeElement === editor || editor.innerHTML === value) {
      return;
    }
    editor.innerHTML = value;
  }, [value]);

  const emitChange = () => onChange(editorRef.current?.innerHTML ?? "");

  const runCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    document.execCommand(command, false, commandValue);
    emitChange();
  };

  return (
    <div className="admin-rich-editor">
      <div className="admin-rich-toolbar" aria-label="Cong cu dinh dang">
        {actions.map((action) => (
          <button
            key={`${action.command}-${action.value ?? ""}`}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => runCommand(action.command, action.value)}
            title={action.title}
            type="button"
          >
            {action.label}
          </button>
        ))}
      </div>
      <div
        className="admin-rich-surface"
        contentEditable
        data-placeholder="Nhap noi dung nhan dien, tieu de va mo ta cho man gioi thieu..."
        onInput={emitChange}
        ref={editorRef}
        role="textbox"
        suppressContentEditableWarning
      />
    </div>
  );
}

export function UploadBox({
  accept,
  disabled,
  label,
  loading,
  onChange,
}: {
  accept: string;
  disabled: boolean;
  label: string;
  loading: boolean;
  onChange: (file: File) => void;
}) {
  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) {
      onChange(file);
    }
  };

  return (
    <label className={disabled ? "admin-upload-box is-disabled" : "admin-upload-box"}>
      <input accept={accept} disabled={disabled} onChange={handleChange} type="file" />
      {loading ? <Loader2 className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
      <span>{label}</span>
    </label>
  );
}

export function Field({ children, label }: { children: ReactNode; label: string }) {
  return (
    <label className="admin-content-field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function ListField({ label, value, onChange }: { label: string; value: string[]; onChange: (value: string[]) => void }) {
  return (
    <Field label={`${label} (mỗi dòng một ý)`}>
      <Textarea value={linesToText(value)} onChange={(event) => onChange(textToLines(event.target.value))} />
    </Field>
  );
}
