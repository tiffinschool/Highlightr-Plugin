import { Editor, App, Menu, Plugin, MarkdownView } from "obsidian";
import { wait } from "src/util/util";
import { Highlighters } from "../settings/settingsData";
import addIcons from "src/icons/customIcons";
import { HighlightrSettingTab } from "../settings/settingsTab";
import { HighlightrSettings } from "../settings/settingsData";
import { DEFAULT_SETTINGS } from "../settings/settingsData";
import contextMenu from "src/plugin/contextMenu";
import highlighterMenu from "src/ui/highlighterMenu";

export default class HighlightrPlugin extends Plugin {
  app: App;
  editor: Editor;
  settings: HighlightrSettings;

  async onload() {
    console.log("Highlightr v" + this.manifest.version + " loaded");
    addIcons();
    await this.loadSettings();
    this.registerEvent(
      this.app.workspace.on("editor-menu", this.handleHighlighterMenu)
    );
    this.addSettingTab(new HighlightrSettingTab(this.app, this));
    this.addCommand({
      id: "highlighter-plugin-menu",
      name: "Open Highlightr",
      icon: "highlightpen",
      callback: async () => {
        !document.querySelector(".menu.highlighterContainer")
          ? highlighterMenu(this.app, this, this.settings)
          : true;
      },
    });

    addEventListener("Highlightr-NewCommand", () => {
      this.generateCommands(this.editor);
    });
    this.generateCommands(this.editor);
    this.refresh();
  }

  eraseHighlight = (editor: Editor) => {
    const currentStr = editor.getSelection();
    const newStr = currentStr
      .replace(/\<mark style.*?[^\>]\>/g, "")
      .replace(/\<\/mark>/g, "");
    editor.replaceSelection(newStr);
    editor.focus();
  };

  generateCommands(editor: Editor) {
    this.settings.highlighters.forEach((highlighter: Highlighters) => {
      const applyCommand = (command: CommandPlot, editor: Editor) => {
        const selectedText = editor.getSelection();
        const curserStart = editor.getCursor("from");
        const curserEnd = editor.getCursor("to");
        const prefix = command.prefix;
        const suffix = command.suffix || prefix;
        const setCursor = (mode: number) => {
          editor.setCursor(
            curserStart.line + command.line * mode,
            curserEnd.ch + cursorPos * mode
          );
        };
        const cursorPos =
          selectedText.length > 0
            ? prefix.length + suffix.length + 1
            : prefix.length;
        const preStart = {
          line: curserStart.line - command.line,
          ch: curserStart.ch - prefix.length,
        };
        const pre = editor.getRange(preStart, curserStart);

        const sufEnd = {
          line: curserStart.line + command.line,
          ch: curserEnd.ch + suffix.length,
        };

        const suf = editor.getRange(curserEnd, sufEnd);

        const preLast = pre.slice(-1);
        const prefixLast = prefix.trimStart().slice(-1);
        const sufFirst = suf[0];

        if (suf === suffix.trimEnd()) {
          if (preLast === prefixLast && selectedText) {
            editor.replaceRange(selectedText, preStart, sufEnd);
            const changeCursor = (mode: number) => {
              editor.setCursor(
                curserStart.line + command.line * mode,
                curserEnd.ch + (cursorPos * mode + 8)
              );
            };
            return changeCursor(-1);
          }
        }

        (selectedText && sufFirst === " ") ||
        (!selectedText && sufFirst === " ")
          ? editor.replaceSelection(`${prefix}${selectedText}${suffix}`)
          : selectedText && sufFirst !== " "
          ? editor.replaceSelection(`${prefix}${selectedText}${suffix} `)
          : editor.replaceSelection(`${prefix}${selectedText}${suffix} `);

        return setCursor(1);
      };

      type CommandPlot = {
        char: number;
        line: number;
        prefix: string;
        suffix: string;
      };

      type commandsPlot = {
        [key: string]: CommandPlot;
      };

      const commandsMap: commandsPlot = {
        highlight: {
          char: 34,
          line: 0,
          prefix: '<mark style="background: ' + highlighter.value + `;">`,
          suffix: "</mark>",
        },
      };
      Object.keys(commandsMap).forEach((type) => {
        this.addCommand({
          id: `${highlighter.color}`,
          name: highlighter.color,
          icon: `highlightpen`,
          editorCallback: async (editor: Editor) => {
            applyCommand(commandsMap[type], editor);
            await wait(10);
            editor.focus();
          },
        });
      });
      this.addCommand({
        id: "unhighlight",
        name: "Remove highlight",
        icon: "eraser",
        editorCallback: async (editor: Editor) => {
          this.eraseHighlight(editor);
          editor.focus();
        },
      });
    });
  }

  refresh = () => {
    this.updateStyle();
  };

  updateStyle = () => {
    document.body.classList.toggle(
      "highlightr-lowlight",
      this.settings.highlighterStyle === "lowlight"
    );
    document.body.classList.toggle(
      "highlightr-floating",
      this.settings.highlighterStyle === "floating"
    );
    document.body.classList.toggle(
      "highlightr-rounded",
      this.settings.highlighterStyle === "rounded"
    );
    document.body.classList.toggle(
      "highlightr-realistic",
      this.settings.highlighterStyle === "realistic"
    );
  };

  onunload() {
    console.log("Highlightr unloaded");
  }

  handleHighlighterMenu = (menu: Menu, editor: Editor): void => {
    contextMenu(this.app, menu, editor, this, this.settings);
  };

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
