const axios = require('axios');
const logger = require('winston');

const iTunesConfig = require('../../config').iTunes;

// iTunes Search API
// https://affiliate.itunes.apple.com/resources/documentation/itunes-store-web-service-search-api/
const iTunesApi = axios.create({ baseURL: 'https://itunes.apple.com' });


/**
 * GET ARTIST INFORMATION FROM ITUNES
 * look up artistId, artistName, artistUrl
 */
exports.searchArtist = async (searchKey) => {

	// search store of country with code specified in config file
	let countryCode = '';
	if (iTunesConfig.country) {
		countryCode = `&country=${iTunesConfig.country}`;
	}

	// encode search string and construct query URL (limit=1 takes best match)
	const url = `/search?term=${encodeURI(searchKey)}&entity=allArtist&limit=1${countryCode}`;

	// get artist information from iTunes
	let response;
	try {
		response = await iTunesApi.get(url);
	}
	catch (err) {
		logger.error('Error trying to look up artist on iTunes: ', err);
		throw err;
	}

	if (response.data.resultCount === 0) {
		// artist not found
		logger.warn(`No artist found on iTunes for search key "${searchKey}"`);
		const err = new Error('Artist not found on iTunes');
		err.name = 'artistNotFound';
		throw err;
	}
	else {
		// artist found, extract relevant information
		const artistInfo = response.data.results[0];
		logger.debug(`Found artist ${artistInfo.artistId} (${artistInfo.artistName}) on iTunes for search key "${searchKey}"`);
		return {
			artistId: artistInfo.artistId,
			artistName: artistInfo.artistName,
			artistUrl: artistInfo.artistLinkUrl
		};
	}
};


/**
 * GET ARTIST'S LATEST RELEASE
 * get information from iTunes about the artist's most recently released single or album
 */
exports.getLatestRelease = async (artistId) => {

	// search store of country with code specified in config file
	let countryCode = '';
	if (iTunesConfig.country) {
		countryCode = `&country=${iTunesConfig.country}`;
	}

	// construct query URL using artistId
	const url = `/lookup?id=${artistId}&entity=album${countryCode}`;

	// fetch artist's releases from iTunes
	const response = await iTunesApi.get(url);
	logger.debug(`Fetched artist ${artistId}'s releases from iTunes`);

	const albums = response.data.results;
	albums.shift(); // remove first item (artist information) from the result array

	// loop through all releases and find newest one
	let latestRelease = albums[0];
	for (let i = 1; i < albums.length; i += 1) {
		if (new Date(albums[i].releaseDate) > new Date(latestRelease.releaseDate)) {
			latestRelease = albums[i];
		}
	}

	// determine whether release is an album or a single (release is a single if its name ends in
	// ' - Single', ' - EP', or if it contains less than 5 songs)
	let albumType;
	let albumNameWithoutType;
	const albumTypePattern = /(.*)(?: - Single$| - EP$)/i;
	const result = latestRelease.collectionName.match(albumTypePattern);
	if (result !== null || latestRelease.trackCount <= 5) {
		albumType = 'Single';
		albumNameWithoutType = result[1];
	}
	else {
		albumType = 'Album';
		albumNameWithoutType = latestRelease.collectionName;
	}

	return {
		albumCover: latestRelease.artworkUrl100,
		albumId: latestRelease.collectionId,
		albumName: albumNameWithoutType,
		albumReleaseDate: latestRelease.releaseDate,
		albumType,
		albumUrl: latestRelease.collectionViewUrl
	};
};