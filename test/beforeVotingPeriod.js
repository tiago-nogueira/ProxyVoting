const Voting = artifacts.require('ProxyVoting');
const params = require('../deploymentParams')();
const proposals = params[0];
const duration = params[2] - params[1];

// Tests for before the voting starts

contract('Voting-before', accounts => {
	let Instance;

	beforeEach(() => {
		return Voting.deployed().then(instance => {
			Instance = instance;
		});		
	});

	it('checks initial values: proposals and voting times', () => {
		function checkProposal(id, i) {
			return assert.equal(id.toNumber(), proposals[i], `Proposal ${i}'s id doesn't match`);
		}
		function around(a, b) {
			assert.isAtLeast(a + 10, b)
			assert.isAtMost(a - 10, b)
		}
		let votingStart;
		return Instance.proposalsIds.call(0)
		.then(id => {
			checkProposal(id, 0)
			return Instance.proposalsIds.call(1)
		}).then(id => {
			checkProposal(id, 1)
			return Instance.proposalsIds.call(2)
		}).then(id => {
			checkProposal(id, 2)
			return Instance.proposalsIds.call(3)
		}).then(assert.fail).catch(error => {
			assert(error.message.indexOf('invalid opcode') > 0)
			return Voting.web3.eth.getBlock('latest')
		}).then(block => {
			votingStart = block.timestamp
			return Instance.votingStart.call()
		}).then(start => {
			around(start.toNumber(), votingStart + 60)
			return Instance.votingEnd.call()
		}).then(end => {
			around(end.toNumber(), votingStart + duration + 60)
		}) 
	})

	it("checks initial values: votes (direct and from curators)", () => {
		function checkProposal(proposal, i) {
			assert.equal(proposal[0].toNumber(), proposals[i])
			assert.equal(proposal[1].toNumber(), 0)
			assert(!("curators" in Object.keys(proposal)))			
		}
		return Instance.proposals(proposals[0])
		.then(proposal => {
			checkProposal(proposal, 0)
			return Instance.proposals(proposals[1])
		}).then(proposal => {
			checkProposal(proposal, 1)
			return Instance.proposals(proposals[2])
		}).then(proposal => {
			checkProposal(proposal, 2)
		})
	})

	it("tries to vote before the voting period starts", () => {
		return Instance.vote.call(proposals[0])
		.then(assert.fail).catch(error => {
			assert(error.message.indexOf("Voting period not open") > 0)
		})
	})

	it("tries to register as curator before the voting period starts", () => {
		return Instance.registerAsCurator.call(1)
		.then(assert.fail).catch(error => {
			assert(error.message.indexOf("Voting period not open") > 0)
		})
	})

	it("tries to get the results before the voting period starts", () => {
		return Instance.results.call()
		.then(assert.fail).catch(error => {
			assert(error.message.indexOf("Unavailable until voting period ends") > 0)
		})
	})
})