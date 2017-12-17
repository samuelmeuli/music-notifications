const mongoose = require('mongoose');

const latestAlbum = mongoose.Schema({
	_id: false,
	albumCover: String,
	albumId: Number,
	albumName: String,
	albumReleaseDate: Date,
	albumType: String,
	albumUrl: String
});

const artistSchema = mongoose.Schema({
	// iTunes artist ID
	artistId: {
		type: Number,
		required: true
	},
	artistName: {
		type: String,
		required: true
	},
	// URL to artist's iTunes page
	artistUrl: {
		type: String,
		required: true
	},
	// info about most recently released album/single
	latestAlbum
});

module.exports = artistSchema;