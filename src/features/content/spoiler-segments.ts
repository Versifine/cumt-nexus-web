export type ContentSegment =
  | {
      text: string;
      type: "text";
    }
  | {
      text: string;
      type: "spoiler";
    };

export function parseSpoilerSegments(value: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let cursor = 0;

  while (cursor < value.length) {
    const start = value.indexOf(">!", cursor);

    if (start === -1) {
      pushTextSegment(segments, value.slice(cursor));
      break;
    }

    const end = value.indexOf("!<", start + 2);

    if (end === -1) {
      pushTextSegment(segments, value.slice(cursor));
      break;
    }

    pushTextSegment(segments, value.slice(cursor, start));
    segments.push({
      text: normalizeSpoilerText(value.slice(start + 2, end)),
      type: "spoiler",
    });
    cursor = end + 2;
  }

  if (segments.length === 0) {
    return [{ text: value, type: "text" }];
  }

  return segments;
}

function pushTextSegment(segments: ContentSegment[], text: string) {
  if (text) {
    segments.push({ text, type: "text" });
  }
}

function normalizeSpoilerText(text: string) {
  const normalizedText = text.trim();

  return normalizedText || "隐藏内容";
}
