const logger = require('winston');

const database = require('../database');
const iTunesController = require('./itunes-controller');


/**
 * CREATE ARTIST
 * create a new document in the database for the iTunes artist
 */
const createArtist = async (artistId, artistName, artistUrl) => {

	// connect to database
	const db = await database.connect();

	// fetch new artist's latest release
	let latestAlbum;
	try {
		latestAlbum = await iTunesController.getLatestRelease(artistId);
	}
	catch (err) {
		logger.error(`Error trying to fetch artist ${artistId}'s latest release: `, err);
		db.connection.close();
		throw err;
	}

	// create a new document for the artist with latestAlbum information
	let artist;
	try {
		artist = await new db.Artist({
			artistId,
			artistName,
			artistUrl,
			latestAlbum
		}).save();
		logger.info(`Created artist ${artistId}`);
	}
	catch (err) {
		logger.error(`Error trying to create artist ${artistId}: `, err);
		db.connection.close();
		throw err;
	}

	db.connection.close();
	return artist;
};


/**
 * GET OR CREATE ARTIST
 * return artist document it if already exists in the database, otherwise create and return it
 */
exports.getOrCreateArtist = async (artistId, artistName, artistUrl) => {

	// connect to database
	const db = await database.connect();

	// get artist document from database
	let artist;
	try {
		artist = await db.Artist.findOne({ artistId });
	}
	catch (err) {
		logger.error(`Error looking up artist ${artistId} in database: `, err);
		db.connection.close();
		throw err;
	}

	db.connection.close();

	if (!artist) {
		// if document does not exist: create artist
		return createArtist(artistId, artistName, artistUrl);
	}
	else {
		return artist;
	}
};