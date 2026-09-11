import Image from "@tiptap/extension-image";

/** Image node with durable fileId for Spaces-backed uploads. */
export const ResizableImage = Image.extend({
  name: "image",

  addAttributes() {
    return {
      ...this.parent?.(),
      fileId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-file-id"),
        renderHTML: (attributes) => {
          if (!attributes.fileId) return {};
          return { "data-file-id": attributes.fileId };
        },
      },
    };
  },
});
