const jsmediatags = window.jsmediatags;

let currentSong;
let songLibrary = [];
let songQueue = [];

const songQueueElement = document.querySelector("#song-queue");

const songLibraryElement = document.querySelector("#song-library");
const directorySelect = document.querySelector("#directory-select");
const allSongSearchbar = document.querySelector("#all-song-searchbar");

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
	songLibrary = Array.from(files)
		.filter(file => file.type.startsWith("audio/"))
		.sort((a, b) => (a.name).localeCompare((b.name)))
		.map(file => ({ file: file }));
	let readCounter = 0;
	songLibrary.forEach(song => {
		jsmediatags.read(song.file, {
			onSuccess: (tag) => {
				const metadata = getMetadata(tag);
				Object.assign(song, metadata);
				if (++readCounter === songLibrary.length) {
					songLibrary.forEach(i => initSongListEntry("library", i));
				}
			},
			onError: (error) => {
				console.error("jsmediatags error: " + JSON.stringify(error));
			}
		});
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
		default:
			break;
	}
}

function searchSongLibrary(searchString) {
	const filtered = Array.from(songLibraryElement.children)
		.forEach(i => i.style.display = i.querySelector("summary")
			.textContent
			.toLowerCase()
			.includes(searchString.toLowerCase()) ? "" : "none");
}

function initSongListEntry(list, song) {
	const songListEntry = createElement({
		type: "details",
		classes: ["song-list-entry"],
		events: {
			toggle: (event) => {
				const currentSelection = event.currentTarget;
				if (currentSelection.open) {
					document.querySelectorAll(".song-list details").forEach(i => {
						if (i !== currentSelection) {
							i.open = false;
						}
					});
				}
			}
		}
	});
	const songListEntryTitle = createElement({
		type: "summary",
		classes: ["song-list-entry-title"],
		text: song.title,
		parent: songListEntry
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
			songLibraryElement.appendChild(songListEntry);
			songListEntryPlay.addEventListener("click", () => {
				loadSongQueue([song]);
			});
			songListEntryQueue.textContent = "Enqueue";
			songListEntryQueue.addEventListener("click", () => {
				enqueue(song);
			});
			break;
		case "queue":
			songQueueElement.appendChild(songListEntry);
			songListEntryPlay.addEventListener("click", () => {
				const targetId = song.queueId;
				const index = songQueue.findIndex(i => i.queueId === targetId);
				currentSong = index;
				loadSong();
			});
			songListEntryQueue.textContent = "Dequeue";
			songListEntryQueue.addEventListener("click", () => {
				const targetId = song.queueId;
				const index = songQueue.findIndex(i => i.queueId === targetId);
				dequeue(index);
			});
			break;
		default:
			break;
	}
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

function focusTab(tabID) {
	document.querySelector(tabID).scrollIntoView({
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
		document.querySelector(id).scrollIntoView({
			behavior: "smooth",
			block: "start"
		});
	});
});

allSongSearchbar.addEventListener("keyup", event => {
	const searchString = allSongSearchbar.value;
	searchSongLibrary(searchString);
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
