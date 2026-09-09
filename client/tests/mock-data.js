// Deterministic payloads for the mocked backend (see fixtures.js). Shapes
// mirror what each real route returns:
//   /api/itunes/search      -> Apple's raw response, passed through untouched
//                              by server.js (record-crate.jsx#toTrack reads it)
//   /api/spotify/top-tracks  -> raw Spotify `items[]` (my-taste.jsx reads
//   /api/spotify/top-artists    track.name / .artists[].name / .album.images /
//                               .external_urls; artist.name / .images /
//                               .external_urls)
//   /api/spotify/profile     -> { images: [{ url, width }] }

// A short, VALID PCM WAV. decodeAudioData needs real bytes it can decode —
// an empty body makes turntable-audio.js#load reject and the deck never
// leaves LOADING. 1s of silence at 8kHz mono is ~16KB and decodes everywhere.
export function silentWav(seconds = 1, rate = 8000) {
  const frames = Math.floor(seconds * rate);
  const dataLen = frames * 2;
  const buf = Buffer.alloc(44 + dataLen);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataLen, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16); // PCM chunk size
  buf.writeUInt16LE(1, 20); // PCM
  buf.writeUInt16LE(1, 22); // mono
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28); // byte rate
  buf.writeUInt16LE(2, 32); // block align
  buf.writeUInt16LE(16, 34); // bits per sample
  buf.write('data', 36);
  buf.writeUInt32LE(dataLen, 40);
  // samples left at 0 — silence
  return buf;
}

export const PREVIEW_URL = 'https://audio.test/preview.wav';

// 5 tracks so the crate always has enough after the `previewUrl` filter and
// the RESULT_LIMIT slice.
export const ITUNES_RESULTS = {
  resultCount: 5,
  results: [
    mkItunes(1001, 'Midnight City', 'M83', 'Hurry Up, We’re Dreaming'),
    mkItunes(1002, 'Just Like Heaven', 'The Cure', 'Kiss Me, Kiss Me, Kiss Me'),
    mkItunes(1003, 'Redbone', 'Childish Gambino', 'Awaken, My Love!'),
    mkItunes(1004, 'Bad Guy', 'Billie Eilish', 'When We All Fall Asleep'),
    mkItunes(1005, 'The Less I Know The Better', 'Tame Impala', 'Currents'),
  ],
};

function mkItunes(trackId, trackName, artistName, collectionName) {
  return {
    wrapperType: 'track',
    kind: 'song',
    trackId,
    trackName,
    artistName,
    collectionName,
    artworkUrl60: 'https://art.test/60.jpg',
    artworkUrl100: 'https://art.test/100x100bb.jpg',
    previewUrl: PREVIEW_URL,
    trackTimeMillis: 210_000,
  };
}

const IMG = (w) => ({ url: `https://art.test/${w}.jpg`, width: w, height: w });

export const SPOTIFY_TOP_ARTISTS = [
  mkArtist('art1', 'Tame Impala'),
  mkArtist('art2', 'The Strokes'),
  mkArtist('art3', 'Khruangbin'),
  mkArtist('art4', 'Fleetwood Mac'),
  mkArtist('art5', 'Radiohead'),
];

function mkArtist(id, name) {
  return {
    id,
    name,
    type: 'artist',
    genres: ['indie'],
    images: [IMG(640), IMG(320), IMG(160)],
    external_urls: { spotify: `https://open.spotify.com/artist/${id}` },
  };
}

export const SPOTIFY_TOP_TRACKS = [
  mkTrack('trk1', 'Let It Happen', ['Tame Impala']),
  mkTrack('trk2', 'Reptilia', ['The Strokes']),
  mkTrack('trk3', 'White Gloves', ['Khruangbin']),
  mkTrack('trk4', 'Dreams', ['Fleetwood Mac']),
  mkTrack('trk5', 'Weird Fishes', ['Radiohead']),
];

function mkTrack(id, name, artists) {
  return {
    id,
    name,
    type: 'track',
    preview_url: PREVIEW_URL,
    artists: artists.map((a) => ({ name: a, type: 'artist' })),
    album: { name: `${name} — Single`, images: [IMG(640), IMG(300), IMG(64)] },
    external_urls: { spotify: `https://open.spotify.com/track/${id}` },
  };
}

export const SPOTIFY_PROFILE = {
  images: [{ url: 'https://art.test/profile.jpg', width: 300, height: 300 }],
};
