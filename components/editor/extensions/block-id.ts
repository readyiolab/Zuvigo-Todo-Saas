import { Extension } from "@tiptap/core";

/**
 * Persists stable block IDs through TipTap/ProseMirror.
 * Without this, attrs.blockId are stripped and every save regenerates IDs.
 */
export const BlockId = Extension.create({
  name: "blockId",

  addGlobalAttributes() {
    return [
      {
        types: [
          "paragraph",
          "heading",
          "blockquote",
          "codeBlock",
          "bulletList",
          "orderedList",
          "taskList",
          "horizontalRule",
          "table",
          "image",
          "callout",
        ],
        attributes: {
          blockId: {
            default: null,
            parseHTML: (element) =>
              element.getAttribute("data-block-id") || null,
            renderHTML: (attributes) => {
              if (!attributes.blockId) return {};
              return { "data-block-id": attributes.blockId };
            },
          },
        },
      },
    ];
  },
});
