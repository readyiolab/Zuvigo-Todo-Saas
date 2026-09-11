import type { JSONContent } from "@tiptap/react";
import type { BlockType, EditorBlock } from "@/modules/editor/editor.types";
import { sortOrderBetween } from "@/modules/editor/editor.types";
import { createId } from "@/shared/utils/id";

function textFromNode(node: JSONContent | undefined): string {
  if (!node) return "";
  if (node.type === "text") return node.text ?? "";
  if (!node.content) return "";
  return node.content.map((child) => textFromNode(child)).join("");
}

function paragraphContent(text: string): JSONContent[] | undefined {
  if (!text) return undefined;
  return [{ type: "text", text }];
}

export function blocksToTiptapDoc(blocks: EditorBlock[]): JSONContent {
  if (blocks.length === 0) {
    return {
      type: "doc",
      content: [{ type: "paragraph" }],
    };
  }

  const content: JSONContent[] = blocks.map((block) => {
    const text = String(block.content.text ?? "");
    const blockId = block.id;
    const inlineContent = block.content.inlineContent as JSONContent[] | undefined;

    switch (block.type) {
      case "heading_1":
        return {
          type: "heading",
          attrs: { level: 1, blockId },
          content: inlineContent ?? paragraphContent(text),
        };
      case "heading_2":
        return {
          type: "heading",
          attrs: { level: 2, blockId },
          content: inlineContent ?? paragraphContent(text),
        };
      case "heading_3":
        return {
          type: "heading",
          attrs: { level: 3, blockId },
          content: inlineContent ?? paragraphContent(text),
        };
      case "quote":
        return {
          type: "blockquote",
          attrs: { blockId },
          content: inlineContent ?? [
            {
              type: "paragraph",
              content: paragraphContent(text),
            },
          ],
        };
      case "code":
        return {
          type: "codeBlock",
          attrs: { blockId, language: block.content.language ?? null },
          content: inlineContent ?? paragraphContent(text),
        };
      case "divider":
        return { type: "horizontalRule", attrs: { blockId } };
      case "bulleted_list": {
        const richItems = block.content.richItems as
          | Array<{ text: string; inlineContent?: JSONContent[] }>
          | undefined;
        if (richItems && Array.isArray(richItems)) {
          return {
            type: "bulletList",
            attrs: { blockId },
            content: richItems.map((item) => ({
              type: "listItem",
              content: item.inlineContent ?? [
                {
                  type: "paragraph",
                  content: paragraphContent(item.text),
                },
              ],
            })),
          };
        }
        return {
          type: "bulletList",
          attrs: { blockId },
          content: (Array.isArray(block.content.items) ? block.content.items : [text]).map(
            (item) => ({
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: paragraphContent(String(item)),
                },
              ],
            })
          ),
        };
      }
      case "numbered_list": {
        const richItems = block.content.richItems as
          | Array<{ text: string; inlineContent?: JSONContent[] }>
          | undefined;
        if (richItems && Array.isArray(richItems)) {
          return {
            type: "orderedList",
            attrs: { blockId },
            content: richItems.map((item) => ({
              type: "listItem",
              content: item.inlineContent ?? [
                {
                  type: "paragraph",
                  content: paragraphContent(item.text),
                },
              ],
            })),
          };
        }
        return {
          type: "orderedList",
          attrs: { blockId },
          content: (Array.isArray(block.content.items) ? block.content.items : [text]).map(
            (item) => ({
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: paragraphContent(String(item)),
                },
              ],
            })
          ),
        };
      }
      case "checklist":
        return {
          type: "taskList",
          attrs: { blockId },
          content: (
            Array.isArray(block.content.items)
              ? (block.content.items as Array<{
                  text?: string;
                  checked?: boolean;
                  inlineContent?: JSONContent[];
                }>)
              : [{ text, checked: false }]
          ).map((item) => ({
            type: "taskItem",
            attrs: { checked: Boolean(item.checked) },
            content: item.inlineContent ?? [
              {
                type: "paragraph",
                content: paragraphContent(String(item.text ?? "")),
              },
            ],
          })),
        };
      case "image":
        return {
          type: "image",
          attrs: {
            blockId,
            src: String(block.content.src ?? ""),
            alt: String(block.content.alt ?? ""),
            fileId: block.content.fileId ?? null,
          },
        };
      case "callout":
        return {
          type: "callout",
          attrs: {
            blockId,
            icon: String(block.content.icon ?? "💡"),
          },
          content: inlineContent ?? [
            {
              type: "paragraph",
              content: paragraphContent(text),
            },
          ],
        };
      case "table":
        return {
          type: "table",
          attrs: { blockId },
          content: (block.content.tableContent as JSONContent[] | undefined) ?? [
            {
              type: "tableRow",
              content: [
                {
                  type: "tableHeader",
                  content: [{ type: "paragraph", content: paragraphContent("Header 1") }],
                },
                {
                  type: "tableHeader",
                  content: [{ type: "paragraph", content: paragraphContent("Header 2") }],
                },
              ],
            },
            {
              type: "tableRow",
              content: [
                {
                  type: "tableCell",
                  content: [{ type: "paragraph", content: paragraphContent("") }],
                },
                {
                  type: "tableCell",
                  content: [{ type: "paragraph", content: paragraphContent("") }],
                },
              ],
            },
          ],
        };
      case "paragraph":
      default:
        return {
          type: "paragraph",
          attrs: { blockId },
          content: inlineContent ?? paragraphContent(text),
        };
    }
  });

  return { type: "doc", content };
}

