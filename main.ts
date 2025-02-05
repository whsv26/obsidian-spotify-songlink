import {
	App,
	Notice,
	ObsidianProtocolData,
	Plugin,
	PluginSettingTab, requestUrl,
	Setting, TFile
} from 'obsidian';

interface SpotifySongLinkPluginSettings {
	noteFilenameTemplate: string;
	noteContentTemplate: string;
	noteDirectory: string;
}

const defaultNoteContentTemplate = `---
created: "{{now}}"
title: "{{title}}"
artist: "{{artistName}}"
thumbnail: "{{thumbnailUrl}}"
youtube: "{{youtubeUrl}}"
youtube-music: "{{youtubeMusicUrl}}"
spotify: "{{spotifyUrl}}"
apple-music: "{{appleMusicUrl}}"
amazon-music: "{{amazonMusicUrl}}"
songlink: "{{songlinkUrl}}"
---`;

const DEFAULT_SETTINGS: SpotifySongLinkPluginSettings = {
	noteFilenameTemplate: '{{artistName}} - {{title}}',
	noteContentTemplate: defaultNoteContentTemplate,
	noteDirectory: "Music",
}

interface SongLinkResponse {
	linksByPlatform: LinksByPlatform,
	pageUrl: string,
	entitiesByUniqueId: { [key: string]: Entity; }
}

interface Entity {
	type: string;
	title: string;
	artistName: string;
	thumbnailUrl: string;
	apiProvider: string;
}

interface LinksByPlatform {
	amazonMusic: Link
	amazonStore: Link
	audiomack: Link
	anghami: Link
	boomplay: Link
	deezer: Link
	appleMusic: Link
	itunes: Link
	pandora: Link
	soundcloud: Link
	tidal: Link
	youtube: Link
	youtubeMusic: Link
	spotify: Link
}

interface Link {
	url: string;
}

export default class SpotifySongLinkPlugin extends Plugin {
	settings: SpotifySongLinkPluginSettings;

	async onload() {
		await this.loadSettings();

		// This adds a settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new SpotifySongLinkSettingTab(this.app, this));

		this.registerObsidianProtocolHandler(
			"spotify-songlink-add-song",
			async (params: ObsidianProtocolData) => {

				const spotifyUrl = params.spotifyUrl;

				if (!spotifyUrl) {
					new Notice("spotifyUrl is empty")
					return;
				}

				const queryParams = new URLSearchParams({url: spotifyUrl});

				const response: SongLinkResponse =
					await requestUrl(`https://api.song.link/v1-alpha.1/links?${queryParams}`).json;

				const entity = Object.values(response.entitiesByUniqueId).find(e => e.apiProvider === "spotify")

				const now = new Date().toISOString().split('T')[0];
				const title = entity?.title;
				const artistName = entity?.artistName;
				const thumbnailUrl = entity?.thumbnailUrl;
				const youtubeUrl = response.linksByPlatform.youtube.url;
				const youtubeMusicUrl = response.linksByPlatform.youtubeMusic.url;
				const appleMusicUrl = response.linksByPlatform.appleMusic.url;
				const amazonMusicUrl = response.linksByPlatform.amazonMusic.url;
				const songlinkUrl = response.pageUrl;

				const settings = this.settings

				const noteFilename = settings.noteFilenameTemplate
					.split("{{now}}").join(now)
					.split("{{title}}").join(title)
					.split("{{artistName}}").join(artistName)

				const noteContent = settings.noteContentTemplate
					.split("{{now}}").join(now)
					.split("{{title}}").join(title)
					.split("{{artistName}}").join(artistName)
					.split("{{thumbnailUrl}}").join(thumbnailUrl)
					.split("{{youtubeUrl}}").join(youtubeUrl)
					.split("{{youtubeMusicUrl}}").join(youtubeMusicUrl)
					.split("{{spotifyUrl}}").join(spotifyUrl)
					.split("{{appleMusicUrl}}").join(appleMusicUrl)
					.split("{{amazonMusicUrl}}").join(amazonMusicUrl)
					.split("{{songlinkUrl}}").join(songlinkUrl)

				const newFilePath = `${settings.noteDirectory}/${noteFilename}.md`;
				await this.app.vault.create(newFilePath, noteContent);

				const newFile = this.app.vault.getAbstractFileByPath(newFilePath);

				if (!(newFile instanceof TFile)) {
					return;
				}

				const leaf = this.app.workspace.getLeaf(true);
				await leaf.openFile(newFile);
			},
		);
	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

class SpotifySongLinkSettingTab extends PluginSettingTab {
	plugin: SpotifySongLinkPlugin;

	constructor(app: App, plugin: SpotifySongLinkPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Note content template')
			.setDesc('Available variables: {{now}}, {{title}}, {{artistName}}, {{thumbnailUrl}}, {{youtubeUrl}}, {{youtubeMusicUrl}}, {{spotifyUrl}}, {{appleMusicUrl}}, {{amazonMusicUrl}}, {{songlinkUrl}}')
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.noteContentTemplate)
				.setValue(this.plugin.settings.noteContentTemplate)
				.onChange(async (value) => {
					this.plugin.settings.noteContentTemplate = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Note filename template')
			.setDesc('Available variables: {{now}}, {{title}}, {{artistName}}')
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.noteFilenameTemplate)
				.setValue(this.plugin.settings.noteFilenameTemplate)
				.onChange(async (value) => {
					this.plugin.settings.noteFilenameTemplate = value;
					await this.plugin.saveSettings();
				}));

		new Setting(containerEl)
			.setName('Note directory')
			.setDesc('New notes will be created here')
			.addText(text => text
				.setPlaceholder(DEFAULT_SETTINGS.noteDirectory)
				.setValue(this.plugin.settings.noteDirectory)
				.onChange(async (value) => {
					this.plugin.settings.noteDirectory = value;
					await this.plugin.saveSettings();
				}));
	}
}
