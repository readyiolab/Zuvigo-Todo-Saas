import { Extension } from "@tiptap/core";
import { Suggestion, type SuggestionOptions } from "@tiptap/suggestion";
import { ReactRenderer } from "@tiptap/react";
import {
  SlashMenuList,
  SLASH_COMMAND_ITEMS,
  type CommandItem,
  type SlashMenuHandle,
} from "@/components/editor/components/slash-menu";

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        startOfLine: false,
        command: ({
          editor,
          range,
          props,
        }: {
          editor: any;
          range: any;
          props: CommandItem;
        }) => {
          props.command({ editor, range });
        },
      } as Partial<SuggestionOptions<CommandItem>>,
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => {
          const clean = query.toLowerCase().trim();
          if (!clean) return SLASH_COMMAND_ITEMS;
          return SLASH_COMMAND_ITEMS.filter((item) => {
            if (item.title.toLowerCase().includes(clean)) return true;
            if (item.description.toLowerCase().includes(clean)) return true;
            if (item.aliases?.some((a) => a.toLowerCase().includes(clean)))
              return true;
            return false;
          });
        },
        render: () => {
          let component: ReactRenderer<SlashMenuHandle, any> | null = null;
          let unmount: (() => void) | null = null;

          return {
            onStart: (props) => {
              component = new ReactRenderer(SlashMenuList, {
                props,
                editor: props.editor,
              });

              if (typeof props.mount === "function") {
                unmount = props.mount(component.element);
              }
            },

            onUpdate: (props) => {
              component?.updateProps(props);
            },

            onKeyDown: (props) => {
              if (props.event.key === "Escape") {
                unmount?.();
                return true;
              }
              return component?.ref?.onKeyDown(props) ?? false;
            },

            onExit: () => {
              unmount?.();
              component?.destroy();
            },
          };
        },
      }),
    ];
  },
});
