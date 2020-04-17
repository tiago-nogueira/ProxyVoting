proposals = [1, 2, 10]
votingDuration = 2 * 24 * 60 * 60 // two days, in seconds

start = function() {
	return Math.round(Date.now()/1000) + 60
}

module.exports = function() {
	let st = start()
	return [
		proposals,
		st,
		st + votingDuration
	]
}