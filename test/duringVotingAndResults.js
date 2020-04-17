const Voting = artifacts.require('TestContract');
const params = require('../deploymentParams')();
const proposals = params[0];
const duration = params[2] - params[1];

/*
 Tests for during the voting period
 The contract used is here a modified version of the original contract
this modification was made in order to allow setting the voting period on/off externally


CONDITIONS TESTED
(the number in parethesis is the number of the test(s) that tests that condition)

An account can't VOTE in a proposal if:
- It has already voted (2)
- It has already delegated its vote (17)
- The proposal id is invalid (22)

An account can't DELEGATE its vote to an curator if:
- It has already voted (8)
- It has already delegated its vote (15, 16)
- The curator id is '0' (20)
- The curator id does not correspond to any curator (21)
- It has registered as an curator himself (12)

An account can't REGISTER AS CURATOR if:
- It has already voted (3)
- It has already delegated its vote (10)
- It has already registered as a curator(5, 6)
- The id chosen is already taken (18)
- The id chosen is '0' (19)


*/
contract('Voting-during-and-results', accounts => {
	let [A, B, C, D, E, F] = accounts.slice(0, 6)
	let totalVotes = {1 : 0,
		2: 0,
		10: 0
	}

	beforeEach(() => {
		return Voting.deployed().then(instance => {
			Instance = instance;
		});		
	});

	function checkReceipt(receipt, event, ...args) {
		assert.equal(receipt.logs[0].event, event, "Wrong event name")
		assert.equal(receipt.logs[0].args.__length__, args.length, "Wrong number of arguments")
		for(let i = 0; i < args.length; i++) {
			if((typeof args[i]) == 'number')
				arg = receipt.logs[0].args[i].toNumber()
			else
				arg = receipt.logs[0].args[i]
			assert.equal(arg, args[i], `Argument ${i+1} doesn't match`)
		}
	}

	function errorMessage(error, message) {
		assert(error.message.indexOf(message) > 0)
	}

	function voteSpent(error) {
		errorMessage(error, "Vote have already been spent")
	}

	it("sets the voting period", () => {
		return Instance.votingOn()
		.then(receipt => {
			return Instance.OPEN.call()
		}).then(isOpen => {
			assert(isOpen)
		})
	})

	it("1 - 'A' votes", () => {
		return Instance.vote(proposals[0], { from: A})
		.then(receipt => {
			checkReceipt(receipt, 'directVote', proposals[0], A)			
			totalVotes[proposals[0]]++;
			return Instance.voteSpent.call(A)
		}).then(bool => {
			assert(bool)
			return Instance.proposals.call(proposals[0])
		}).then(proposal => {
			assert.equal(proposal.directVotes, 1)
		})
	})

	it("2 - 'A' tries to vote again", () => {
		return Instance.vote(proposals[0], { from: A})
		.then(assert.fail).catch(error => {
			voteSpent(error)
		})
	})

	it("3 - 'A' tries to register as curator", () => {
		return Instance.registerAsCurator(1, { from: A })
		.then(assert.fail).catch(error => {
			voteSpent(error)
		})
	})

	it("4 - 'B' registers as curator", () => {
		return Instance.registerAsCurator(1, { from: B})
		.then(receipt => {
			checkReceipt(receipt, "curatorRegistered", 1)
			return Instance.isCuratorAddress.call(B)
		}).then(bool => {
			assert(bool)
		})
	})

	it("5 - 'B' tries to register again with same id", () => {
		return Instance.registerAsCurator(1, { from: B})
		.then(assert.fail).catch(error => {
			errorMessage(error, "Can't register more than once")
		})
	})

	it("6 - 'B' tries to register again with different id", () => {
		return Instance.registerAsCurator(2, { from: B})
		.then(assert.fail).catch(error => {
			errorMessage(error, "Can't register more than once")			
		})
	})

	it("7 - 'B' votes", () => {
		return Instance.vote(proposals[2], { from: B})
		.then(receipt => {
			checkReceipt(receipt, "curatorVote", proposals[2], 1)
			totalVotes[proposals[2]]++;
			return Instance.voteSpent.call(A)
		}).then(bool => {
			assert(bool)
			return Instance.getProposalCurators.call(proposals[2])
		}).then(curators => {
			assert.equal(curators.length, 1)
			assert.equal(curators[0].toNumber(), 1)
		})
	})

	it("8 - 'A' tries to delegate to 'B'", () => {
		return Instance.delegateVote(1, { from: A })
		.then(assert.fail).catch(error => {
			voteSpent(error)
		})
	})

	it("9 - 'C' delegates to 'B'", () => {
		return Instance.delegateVote(1, { from: C })
		.then(receipt => {
			checkReceipt(receipt, "voteDelegated", 1, C)
			totalVotes[proposals[2]]++
			return Instance.curators(1)
		}).then(curator => {
			assert.equal(curator.votes.toNumber(), 2)
		})
	})

	it("10 - 'C' tries to register as curator", () => {
		return Instance.registerAsCurator(2, { from: C})
		.then(assert.fail).catch(error => {
			voteSpent(error)
		})
	})

	it("11 - 'D' registers as curator", () => {
		return Instance.registerAsCurator(2, { from: D})
		.then(receipt => {
			checkReceipt(receipt, "curatorRegistered", 2)
			return Instance.isCuratorAddress.call(D)
		}).then(bool => {
			assert(bool)
		})
	})

	it("12 - 'D' tries to delegate to 'B'", () => {
		return Instance.delegateVote(1, { from: D })
		.then(assert.fail).catch(error => {
			errorMessage(error, "Curators can't delegate their votes")			
		})
	})

	it("13 - 'D' votes", () => {
		return Instance.vote(proposals[2], { from: D})
		.then(receipt => {
			checkReceipt(receipt, "curatorVote", proposals[2], 2)
			totalVotes[proposals[2]]++;
			return Instance.voteSpent.call(A)
		}).then(bool => {
			assert(bool)
			return Instance.getProposalCurators.call(proposals[2])
		}).then(curators => {
			assert.equal(curators.length, 2)
			assert.equal(curators[1].toNumber(), 2)
		})
	})

	it("14 - 'E' delegates to 'D'", () => {
		return Instance.delegateVote(2, { from: E })
		.then(receipt => {
			checkReceipt(receipt, "voteDelegated", 2, E)
			totalVotes[proposals[2]]++;
			return Instance.curators(1)
		}).then(curator => {
			assert.equal(curator.votes.toNumber(), 2)
		})
	})

	it("15 - 'E' tries to delegate to 'D' again", () => {
		return Instance.delegateVote(2, { from: E })
		.then(assert.fail).catch(error => {
			voteSpent(error)
		})
	})

	it("16 - 'E' tries to delegate to 'B'", () => {
		return Instance.delegateVote(1, { from: E })
		.then(assert.fail).catch(error => {
			voteSpent(error)
		})
	})

	it("17 - 'E' tries to vote", () => {
		return Instance.vote(proposals[1], { from: E})
		.then(assert.fail).catch(error => {
			voteSpent(error)
		})
	})

	it("18 - 'F' tries to register with id already been used", () => {
		return Instance.registerAsCurator(1, { from: F })
		.then(assert.fail).catch(error => {
			errorMessage(error, "Id already being used")		
		})
	})

	it("19 - 'F' tries to register with an invalid id", () => {
		return Instance.registerAsCurator(0, { from: F })
		.then(assert.fail).catch(error => {
			errorMessage(error, "'0' is an invalid id")		
		})
	})

	it("20 - 'F' tries to delegate to an invalid id (1)", () => {
		return Instance.delegateVote(0, { from: F })
		.then(assert.fail).catch(error => {
			errorMessage(error, "'0' is an invalid id")		
		})
	})

	it("21 - 'F' tries to delegate to an invalid id (2)", () => {
		return Instance.delegateVote(5, { from: F })
		.then(assert.fail).catch(error => {
			errorMessage(error, "Id does not correspond to any curator")		
		})
	})

	it("22 - 'F' tries to vote in an invalid proposal", () => {
		return Instance.vote(0, { from: F })
		.then(assert.fail).catch(error => {
			errorMessage(error, "Invalid proposal id")
		})
	})

	it("23 - 'F' votes", () => {
		return Instance.vote(proposals[2], { from: F})
		.then(receipt => {
			checkReceipt(receipt, 'directVote', proposals[2], F)			
			totalVotes[proposals[2]]++;
			return Instance.voteSpent.call(F)
		}).then(bool => {
			assert(bool)
			return Instance.proposals.call(proposals[2])
		}).then(proposal => {
			assert.equal(proposal.directVotes, 1)
		})
	})

	it("24 - Someone tries to get results during the voting period (1)", () => {
		return Instance.results.call()
		.then(assert.fail).catch(error => {
			errorMessage(error, "Unavailable until voting period ends")
		})
	})

	it("25 - Someone tries to get results during the voting period (2)", () => {
		return Instance.voteCount.call(2)
		.then(assert.fail).catch(error => {
			errorMessage(error, "Unavailable until voting period ends")
		})
	})

	it("Closing voting period", () => {
		return Instance.votingOff()
		.then(() => {
			return Instance.OPEN.call()
		}).then(isOpen => {
			assert(!isOpen)
		})
	})

	it("Checks results (1)", () => {
		return Instance.voteCount.call(proposals[0])
		.then(results => {
			assert.equal(results.toNumber(), totalVotes[proposals[0]])
		})
	})

	it("Checks results (2)", () => {
		return Instance.voteCount.call(proposals[1])
		.then(results => {

			assert.equal(results.toNumber(), totalVotes[proposals[1]])
		})
	})

	it("Checks results (3)", () => {
		return Instance.voteCount.call(proposals[2])
		.then(results => {
			assert.equal(results.toNumber(), totalVotes[proposals[2]])
		})
	})

	it("Checks results (4)", () => {
		return Instance.results.call()
		.then(results => {
			for(let i = 0; i < proposals.length; i++) {
				assert.equal(results['0'][i].toNumber(), proposals[i])
				assert.equal(totalVotes[proposals[i]], results['1'][i])			
			}
		})
	})
})