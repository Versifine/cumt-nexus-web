"use client";

import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type MutableRefObject,
  type ReactNode,
} from "react";
import Cropper, { type Area, type Point } from "react-easy-crop";
import {
  Camera,
  ImagePlus,
  Link as LinkIcon,
  Loader2,
  Trash2,
  UploadCloud,
  User,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  getUploadError,
  validateImageUploadFile,
} from "@/features/media/image-upload-rules";
import { useUploadImageMutation } from "@/features/media/queries";
import { IMAGE_UPLOAD_ACCEPT } from "@/features/media/types";
import { cn } from "@/lib/utils";

export type ManagedMediaKind = "avatar" | "banner";
export type ManagedMediaTriggerVariant = "avatar" | "banner" | "panel";

type MediaEditorCopy = {
  clearLabel?: string;
  description?: string;
  emptyLabel?: string;
  fieldLabel?: string;
  saveLabel?: string;
  title?: string;
  uploadDescription?: string;
};

type ManagedMediaEditorProps<TSaveResult> = {
  altText: string;
  avatarFallback?: ReactNode;
  className?: string;
  currentUrl: string;
  displayName: string;
  entityLabel: string;
  fileBaseName?: string;
  kind: ManagedMediaKind;
  onSaveUrl: (url: string) => Promise<TSaveResult>;
  onSaved?: (result: TSaveResult, nextUrl: string) => void;
  triggerLabel?: string;
  triggerVariant?: ManagedMediaTriggerVariant;
  copy?: MediaEditorCopy;
};

const defaultCopy: Record<
  ManagedMediaKind,
  Required<Omit<MediaEditorCopy, "description" | "uploadDescription">>
> = {
  avatar: {
    clearLabel: "清除图片",
    emptyLabel: "设置头像",
    fieldLabel: "头像 URL",
    saveLabel: "保存头像",
    title: "编辑头像",
  },
  banner: {
    clearLabel: "清除图片",
    emptyLabel: "设置背景图",
    fieldLabel: "背景图 URL",
    saveLabel: "保存背景图",
    title: "编辑背景图",
  },
};

