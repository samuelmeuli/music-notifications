const logger = require('winston');

const database = require('../database');
const iTunesController = require('./itunes-controller');


/**
 * UPDATE ARTISTS
 * for all artists in the database, check whether they have released a new album/song, and compile
 * their documents into a list
 */
exports.updateArtists = async () => {

	logger.info('Starting database update');

	// connect to database
	const db = await database.connect();

	// fetch all artist documents
	const artists = await db.Artist.find({});

	// loop through all artists
	const updatedArtists = {};
	await Promise.all(
		artists.map(artist =>
			// fetch artist's latest release
			iTunesController.getLatestRelease(artist.artistId)
				.then((latestRelease) => {
					// if release is new: update the artist entry with the new release and add artist document
					// to the updatedArtists dictionary
					if (artist.latestAlbum.albumId !== latestRelease.albumId) {
						updatedArtists[artist.artistId] = artist;
						return db.Artist.findOneAndUpdate(
							{ artistId: artist.artistId },
							{ $set: { latestAlbum: latestRelease }}
						);
					}
				})
		)
	);

	db.connection.close();
	logger.info(`Finished database update (updated ${Object.keys(updatedArtists).length} artists)`);
	return updatedArtists;
};


/**
 * GET NOTIFICATION LIST
 * create a list of users' email addresses and the updated artist documents they have subscribed to
 */
exports.getNotificationList = async (updatedArtists) => {

	logger.info('Generating notification list');

	// connect to database
	const db = await database.connect();

	// find all users who have subscribed to artists with new releases
	const usersToNotify = await db.User.find({ subscriptions: { $in: Object.keys(updatedArtists) }})
		.select('email subscriptions');

	// map the updated artist documents to the users' subscriptions
	const notificationList = usersToNotify.map((user) => {
		const updatedSubscriptions = [];
		for (let i = 0; i < user.subscriptions.length; i += 1) {
			const artistId = user.subscriptions[i];
			if (artistId in updatedArtists) {
				updatedSubscriptions.push(updatedArtists[artistId]);
			}
		}
		return {
			email: user.email,
			updatedSubscriptions
		};
	});

	db.connection.close();
	logger.info(`Created notification list: ${notificationList.length} users have updates`);
	return notificationList;
};