const Voting = artifacts.require('TestContract');
const params = require('../deploymentParams')();
const proposals = params[0];
const duration = params[2] - params[1];

// Tests for after the voting period
// The contract used is a modified version of the original contract

contract('Voting-after', accounts => {
	let Instance

	beforeEach(() => {
		return Voting.deployed().then(instance => {
			Instance = instance;
		});		
	});

	it("tries to vote", () => {
		return Instance.vote.call(proposals[0])
		.then(assert.fail).catch(error => {
			assert(error.message.indexOf("Voting period must be open") > 0)
		})
	})

	it("tries to register as a curator", () => {
		return Instance.registerAsCurator.call(1)
		.then(assert.fail).catch(error => {
			assert(error.message.indexOf("Voting period must be open") > 0)
		})
	})

	it("sets up the last test (1) ", () => {
		return Instance.votingOn()
		.then(() => {
			return Instance.OPEN.call()
		}).then(isOpen => {
			assert(isOpen)
		})
	})

	it("sets up the last test (2) ", () => {
		return Instance.registerAsCurator(1, { from: accounts[9] })
	})

	it("sets up the last test (3) ", () => {
		return Instance.votingOff()
		.then(() => {
			return Instance.OPEN.call()
		}).then(isOpen => {
			assert(!isOpen)
		})
	})	

	it("tries to delegate", () => {
		return Instance.delegateVote(1)
		.then(assert.fail).catch(error => {
			assert(error.message.indexOf("Voting period must be open") > 0)
		})
	})	
})