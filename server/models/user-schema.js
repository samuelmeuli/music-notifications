const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
	dateCreated: {
		type: Date
	},
	email: {
		type: String,
		required: true,
		unique: true,
		lowercase: true,
		trim: true
	},
	isActivated: {
		type: Boolean,
		default: false
	},
	// time of last logout / account update (used to invalidate older JWTs)
	lastSignOutTime: {
		type: Number,
		default: 0
	},
	passwordHash: {
		type: String,
		required: true
	},
	// array of artistIds which the user has subscribed to
	subscriptions: {
		type: [Number]
	}
}, { toObject: { virtuals: true }});

// foreign key for mapping IDs in subscriptions list to artist documents
userSchema.virtual('artists', {
	ref: 'Artist',
	localField: 'subscriptions',
	foreignField: 'artistId',
	justOne: false
});

module.exports = userSchema;