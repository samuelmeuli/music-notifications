const logger = require('winston');
const mongoose = require('mongoose');

const dbConfig = require('../config/db-config');

// database schemas
const artistSchema = require('./models/artist-schema');
const userSchema = require('./models/user-schema');

const authUrl = `mongodb://${dbConfig.username}:${dbConfig.password}@${dbConfig.url}:${dbConfig.port}/${dbConfig.database}`;


/**
 * CONNECT TO DATABASE
 */
exports.connect = () => new Promise((resolve, reject) => {
	mongoose.Promise = global.Promise; // use native Node promises for Mongoose

	logger.debug('Trying to connect to database');
	const connection = mongoose.createConnection(authUrl, { useMongoClient: true });

	connection.on('error', (err) => {
		logger.error(`Database connection error: ${err}`);
		return reject();
	});

	connection.once('open', () => {
		logger.debug('Connected to DB');

		// create models from Mongoose schemas
		const ArtistModel = connection.model('Artist', artistSchema);
		const UserModel = connection.model('User', userSchema);

		// return database connection and models
		return resolve({
			connection,
			Artist: ArtistModel,
			User: UserModel
		});
	});
});