export function ManagedMediaEditor<TSaveResult>({
  altText,
  avatarFallback,
  className,
  copy,
  currentUrl,
  displayName,
  entityLabel,
  fileBaseName,
  kind,
  onSaveUrl,
  onSaved,
  triggerLabel,
  triggerVariant = "panel",
}: ManagedMediaEditorProps<TSaveResult>) {
  const [open, setOpen] = useState(false);
  const [urlValue, setUrlValue] = useState(currentUrl);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [isSavingUrl, setIsSavingUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const filePreviewUrlRef = useRef<string | null>(null);
  const uploadMutation = useUploadImageMutation();
  const resolvedCopy = {
    ...defaultCopy[kind],
    ...copy,
  };
  const normalizedCurrentUrl = currentUrl.trim();
  const normalizedUrl = urlValue.trim();
  const isBusy = uploadMutation.isPending || isSavingUrl;
  const isCropMode = Boolean(filePreviewUrl);
  const cropAspect = kind === "avatar" ? 1 : 16 / 7;
  const cropShape = kind === "avatar" ? "round" : "rect";
  const cropLabel = kind === "avatar" ? "头像" : "背景图";
  const previewUrl = filePreviewUrl ?? normalizedUrl;
  const canSave =
    !isBusy && (Boolean(selectedFile) || normalizedUrl !== normalizedCurrentUrl);
  const errorMessage =
    localError ?? (uploadMutation.isError ? getUploadError(uploadMutation.error) : null);
  const dialogDescription =
    resolvedCopy.description ??
    `上传一张图片会先保存到后端附件，再同步写入${entityLabel}公开资料。`;
  const uploadDescription =
    resolvedCopy.uploadDescription ??
    `支持 JPEG、PNG、WebP，单张不超过 5 MB。上传成功后会自动保存到${entityLabel}。`;

  useEffect(
    () => () => {
      revokeFilePreview(filePreviewUrlRef);
    },
    [],
  );

  function handleOpenChange(nextOpen: boolean) {
    if (isBusy) {
      return;
    }

    if (nextOpen) {
      setUrlValue(currentUrl);
      replaceSelectedFile(null);
      setLocalError(null);
      uploadMutation.reset();
    } else {
      replaceSelectedFile(null);
    }

    setOpen(nextOpen);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;

    setLocalError(null);
    uploadMutation.reset();

    if (!file) {
      replaceSelectedFile(null);

      return;
    }

    const validationError = validateImageUploadFile(file, {
      currentCount: 0,
      maxCount: 1,
    });

    if (validationError) {
      setLocalError(validationError);
      replaceSelectedFile(null);
      event.target.value = "";

      return;
    }

    replaceSelectedFile(file);
  }

  async function handleSave() {
    setLocalError(null);
    uploadMutation.reset();

    if (!selectedFile && normalizedUrl && !isHttpUrl(normalizedUrl)) {
      setLocalError(`${resolvedCopy.fieldLabel} 必须是 http 或 https 绝对地址。`);

      return;
    }

    if (!selectedFile && normalizedUrl === normalizedCurrentUrl) {
      setLocalError("当前图片没有变化。");

      return;
    }

    if (selectedFile && isCropMode && !croppedAreaPixels) {
      setLocalError(`请先调整${cropLabel}裁剪区域。`);

      return;
    }

    try {
      let nextUrl = normalizedUrl;

      if (selectedFile) {
        const fileToUpload =
          isCropMode && filePreviewUrl && croppedAreaPixels
            ? await createCroppedMediaFile(
                filePreviewUrl,
                croppedAreaPixels,
                selectedFile.name,
                kind,
                fileBaseName,
              )
            : selectedFile;
        const validationError = validateImageUploadFile(fileToUpload, {
          currentCount: 0,
          maxCount: 1,
        });

        if (validationError) {
          setLocalError(validationError);

          return;
        }

        const result = await uploadMutation.mutateAsync({
          alt_text: altText,
          file: fileToUpload,
        });

        nextUrl = result.attachment.url;
      }

      setIsSavingUrl(true);
      const result = await onSaveUrl(nextUrl);

      replaceSelectedFile(null);
      setOpen(false);
      onSaved?.(result, nextUrl);
    } catch (error) {
      setLocalError(getLocalErrorMessage(error, cropLabel));
    } finally {
      setIsSavingUrl(false);
    }
  }

  async function handleClear() {
    setLocalError(null);
    uploadMutation.reset();

    if (!normalizedCurrentUrl && !selectedFile && !normalizedUrl) {
      return;
    }

    try {
      setIsSavingUrl(true);
      const result = await onSaveUrl("");

      replaceSelectedFile(null);
      setOpen(false);
      onSaved?.(result, "");
    } catch (error) {
      setLocalError(getLocalErrorMessage(error, cropLabel));
    } finally {
      setIsSavingUrl(false);
    }
  }

  function resetMediaCrop() {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }

  function replaceSelectedFile(file: File | null) {
    revokeFilePreview(filePreviewUrlRef);
    setSelectedFile(file);
    resetMediaCrop();

    if (!file) {
      setFilePreviewUrl(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    const objectUrl = URL.createObjectURL(file);

    filePreviewUrlRef.current = objectUrl;
    setFilePreviewUrl(objectUrl);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{renderTrigger()}</DialogTrigger>
      <DialogContent className={cn(kind === "banner" ? "max-w-3xl" : "max-w-2xl")}>
        <DialogHeader>
          <DialogTitle>{resolvedCopy.title}</DialogTitle>
          <DialogDescription>{dialogDescription}</DialogDescription>
        </DialogHeader>

        {errorMessage ? (
          <Alert variant="destructive">
            <AlertTitle>保存失败</AlertTitle>
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        ) : null}

        <div
          className={cn(
            "grid gap-4",
            kind === "banner"
              ? "md:grid-cols-[minmax(320px,360px)_minmax(0,1fr)]"
              : "md:grid-cols-[220px_minmax(0,1fr)]",
          )}
        >
          <div className="min-w-0 border-l border-border pl-3">
            <div className="font-mono text-[11px] text-muted-foreground">
              {selectedFile ? "裁剪预览" : "当前预览"}
            </div>
            <div
              className={cn(
                "mt-3 overflow-hidden bg-background",
                kind === "avatar"
                  ? "flex aspect-square items-center justify-center"
                  : "aspect-[16/7]",
              )}
            >
              {isCropMode && filePreviewUrl ? (
                <div className="relative h-full w-full bg-black">
                  <Cropper
                    image={filePreviewUrl}
                    crop={crop}
                    zoom={zoom}
                    aspect={cropAspect}
                    cropShape={cropShape}
                    showGrid={false}
                    objectFit="contain"
                    onCropChange={setCrop}
                    onCropComplete={(_, nextCroppedAreaPixels) =>
                      setCroppedAreaPixels(nextCroppedAreaPixels)
                    }
                    onZoomChange={setZoom}
                  />
                </div>
              ) : kind === "avatar" ? (
                <MediaAvatarPreview
                  fallback={avatarFallback}
                  imageUrl={previewUrl}
                  label={displayName}
                />
              ) : (
                <MediaBannerPreview imageUrl={previewUrl} label={displayName} />
              )}
            </div>
          </div>

          <div className="min-w-0 space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept={IMAGE_UPLOAD_ACCEPT}
              className="sr-only"
              onChange={handleFileChange}
            />

            <div className="min-w-0 bg-background-soft/50 p-3">
              <div className="text-sm font-semibold">上传新图片</div>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                {uploadDescription}
              </p>
              <div className="mt-3 flex min-w-0 flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={isBusy}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <UploadCloud className="size-4" aria-hidden="true" />
                  选择图片
                </Button>
                {selectedFile ? (
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={isBusy}
                    className="h-auto min-h-9 whitespace-normal text-left"
                    onClick={() => replaceSelectedFile(null)}
                  >
                    移除待上传图片
                  </Button>
                ) : null}
              </div>
              {selectedFile ? (
                <p className="mt-2 min-w-0 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
                  已选择：{selectedFile.name}
                </p>
              ) : null}
              {isCropMode ? (
                <div className="mt-3 border-t border-border/70 pt-3">
                  <label
                    className="flex items-center justify-between gap-3 text-xs text-muted-foreground"
                    htmlFor={`managed-${kind}-zoom`}
                  >
                    <span>{cropLabel}缩放</span>
                    <span className="font-mono">{zoom.toFixed(1)}x</span>
                  </label>
                  <input
                    id={`managed-${kind}-zoom`}
                    type="range"
                    min="1"
                    max="3"
                    step="0.1"
                    value={zoom}
                    disabled={isBusy}
                    className="mt-2 w-full accent-primary"
                    onChange={(event) => setZoom(Number(event.target.value))}
                  />
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {kind === "avatar"
                      ? "拖动图片调整位置，圆形区域就是最终头像。"
                      : "拖动图片调整取景，横向区域就是最终背景图。"}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="min-w-0 bg-background-soft/50 p-3">
              <label
                className="flex items-center gap-2 text-sm font-semibold"
                htmlFor={`managed-${kind}-url`}
              >
                <LinkIcon className="size-4 text-primary" aria-hidden="true" />
                使用公开图片 URL
              </label>
              <Input
                id={`managed-${kind}-url`}
                value={urlValue}
                disabled={isBusy || Boolean(selectedFile)}
                placeholder="https://example.com/image.jpg"
                className="mt-3"
                onChange={(event) => {
                  setLocalError(null);
                  setUrlValue(event.target.value);
                }}
              />
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                选择本地图片时会优先使用上传结果；URL 适合已有公开图床地址的情况。
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="items-center gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            disabled={isBusy || (!normalizedCurrentUrl && !selectedFile && !normalizedUrl)}
            className="h-auto min-h-9 whitespace-normal text-left"
            onClick={handleClear}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {resolvedCopy.clearLabel}
          </Button>
          <div className="flex min-w-0 flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
            <DialogClose asChild>
              <Button
                type="button"
                variant="ghost"
                className="hover:bg-transparent hover:text-primary"
                disabled={isBusy}
              >
                取消
              </Button>
            </DialogClose>
            <Button type="button" disabled={!canSave} onClick={handleSave}>
              {isBusy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : null}
              {isBusy ? "保存中" : resolvedCopy.saveLabel}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  function renderTrigger() {
    const label =
      triggerLabel ??
      (normalizedCurrentUrl
        ? `更换${kind === "avatar" ? "头像" : "背景图"}`
        : resolvedCopy.emptyLabel);

    if (triggerVariant === "avatar") {
      return (
        <button
          type="button"
          className={cn(
            "inline-flex size-9 items-center justify-center rounded-full bg-background text-foreground transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            className,
          )}
          aria-label={label}
        >
          <Camera className="size-4" aria-hidden="true" />
        </button>
      );
    }

    if (triggerVariant === "banner") {
      return (
        <button
          type="button"
          className={cn(
            "inline-flex h-auto min-h-9 items-center gap-2 bg-background/85 px-3 py-2 text-left text-xs font-semibold text-foreground backdrop-blur transition-colors hover:bg-primary hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
            className,
          )}
        >
          <ImagePlus className="size-4 shrink-0" aria-hidden="true" />
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">
            {label}
          </span>
        </button>
      );
    }

    return (
      <Button
        type="button"
        variant="ghost"
        className={cn(
          "h-auto min-h-9 whitespace-normal px-1 text-left hover:bg-transparent hover:text-primary",
          className,
        )}
      >
        {kind === "avatar" ? (
          <Camera className="size-4" aria-hidden="true" />
        ) : (
          <ImagePlus className="size-4" aria-hidden="true" />
        )}
        <span className="min-w-0 break-words [overflow-wrap:anywhere]">
          {label}
        </span>
      </Button>
    );
  }
}

function MediaAvatarPreview({
  fallback,
  imageUrl,
  label,
}: {
  fallback?: ReactNode;
  imageUrl: string;
  label: string;
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={imageUrl}
        alt={`${label} 的头像`}
        className="size-32 shrink-0 rounded-full object-cover"
      />
    );
  }

  return (
    <div
      className="flex size-32 shrink-0 items-center justify-center rounded-full bg-secondary text-primary"
      aria-label={`${label} 的头像占位`}
    >
      {fallback ?? <User className="size-9" aria-hidden="true" />}
    </div>
  );
}

function MediaBannerPreview({
  imageUrl,
  label,
}: {
  imageUrl: string;
  label: string;
}) {
  if (imageUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={imageUrl} alt={`${label} 的背景图`} className="h-full w-full object-cover" />
    );
  }

  return (
    <div
      className="relative h-full overflow-hidden bg-background-soft"
      aria-label={`${label} 的背景图占位`}
    >
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(45,212,191,0.14)_0_1px,transparent_1px_100%),linear-gradient(0deg,rgba(255,255,255,0.035)_0_1px,transparent_1px_100%)] bg-[size:24px_24px]" />
      <div className="absolute bottom-3 left-3 bg-background/80 px-2 py-1 font-mono text-[11px] text-muted-foreground">
        背景图未设置
      </div>
    </div>
  );
}

function revokeFilePreview(filePreviewUrlRef: MutableRefObject<string | null>) {
  if (!filePreviewUrlRef.current) {
    return;
  }

  URL.revokeObjectURL(filePreviewUrlRef.current);
  filePreviewUrlRef.current = null;
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

async function createCroppedMediaFile(
  imageSrc: string,
  cropArea: Area,
  originalName: string,
  kind: ManagedMediaKind,
  fileBaseName?: string,
) {
  const image = await loadImage(imageSrc);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const width = Math.max(1, Math.round(cropArea.width));
  const height = Math.max(1, Math.round(cropArea.height));
  const mediaLabel = kind === "avatar" ? "头像" : "背景图";

  if (!context) {
    throw new Error(`无法创建${mediaLabel}裁剪画布。`);
  }

  canvas.width = width;
  canvas.height = height;
  context.drawImage(
    image,
    Math.round(cropArea.x),
    Math.round(cropArea.y),
    width,
    height,
    0,
    0,
    width,
    height,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (nextBlob) => {
        if (nextBlob) {
          resolve(nextBlob);
        } else {
          reject(new Error(`无法生成裁剪后的${mediaLabel}。`));
        }
      },
      "image/webp",
      0.92,
    );
  });

  return new File(
    [blob],
    `${getFileBaseName(fileBaseName || originalName)}-${kind}.webp`,
    {
      type: "image/webp",
    },
  );
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("无法读取图片。")));
    image.src = src;
  });
}

function getFileBaseName(fileName: string) {
  const name = fileName.trim().replace(/\.[^.]+$/, "");

  return name || "media";
}

function getLocalErrorMessage(error: unknown, label: string) {
  return error instanceof Error
    ? error.message
    : `${label}保存失败，请稍后重试。`;
}
