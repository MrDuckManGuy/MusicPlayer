const jsmediatags = window.jsmediatags;

let currentSong;
let songLibrary = [];
let songQueue = [];
let currentTab = "#library-tab";
let currentLibraryPage = "#library-menu";

const songQueueElement = document.querySelector("#song-queue");

const songLibraryElement = document.querySelector("#song-library");
const directorySelect = document.querySelector("#directory-select");
const allSongSearchbar = document.querySelector("#all-song-searchbar");
const artistsLibraryElement = document.querySelector("#artists-library");
const artistsSearchbar = document.querySelector("#artists-searchbar");
const playlistsLibraryElement = document.querySelector("#playlists-library");

const audioPlayer = document.querySelector("#audioPlayer");
const playerTab = document.querySelector("#playerTab");
const controlPanel = document.querySelector("#control-panel");
const controls = document.querySelector("#controls");
const seekBar = document.querySelector("#seekBar");
const title = document.querySelector("#title");
const artist = document.querySelector("#artist");
const albumCover = document.querySelector("#album-cover");

function loadSongLibrary(files) {
	resetSongList("library");
	resetSongList("artists");
	resetSongList("playlists");
	files = Array.from(files);
	// init song library file entries
	songLibrary = files
		.filter(file => file.type.startsWith("audio/"))
		.sort((a, b) => (a.name).localeCompare((b.name)))
		.map(file => ({ file: file }));
	let readCounter = 0;
	// set metadata and init songs and init artists
	songLibrary.forEach(song => {
		jsmediatags.read(song.file, {
			onSuccess: (tag) => {
				const metadata = getMetadata(tag);
				Object.assign(song, metadata);
				if (++readCounter === songLibrary.length) {
					songLibrary.forEach(i => initSongListEntry("library", i));
					[...(new Set(songLibrary.map(i => i.artist)))]
						.sort()
						.forEach(i => initArtistEntry(i));
					songLibrary.forEach(i => initSongListEntry("artists", i));
				}
			},
			onError: (error) => {
				console.error("jsmediatags error: " + JSON.stringify(error));
			}
		});
	});
	// init playlists
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
	// console.log(Array.from(songLibrary).map(i => i.webkitRelativePath));
}

function loadSongQueue(songs) {
	resetSongList("queue");
	songs.forEach(enqueue);
	currentSong = 0;
	loadSong();
}

function loadSong() {
	const file = songQueue[currentSong].file;
	audioPlayer.src = URL.createObjectURL(file);
	playLoadedSong();
	jsmediatags.read(file, {
		onSuccess: setMetadata
	});
	enableControls(true);
	setPlayingQueue();
}

function resetAudioPlayer() {
	audioPlayer.src = "";
	audioPlayer.load();
	resetMetadata();
	enableControls(false);
}

function enqueue(song) {
	song = Object.assign({ queueId: generateQueueId() }, song);
	songQueue.push(song);
	initSongListEntry("queue", song);
}

function dequeue(index) {
	songQueue.splice(index, 1);
	Array.from(songQueueElement.children)[index].remove();
	if (songQueue.length === 0) {
		resetAudioPlayer();
	} else if (index === currentSong) {
		currentSong %= songQueue.length;
		loadSong(); // load after target
	} else if (index < currentSong) {
		currentSong--; // fix index after remove preceding song
	}
}

