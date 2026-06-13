const jsmediatags = window.jsmediatags;

/**
 * song object
 * @typedef {Object} Song
 * @property {string} title
 * @property {string} artist
 * @property {string} album
 * @property {File} file
 * @property {string} libraryId
 * @property {string | undefined} queueId
 */

/** @type {number} */
let currentSong;

let currentTab = "#library-tab";
let currentLibraryPage = "#library-menu";

class SongList {
	selectEntry(event) {
		if (this.selectedEntry !== null) {
			this.selectedEntry.classList.remove("selected");
		}
		const targetEntry = event.target.closest(".song-list-entry");
		if (this.selectedEntry === targetEntry) {
			this.selectedEntry = null;
			this.enableEntryMenu(false);
		} else {
			this.selectedEntry = targetEntry;
			this.selectedEntry.classList.add("selected");
			this.enableEntryMenu(true);
		}
	}
}

class SongLibrary extends SongList {
	constructor() {
		super();
		/** @type {Array<Song>} */
		this.songList = [];
		this.element = document.querySelector("#song-library");
		this.searchbar = document.querySelector("#all-song-searchbar");
		this.selectedEntry = null;
		this.element.addEventListener("click", event => {
			this.selectEntry(event);
		});
		this.searchbar.addEventListener("keyup", () => {
			const searchString = this.searchbar.value;
			searchLibraryPage(searchString, this.element);
		});
	}

	reset() {
		this.songList = [];
		this.element.replaceChildren();
	}

	appendEntry(song) {
		const secondaryText = song.artist ? song.artist : "unknown";
		const entry = createSongListEntry(song, secondaryText);
		this.element.appendChild(entry);
	}

	selectEntry(event) {
		super.selectEntry(event);
	}

	// TODO ? initEntries() {}

	enableEntryMenu(state) {
		const entryMenu =
			document.querySelector("#all-songs-page > .enqueue-menu-bar");
		for (const button of entryMenu.children) {
			button.disabled = !state;
		}
	}

	playEntry() {
		const index =
			Array.from(this.element.children).indexOf(this.selectedEntry);
		const song = this.songList[index];
		loadSongQueue([song]);
	}

	enqueueEntry() {
		const index =
			Array.from(this.element.children).indexOf(this.selectedEntry);
		const song = this.songList[index];
		enqueue(song);
	}
}

class ArtistLibrary extends SongList {
	constructor() {
		super();
		this.artistList = [];
		this.songMap = [];
		this.element = document.querySelector("#artists-library");
		this.searchbar = document.querySelector("#artists-searchbar");
		this.selectedEntry = null;
		this.searchbar.addEventListener("keyup", () => {
			const searchString = this.searchbar.value;
			searchLibraryPage(searchString, this.element);
		});
		this.element.addEventListener("click", event => {
			this.selectEntry(event);
		});
	}

	setArtists(artistList) {
		this.artistList = artistList;
		artistList.forEach(i => this.songMap.push([]));
	}

	reset() {
		this.artistList = [];
		this.songMap = [];
		this.element.replaceChildren();
	}

	appendEntry(song) {
		const secondaryText = song.album ? song.album : "unknown";
		const entry = createSongListEntry(song, secondaryText);
		const index = artistLibrary.artistList.indexOf(song.artist);
		const artistElement = artistLibrary.element.children.item(index);
		artistElement.appendChild(entry);
		this.songMap[index].push(song.libraryId);
	}

	selectEntry(event) {
		const targetEntry = event.target.closest(".song-list-entry");
		if (targetEntry.classList.contains("artist-entry")) {
			return;
		}
		super.selectEntry(event);
	}

	getSelectedId() {
		const artistElement = this.selectedEntry.parentElement;
		const artistIndex =
			Array.from(this.element.children).indexOf(artistElement);
		const songIndex =
			Array.from(artistElement.querySelectorAll(".song-list-entry"))
			.indexOf(this.selectedEntry);
		const songId = this.songMap[artistIndex][songIndex];
		return songId;
	}

	enableEntryMenu(state) {
		const entryMenu =
			document.querySelector("#artists-page > .enqueue-menu-bar");
		const oneQueueButtons =
			Array.from(entryMenu.querySelectorAll(".one-queue-btn"));
		for (const button of oneQueueButtons) {
			button.disabled = !state;
		}
	}