export function tiptapDocToBlocks(doc: JSONContent): Array<{
  id?: string;
  type: BlockType;
  content: Record<string, unknown>;
  sortOrder: string;
  parentBlockId: string | null;
}> {
  const nodes = doc.content ?? [];
  let prev: string | null = null;
  const result: Array<{
    id?: string;
    type: BlockType;
    content: Record<string, unknown>;
    sortOrder: string;
    parentBlockId: string | null;
  }> = [];

  for (const node of nodes) {
    const sortOrder = sortOrderBetween(prev, null);
    prev = sortOrder;
    const blockId =
      typeof node.attrs?.blockId === "string" ? node.attrs.blockId : undefined;

    if (node.type === "callout") {
      result.push({
        id: blockId,
        type: "callout",
        content: {
          text: textFromNode(node),
          icon: node.attrs?.icon ?? "💡",
          inlineContent: node.content,
        },
        sortOrder,
        parentBlockId: null,
      });
      continue;
    }

    if (node.type === "table") {
      result.push({
        id: blockId,
        type: "table",
        content: {
          tableContent: node.content,
        },
        sortOrder,
        parentBlockId: null,
      });
      continue;
    }

    if (node.type === "heading") {
      const level = Number(node.attrs?.level ?? 1);
      const type: BlockType =
        level === 2 ? "heading_2" : level === 3 ? "heading_3" : "heading_1";
      result.push({
        id: blockId,
        type,
        content: {
          text: textFromNode(node),
          inlineContent: node.content,
        },
        sortOrder,
        parentBlockId: null,
      });
      continue;
    }

    if (node.type === "blockquote") {
      result.push({
        id: blockId,
        type: "quote",
        content: {
          text: textFromNode(node),
          inlineContent: node.content,
        },
        sortOrder,
        parentBlockId: null,
      });
      continue;
    }

    if (node.type === "codeBlock") {
      result.push({
        id: blockId,
        type: "code",
        content: {
          text: textFromNode(node),
          language: node.attrs?.language ?? null,
          inlineContent: node.content,
        },
        sortOrder,
        parentBlockId: null,
      });
      continue;
    }

    if (node.type === "horizontalRule") {
      result.push({
        id: blockId,
        type: "divider",
        content: {},
        sortOrder,
        parentBlockId: null,
      });
      continue;
    }

    if (node.type === "bulletList") {
      const richItems =
        node.content?.map((item) => ({
          text: textFromNode(item),
          inlineContent: item.content,
        })) ?? [];
      const items = richItems.map((i) => i.text);
      result.push({
        id: blockId,
        type: "bulleted_list",
        content: {
          items,
          richItems,
          text: items.join("\n"),
        },
        sortOrder,
        parentBlockId: null,
      });
      continue;
    }

    if (node.type === "orderedList") {
      const richItems =
        node.content?.map((item) => ({
          text: textFromNode(item),
          inlineContent: item.content,
        })) ?? [];
      const items = richItems.map((i) => i.text);
      result.push({
        id: blockId,
        type: "numbered_list",
        content: {
          items,
          richItems,
          text: items.join("\n"),
        },
        sortOrder,
        parentBlockId: null,
      });
      continue;
    }

    if (node.type === "taskList") {
      const items =
        node.content?.map((item) => ({
          text: textFromNode(item),
          checked: Boolean(item.attrs?.checked),
          inlineContent: item.content,
        })) ?? [];
      result.push({
        id: blockId,
        type: "checklist",
        content: { items },
        sortOrder,
        parentBlockId: null,
      });
      continue;
    }

    if (node.type === "image") {
      result.push({
        id: blockId,
        type: "image",
        content: {
          src: String(node.attrs?.src ?? ""),
          alt: String(node.attrs?.alt ?? ""),
          fileId: node.attrs?.fileId ?? null,
        },
        sortOrder,
        parentBlockId: null,
      });
      continue;
    }

    result.push({
      id: blockId ?? createId(),
      type: "paragraph",
      content: {
        text: textFromNode(node),
        inlineContent: node.content,
      },
      sortOrder,
      parentBlockId: null,
    });
  }

  if (result.length === 0) {
    result.push({
      type: "paragraph",
      content: { text: "" },
      sortOrder: "a0",
      parentBlockId: null,
    });
  }

  return result;
}
