import { Node, mergeAttributes } from "@tiptap/core";

export interface CalloutOptions {
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: () => ReturnType;
      toggleCallout: () => ReturnType;
    };
  }
}

export const Callout = Node.create<CalloutOptions>({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    };
  },

  addAttributes() {
    return {
      icon: {
        default: "💡",
        parseHTML: (element) => element.getAttribute("data-icon") || "💡",
        renderHTML: (attributes) => ({
          "data-icon": attributes.icon,
        }),
      },
      blockId: {
        default: null,
        parseHTML: (element) => element.getAttribute("data-block-id"),
        renderHTML: (attributes) => {
          if (!attributes.blockId) return {};
          return { "data-block-id": attributes.blockId };
        },
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: "div[data-callout]",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-callout": "true",
      }),
      [
        "span",
        {
          class: "callout-icon select-none text-base leading-snug",
          contenteditable: "false",
        },
        HTMLAttributes["data-icon"] || "💡",
      ],
      ["div", { class: "callout-content flex-1 min-w-0" }, 0],
    ];
  },

  addCommands() {
    return {
      setCallout:
        () =>
        ({ commands }) => {
          return commands.wrapIn(this.name);
        },
      toggleCallout:
        () =>
        ({ commands }) => {
          return commands.toggleWrap(this.name);
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-c": () => this.editor.commands.toggleCallout(),
    };
  },
});