	playEntry() {
		const songId = this.getSelectedId();
		const song = songLibrary.songList.find(i => i.libraryId === songId);
		loadSongQueue([song]);
	}

	enqueueEntry() {
		const songId = this.getSelectedId();
		const song = songLibrary.songList.find(i => i.libraryId === songId);
		enqueue(song);
	}
}

class PlaylistLibrary extends SongList {
	constructor() {
		super();
		this.element = document.querySelector("#playlists-library");
	}

	reset() {
		this.element.replaceChildren();
	}

	appendEntry(song, playlist) {
		const secondaryText = song.album ? song.album : "unknown";
		const entry = createSongListEntry(song, secondaryText);
		playlist.appendChild(entry);
	}
}

class SongQueue extends SongList {
	constructor() {
		super();
		/** @type {Array<Song>} */
		this.songList = [];
		this.element = document.querySelector("#song-queue");
		this.selectedEntry = null;
		this.element.addEventListener("click", event => {
			this.selectEntry(event);
		});
	}

	reset() {
		this.songList = [];
		this.element.replaceChildren();
	}

	appendEntry(song) {
		const secondaryText = song.artist ? song.artist : "unknown";
		const entry = createSongListEntry(song, secondaryText);
		this.element.appendChild(entry);
	}

	selectEntry(event) {
		super.selectEntry(event);
	}

	enableEntryMenu(state) {
		const entryMenu =
			document.querySelector("#queue-tab > .enqueue-menu-bar");
		for (const button of entryMenu.children) {
			button.disabled = !state;
		}
	}

	playEntry() {
		const index =
			Array.from(this.element.children).indexOf(this.selectedEntry);
		currentSong = index;
		loadSong();
	}
}

const songLibrary = new SongLibrary();
const artistLibrary = new ArtistLibrary();
const playlistLibrary = new PlaylistLibrary();
const songQueue = new SongQueue();

const directorySelect = document.querySelector("#directory-select");
const audioPlayer = document.querySelector("#audioPlayer");
const playerTab = document.querySelector("#playerTab");
const controlPanel = document.querySelector("#control-panel");
const controls = document.querySelector("#controls");
const seekBar = document.querySelector("#seekBar");
const title = document.querySelector("#title");
const artist = document.querySelector("#artist");
const albumCover = document.querySelector("#album-cover");

