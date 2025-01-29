import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, TFile } from 'obsidian';

// Remember to rename these classes and interfaces!

interface noteAssistSettings {
	mySetting: string;
}

const DEFAULT_SETTINGS: noteAssistSettings = {
	mySetting: 'default'
}

export default class noteAssist extends Plugin {
	settings: noteAssistSettings;

	wordSet: Set<string> = new Set();

	async onload() {
		this.loadWords();
		await this.loadSettings();

		this.registerEvent(
			this.app.workspace.on("editor-change", () => {
				console.log("Editor change detected!");
				const currView = this.app.workspace.getActiveViewOfType(MarkdownView);
				if (currView) {
					console.log("Active markdown view detected");
					this.processText(currView.editor);
				} else {
					console.log("No active markdown view");
				}
			})
		);


		this.addSettingTab(new SampleSettingTab(this.app, this));

		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

	
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	async loadWords() {
		try {
			const pluginPath = `${this.app.vault.configDir}/plugins/${this.manifest.id}/assets/words.txt`;
			const wordsFile = await this.app.vault.adapter.read(pluginPath);
			this.wordSet = new Set(wordsFile.split("\n").map(word => word.trim().toLowerCase()));
			console.log("Loaded words:", [...this.wordSet].slice(0, 10));
		} catch (error) {
			console.error("Error loading words file:", error);
		}
	}

	getPluginFileUrl(filePath: string): string {
		return `plugin://${this.manifest.id}/${filePath}`;
	}



	validWord(word: string): Boolean {
		return this.wordSet.has(word.toLowerCase());
	}

	processText(editor: Editor) {
		let cursor = editor.getCursor();
		let content = editor.getValue();
		var pairs: { [key: string]: string } = {"-":"ion", "_": "ing"};

		for (let i = 0; i < content.length; i++) {
			if (Object.keys(pairs).includes(content[i])) {
				let trigger = content[i];
				let replacement = pairs[trigger];
				let triggerPos = i;
				console.log("Trigger ", trigger, " found at:", triggerPos);
				let index = triggerPos - 1;
				let word = "";

				while (index >= 0 && (content[index] != " " && content[index] != "\n")) {
					word = content[index] + word;
					index--;
				}

				if (word.trim().length === 0) {
    				console.log("No preceding text, skipping replacement");
    				continue;
				}

				word = word.trim() + replacement;

				console.log("Generated word:", word);
				if (this.validWord(word)) {
					console.log("Valid word detected:", word);

					let start = editor.offsetToPos(triggerPos);
					let end = editor.offsetToPos(triggerPos + trigger.length);

					editor.replaceRange(replacement, start, end);

					editor.setCursor({
						line: cursor.line,
						ch: Math.min(cursor.ch + (replacement.length - trigger.length), editor.getLine(cursor.line).length)
					});
				} else { console.log("Invalid word detected:", word); }
			}
		}

	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SampleModal extends Modal {
	constructor(app: App) {
		super(app);
	}

	onOpen() {
		const { contentEl } = this;
		contentEl.setText('Woah!');
	}

	onClose() {
		const { contentEl } = this;
		contentEl.empty();
	}
}

class SampleSettingTab extends PluginSettingTab {
	plugin: noteAssist;

	constructor(app: App, plugin: noteAssist) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Setting #1')
			.setDesc('It\'s a secret')
			.addText(text => text
				.setPlaceholder('Enter your secret')
				.setValue(this.plugin.settings.mySetting)
				.onChange(async (value) => {
					this.plugin.settings.mySetting = value;
					await this.plugin.saveSettings();
				}));
	}
}