function generateQueueId() {
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

function randomEnqueue() {
	const randomSongCount = 8;
	if (songLibrary.length <= randomSongCount) return;
	shuffledSongLibrary = songLibrary.toSorted(() => 0.5 - Math.random());
	randomSongs = shuffledSongLibrary.slice(0, randomSongCount);
	loadSongQueue(randomSongs);
	focusTab("#player-tab");
}

function resetSongList(list) {
	switch (list) {
		case "library":
			songLibrary = [];
			songLibraryElement.replaceChildren();
			break;
		case "queue":
			songQueue = [];
			songQueueElement.replaceChildren();
			break;
		case "artists":
			artistsLibraryElement.replaceChildren();
			break;
		case "playlists":
			playlistsLibraryElement.replaceChildren();
			break;
		default:
			break;
	}
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

function initSongListEntry(list, song, listParent) {
	const songListEntry = createElement({
		type: "details",
		classes: ["song-list-entry"],
		events: {
			toggle: (event) => {
				const currentSelection = event.currentTarget;
				if (currentSelection.open) {
					closeListEntries(currentSelection);
				}
			}
		}
	});
	const songListEntryTitle = createElement({
		type: "summary",
		classes: ["song-list-entry-primary"],
		text: song.title ? song.title : song.file.name,
		parent: songListEntry
	});
	const songListEntrySecondary = createElement({
		type: "div",
		classes: ["song-list-entry-secondary"],
		text: song.artist ? song.artist : "unknown",
		parent: songListEntryTitle
	});
	const songListEntryMenu = createElement({
		type: "div",
		classes: ["song-list-entry-menu"],
		parent: songListEntry
	});
	const songListEntryPlay = createElement({
		type: "button",
		classes: ["song-list-entry-button"],
		text: "Play",
		events: {
			click: () => {
				focusTab("#player-tab");
				songListEntry.open = false;
			}
		},
		parent: songListEntryMenu
	});
	const songListEntryQueue = createElement({
		type: "button",
		classes: ["song-list-entry-button"],
		events: {
			click: () => {
				songListEntry.open = false;
			}
		},
		parent: songListEntryMenu
	});
	const songListEntryPlaylist = createElement({
		type: "button",
		classes: ["song-list-entry-button"],
		text: "Add to Playlist",
		events: {
			click: () => {
				songListEntry.open = false;
			}
		},
		parent: songListEntryMenu
	});
	switch (list) {
		case "library":
			initLibraryEntryMenuButtons(song, songListEntryPlay, songListEntryQueue);
			songLibraryElement.appendChild(songListEntry);
			break;
		case "queue":
			initQueueEntryMenuButtons(song, songListEntryPlay, songListEntryQueue);
			songQueueElement.appendChild(songListEntry);
			break;
		case "artists":
			songListEntrySecondary.textContent = song.album ? song.album : "unknown";
			initLibraryEntryMenuButtons(song, songListEntryPlay, songListEntryQueue);
			Array.from(artistsLibraryElement.children)
				.find(i => i.querySelector("summary").textContent === song.artist)
				.appendChild(songListEntry);
			break;
		case "playlists":
			songListEntrySecondary.textContent = song.album ? song.album : "unknown";
			initLibraryEntryMenuButtons(song, songListEntryPlay, songListEntryQueue);
			listParent.appendChild(songListEntry);
			break;
		default:
			break;
	}
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
		parent: artistsLibraryElement
	});
	const artistEntryTitle = createElement({
		type: "summary",
		classes: ["song-list-entry-primary"],
		text: artist ? artist : "unknown",
		parent: artistEntry
	});
	const artistEntryMenu = createElement({
		type: "div",
		classes: ["song-list-entry-menu"],
		parent: artistEntry
	});
	const artistEntryPlay = createElement({
		type: "button",
		classes: ["song-list-entry-button"],
		text: "Play",
		events: {
			click: () => {
				const songs = songLibrary.filter(i => i.artist === artist);
				loadSongQueue(songs);
				focusTab("#player-tab");
				artistEntry.open = false;
			}
		},
		parent: artistEntryMenu
	});
	const artistEntryQueue = createElement({
		type: "button",
		classes: ["song-list-entry-button"],
		text: "Enqueue",
		events: {
			click: () => {
				const songs = songLibrary.filter(i => i.artist === artist);
				songs.forEach(enqueue);
				artistEntry.open = false;
			}
		},
		parent: artistEntryMenu
	});
	const artistEntryPlaylist = createElement({
		type: "button",
		classes: ["song-list-entry-button"],
		text: "Add to Playlist",
		events: {
			click: () => {
				artistEntry.open = false;
			}
		},
		parent: artistEntryMenu
	});
}

function initPlaylistEntry(name, titles) {
	const playlistSongs = titles.map(title =>
		songLibrary.find(song => song.file.name === title)
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
		parent: playlistsLibraryElement
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
	const playlistEntryPlaylist = createElement({
		type: "button",
		classes: ["song-list-entry-button"],
		text: "Add to Playlist",
		events: {
			click: () => {
				playlistEntry.open = false;
			}
		},
		parent: playlistEntryMenu
	});
	playlistSongs.forEach(song => initSongListEntry("playlists", song, playlistEntry));
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

function initLibraryEntryMenuButtons(song, playButton, queueButton) {
	playButton.addEventListener("click", () => {
		loadSongQueue([song]);
	});
	queueButton.textContent = "Enqueue";
	queueButton.addEventListener("click", () => {
		enqueue(song);
	});
}

function initQueueEntryMenuButtons(song, playButton, queueButton) {
	playButton.addEventListener("click", () => {
		const targetId = song.queueId;
		const index = songQueue.findIndex(i => i.queueId === targetId);
		currentSong = index;
		loadSong();
	});
	queueButton.textContent = "Dequeue";
	queueButton.addEventListener("click", () => {
		const targetId = song.queueId;
		const index = songQueue.findIndex(i => i.queueId === targetId);
		dequeue(index);
	});
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
	const searchString = artistsSearchbar.value;
	const matches = getSearchMatches(searchString, artistsLibraryElement);
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
	Array.from(songQueueElement.children).forEach(song => {
		song.classList.remove("playing");
	});
	songQueueElement.children[currentSong].classList.add("playing");
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
	currentSong %= songQueue.length;
	if (currentSong < 0) {
		currentSong = songQueue.length + currentSong;
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

allSongSearchbar.addEventListener("keyup", event => {
	const searchString = allSongSearchbar.value;
	searchLibraryPage(searchString, songLibraryElement);
});

artistsSearchbar.addEventListener("keyup", event => {
	const searchString = artistsSearchbar.value;
	searchLibraryPage(searchString, artistsLibraryElement);
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
