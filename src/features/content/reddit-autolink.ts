type MarkdownNode = {
  children?: MarkdownNode[];
  title?: string | null;
  type?: string;
  url?: string;
  value?: string;
};

type ParentMarkdownNode = MarkdownNode & {
  children: MarkdownNode[];
};

const redditReferencePattern =
  /(^|[^\p{L}\p{N}_/])([ru])\/([A-Za-z0-9][A-Za-z0-9_-]{0,63})(?![\p{L}\p{N}_-])/gu;
const skippedNodeTypes = new Set([
  "code",
  "definition",
  "image",
  "imageReference",
  "inlineCode",
  "link",
  "linkReference",
]);

export function remarkRedditAutolink() {
  return function transformRedditAutolinks(tree: MarkdownNode) {
    visitMarkdownNode(tree);
  };
}

function visitMarkdownNode(node: MarkdownNode) {
  if (!node.children || skippedNodeTypes.has(node.type ?? "")) {
    return;
  }

  const parent = node as ParentMarkdownNode;
  parent.children = parent.children.flatMap((child) => {
    if (child.type === "text" && typeof child.value === "string") {
      return splitRedditReferenceText(child.value);
    }

    visitMarkdownNode(child);
    return [child];
  });
}

function splitRedditReferenceText(value: string) {
  const nodes: MarkdownNode[] = [];
  let cursor = 0;

  for (const match of value.matchAll(redditReferencePattern)) {
    const matchedText = match[0];
    const prefix = match[1] ?? "";
    const kind = match[2];
    const name = match[3];
    const matchIndex = match.index ?? 0;
    const referenceStart = matchIndex + prefix.length;

    if (!kind || !name) {
      continue;
    }

    if (referenceStart > cursor) {
      nodes.push(createTextNode(value.slice(cursor, referenceStart)));
    }

    nodes.push(createRedditReferenceLink(kind, name));
    cursor = matchIndex + matchedText.length;
  }

  if (cursor === 0) {
    return [createTextNode(value)];
  }

  if (cursor < value.length) {
    nodes.push(createTextNode(value.slice(cursor)));
  }

  return nodes;
}

function createRedditReferenceLink(kind: string, name: string): MarkdownNode {
  const label = `${kind}/${name}`;
  const path =
    kind === "r"
      ? `/communities/${encodeURIComponent(name)}`
      : `/users/${encodeURIComponent(name)}`;

  return {
    children: [createTextNode(label)],
    title: null,
    type: "link",
    url: path,
  };
}

function createTextNode(value: string): MarkdownNode {
  return {
    type: "text",
    value,
  };
}