function initLibraryPageEntries(files) {
	songLibrary.songList.forEach(i => songLibrary.appendEntry(i));
	const artistList =
		[...(new Set(songLibrary.songList.map(i => i.artist)))].sort()
	artistLibrary.setArtists(artistList);
	artistLibrary.artistList.forEach(i => initArtistEntry(i));
	songLibrary.songList.forEach(i => artistLibrary.appendEntry(i));
	playlistFiles = files.filter(file => file.name.endsWith(".m3u"));
	playlistFiles.forEach(playlistFile => {
		if (playlistFile.name === ".album.m3u") return;
		const reader = new FileReader();
		reader.onload = () => {
			playlistFileText = reader.result;
			playlistName = playlistFileText
				.match(/#PLAYLIST:(.*)/)[1];
			playlistSongPaths = playlistFileText
				.split("\n")
				.filter(i => !i.startsWith("#") && i !== "");
			playlistSongNames = playlistSongPaths.map(i => i.split("/").toReversed()[0]);
			initPlaylistEntry(playlistName, playlistSongNames);
		}
		reader.onerror = (error) => {
			console.error("playlist FileReader error: " + error);
		}
		reader.readAsText(playlistFile);
	});
}

function loadSongLibrary(files) {
	[songLibrary, artistLibrary, playlistLibrary].forEach(i => i.reset());
	files = Array.from(files);
	// init song library file entries
	songLibrary.songList =
		files
		.filter(file => file.type.startsWith("audio/")
			&& !file.type.endsWith("x-mpegurl"))
		.sort((a, b) => (a.name).localeCompare((b.name)))
		.map(file => ({ file: file, libraryId: generateId() }));
	let readCounter = 0;
	// read metadata
	songLibrary.songList.forEach(song => {
		jsmediatags.read(song.file, {
			onSuccess: (tag) => {
				const metadata = getMetadata(tag);
				Object.assign(song, metadata);
				if (++readCounter === songLibrary.songList.length) {
					initLibraryPageEntries(files);
				}
			},
			onError: (error) => {
				console.error("jsmediatags error: " + JSON.stringify(error));
			}
		});
	});
}

/**
 * Populate the song queue with a new list of songs
 * @param {Song[]} songs - list of songs to push to the queue
 */
function loadSongQueue(songs) {
	songQueue.reset();
	songs.forEach(enqueue);
	currentSong = 0;
	loadSong();
}

/**
 * Play the song from the queue marked as the current song
 */
function loadSong() {
	const file = songQueue.songList[currentSong].file;
	audioPlayer.src = URL.createObjectURL(file);
	playLoadedSong();
	jsmediatags.read(file, {
		onSuccess: setMetadata
	});
	enableControls(true);
	setPlayingQueue();
}

/**
 * Clear existing data from the audio player
 */
function resetAudioPlayer() {
	audioPlayer.src = "";
	audioPlayer.load();
	resetMetadata();
	enableControls(false);
}

/**
 * Push a song to the end of the song queue
 * @param {Song} song - the song to be added to the queue
 */
function enqueue(song) {
	song = Object.assign({ queueId: generateId() }, song);
	songQueue.songList.push(song);
	songQueue.appendEntry(song);
}

/**
 * Remove a song from the song queue
 * @param {number} index - the queue index of the song to be removed
 */
function dequeue(index) {
	songQueue.songList.splice(index, 1);
	Array.from(songQueue.element.children)[index].remove();
	if (songQueue.songList.length === 0) {
		resetAudioPlayer();
	} else if (index === currentSong) {
		currentSong %= songQueue.songList.length;
		loadSong(); // load after target
	} else if (index < currentSong) {
		currentSong--; // fix index after remove preceding song
	}
}

/**
 * Create a unique identifier
 * @return {string} an identifier string
 */
function generateId() {
	try {
		return crypto.randomUUID();
	} catch (error) {
		const base = 36;
		const idLength = 10;
		return Math.floor(Math.random() * Math.pow(base, idLength))
			.toString(base)
			.padStart(idLength, 0);
	}
}

/**
 * Select one song randomly, weighted inversely by number of songs by artist
 * @param {Song[]} songSelectionList - copy of songLibrary to be mutated for
 * random selection
 * @return {Song} one randomly selected song
 */
function weightedRandomSelect(songSelectionList) {
	const artistsSongsMap = Object.groupBy(songSelectionList,
		({artist}) => artist);
	const artistCount = Object.keys(artistsSongsMap).length;
	const artistSongCounts = Object.fromEntries(
		Object.entries(artistsSongsMap).map(([key, val]) => [key, val.length]));
	const songWeights = [];
	for (let song of songSelectionList) {
		const artistSongCount = artistSongCounts[song.artist];
		const songWeight = 1 / (artistCount * artistSongCount);
		songWeights.push(songWeight);
	}
	let i;
	for (i = 1; i < songWeights.length; i++) {
		songWeights[i] += songWeights[i - 1];
	}
	const randomValue = Math.random();
	for (i = 0; i < songWeights.length; i++) {
		if (songWeights[i] > randomValue) {
			return songSelectionList.splice(i, 1)[0];
		}
	}
}

/**
 * Enqueue k random songs
 */
function randomEnqueue() {
	const randomSongCount = Math.min(8, songLibrary.songList.length);
	const songLibraryCopy = Array.from(songLibrary.songList)
	const randomSongs = [];
	for (let i = 0; i < randomSongCount; i++) {
		const randomSong = weightedRandomSelect(songLibraryCopy);
		randomSongs.push(randomSong);
	}
	loadSongQueue(randomSongs);
	focusTab("#player-tab");
}

function getSearchMatches(searchString, libraryElement) {
	return Array.from(libraryElement.children)
		.filter(i => i.querySelector(".song-list-entry-primary")
			.textContent
			.toLowerCase()
			.includes(searchString.toLowerCase()));
}

function searchLibraryPage(searchString, libraryElement) {
	closeListEntries();
	const matches = getSearchMatches(searchString, libraryElement);
	Array.from(libraryElement.children)
		.forEach(i => i.style.display = matches.includes(i) ? "" : "none");
}

function elementToLibrary(element) {
	switch (element) {
		case songLibrary.element:
			return songLibrary;
		case artistLibrary.element:
			return artistLibrary;
		case playlistLibrary.element:
			return playlistLibrary;
		case songQueue.element:
			return songQueue;
	}
}

function createSongListEntry(song, secondaryText) {
	const songListEntry = createElement({
		type: "div",
		classes: ["song-list-entry"]
	});
	const songListEntryTitle = createElement({
		type: "div",
		classes: ["song-list-entry-primary"],
		text: song.title ? song.title : song.file.name,
		parent: songListEntry
	});
	const songListEntrySecondary = createElement({
		type: "div",
		classes: ["song-list-entry-secondary"],
		text: secondaryText,
		parent: songListEntryTitle
	});
	return songListEntry;
}

function initArtistEntry(artist) {
	const artistEntry = createElement({
		type: "details",
		classes: ["song-list-entry", "artist-entry"],
		events: {
			toggle: (event) => {
				const currentSelection = event.currentTarget;
				closeListEntries(currentSelection);
				focusArtistEntry(currentSelection);
			}
		},
		parent: artistLibrary.element
	});
	const artistEntryTitle = createElement({
		type: "summary",
		classes: ["song-list-entry-primary"],
		text: artist ? artist : "unknown",
		parent: artistEntry
	});
}

function initPlaylistEntry(name, titles) {
	const playlistSongs = titles.map(title =>
		songLibrary.songList.find(song => song.file.name === title)
	);
	const playlistEntry = createElement({
		type: "details",
		classes: ["song-list-entry", "playlist-entry"],
		events: {
			toggle: (event) => {
				const currentSelection = event.currentTarget;
				closeListEntries(currentSelection);
				// focusArtistEntry(currentSelection);
			}
		},
		parent: playlistLibrary.element
	});
	const playlistEntryTitle = createElement({
		type: "summary",
		classes: ["song-list-entry-primary"],
		text: name ? name : "unknown",
		parent: playlistEntry
	});
	const playlistEntryMenu = createElement({
		type: "div",
		classes: ["song-list-entry-menu"],
		parent: playlistEntry
	});
	const playlistEntryPlay = createElement({
		type: "button",
		classes: ["song-list-entry-button"],
		text: "Play",
		events: {
			click: () => {
				const songs = playlistSongs;
				loadSongQueue(songs);
				focusTab("#player-tab");
				playlistEntry.open = false;
			}
		},
		parent: playlistEntryMenu
	});
	const playlistEntryQueue = createElement({
		type: "button",
		classes: ["song-list-entry-button"],
		text: "Enqueue",
		events: {
			click: () => {
				const songs = playlistSongs;
				songs.forEach(enqueue);
				playlistEntry.open = false;
			}
		},
		parent: playlistEntryMenu
	});
	playlistSongs.forEach(song => playlistLibrary.appendEntry(song, playlistEntry));
}

// UI

function createElement(data) {
	const element = document.createElement(data.type);
	data.classes.forEach(i => element.classList.add(i));
	if (data.text) element.textContent = data.text;
	if (data.events) {
		for (const [event, handler] of Object.entries(data.events)) {
			element.addEventListener(event, handler);
		}
	}
	if (data.parent) data.parent.appendChild(element);
	return element;
}

function closeListEntries(currentSelection) {
	let songList;
	if (!currentSelection) {
		songList = Array.from(document.querySelectorAll(".song-list-entry"));
	} else {
		songList = Array.from(currentSelection.parentNode.children);
	}
	songList.forEach(i => {
		if (i !== currentSelection) {
			i.open = false;
		}
	});
}

function focusArtistEntry(currentSelection) {
	const searchString = artistLibrary.searchbar.value;
	const matches = getSearchMatches(searchString, artistLibrary.element);
	const displayState = currentSelection.open ? "none" : "";
	matches.forEach(i => {
		if (i !== currentSelection) {
			i.style.display = displayState;
		}
	});
}

function enableControls(state) {
	seekBar.disabled = !state;
	for (let btn of controls.children) btn.disabled = !state;
}

function setPlayingQueue() {
	Array.from(songQueue.element.children).forEach(song => {
		song.classList.remove("playing");
	});
	songQueue.element.children[currentSong].classList.add("playing");
}

function focusTab(tabID, resetOrientation) {
	if (tabID !== "#library-tab") {
		// focus non-library tab
		currentTab = tabID;
		destinationID = tabID;
	} else if (currentTab !== "#library-tab") {
		// focus library tab
		currentTab = "#library-tab";
		destinationID = currentLibraryPage;
	} else if (resetOrientation) {
		// refocus library tab on change orientation
		destinationID = currentLibraryPage;
	} else {
		// return to library menu if library tab focused
		currentLibraryPage = "#library-menu";
		destinationID = "#library-menu";
	}
	document.querySelector(destinationID).scrollIntoView({
		behavior: "smooth",
		block: "start"
	});
}

function playSelectedEntry(event) {
	const songListElement = event.target.closest(".song-list-page").querySelector(".song-list");
	const songList = elementToLibrary(songListElement);
	songList.playEntry();
	focusTab("#player-tab");
}

function enqueueSelectedEntry(event) {
	const songListElement = event.target.closest(".song-list-page").querySelector(".song-list");
	const songList = elementToLibrary(songListElement);
	songList.enqueueEntry();
}

function dequeueSelectedEntry() {
	const songQueueEntries = Array.from(songQueue.element.children);
	const index = songQueueEntries.indexOf(songQueue.selectedEntry);
	dequeue(index);
	songQueue.enableEntryMenu(false);
}

// controls

function playLoadedSong() {
	audioPlayer.play();
	document.querySelector("#playback-icon").src = "media/pause.png";
}

function pauseLoadedSong() {
	audioPlayer.pause();
	document.querySelector("#playback-icon").src = "media/play.png";
}

function togglePlayback() {
	if (audioPlayer.paused) {
		playLoadedSong();
	} else {
		pauseLoadedSong();
	}
}

function prevSong() {
	if (audioPlayer.currentTime > 3) {
		audioPlayer.currentTime = 0;
		return;
	}
	updateSongIndex(-1);
	loadSong();
}

function nextSong() {
	updateSongIndex(1);
	loadSong();
}

function updateSongIndex(adv) {
	currentSong += adv;
	currentSong %= songQueue.songList.length;
	if (currentSong < 0) {
		currentSong = songQueue.songList.length + currentSong;
	}
}

function seek(event) {
	const pos = event.target.value / 100 * audioPlayer.duration;
	audioPlayer.fastSeek(pos);
}

// events

setInterval(() => {
	const pos = audioPlayer.currentTime / audioPlayer.duration * 100;
	seekBar.value = pos;
}, 500);

audioPlayer.addEventListener("ended", () => {
	nextSong();
});

directorySelect.addEventListener("change", event => {
	loadSongLibrary(event.target.files);
});

document.querySelectorAll("a").forEach(i => {
	i.addEventListener("click", event => {
		event.preventDefault();
		const id = (new URL(i.href)).hash;
		currentLibraryPage = id;
		document.querySelector(id).scrollIntoView({
			behavior: "smooth",
			block: "start"
		});
	});
});

screen.orientation.addEventListener("change", event => {
	focusTab(currentTab, true);
});

// service worker

if ("serviceWorker" in navigator) {
	window.addEventListener("load", async () => {
		try {
			await navigator.serviceWorker.register("service-worker.js");
		} catch (error) {
			console.error("service worker registration failed:", error);
		}
	});
}

// metadata

function getMetadata(tag) {
	const tags = tag.tags;
	return {
		title: tags.title,
		album: tags.album,
		artist: tags.artist
	};
}

function setMetadata(tag) {
	const tags = tag.tags;
	title.textContent = tags.title ? tags.title : "-";
	artist.textContent = tags.artist ? tags.artist : "-";
	albumCover.src = decodeImg(tags.picture);
	if ('mediaSession' in navigator) {
		navigator.mediaSession.metadata = new MediaMetadata({
			title: tags.title,
			artist: tags.artist,
			artwork: [{ src: albumCover.src }]
		});
		navigator.mediaSession.setActionHandler("play", () => playLoadedSong());
		navigator.mediaSession.setActionHandler("pause", () => pauseLoadedSong());
		navigator.mediaSession.setActionHandler("previoustrack", () => prevSong());
		navigator.mediaSession.setActionHandler("nexttrack", () => nextSong());
	}
}

function resetMetadata() {
	title.textContent = "-";
	artist.textContent = "-";
	albumCover.src = "media/image-not-found.png";
}

function decodeImg(imgData) {
	if (!imgData) {
		return "media/image-not-found.png";
	}
	const { data, format } = imgData;
	let base64String = "";
	for (const i of data) {
		base64String += String.fromCharCode(i);
	}
	return `data:${format};base64,${window.btoa(base64String)}`;
}
