const Voting = artifacts.require("ProxyVoting");
const Testing = artifacts.require('TestContract')
const paramsPacked = require('../deploymentParams')

const params = paramsPacked()
module.exports = function(deployer) {
  deployer.deploy(Voting, ...params)
  .then(() => {
  	return deployer.deploy(Testing, ...params)
  })
};
