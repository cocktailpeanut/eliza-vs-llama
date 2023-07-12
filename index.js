var ElizaBot = require('./eliza');
class Eliza {
  async start(req, ondata, kernel) {
    let eliza = new ElizaBot(false)
    return {
      message: eliza.getInitial(),
      eliza,
    }
  }
  async reply(req, ondata, kernel) {
    /*
      req :- {
        params: {
          message: "hi",
          eliza
        }
      }
    */
    console.log("reply", req)
    let eliza = req.params.eliza
    return {
      message: eliza.transform(req.params.message),
      eliza
    }
  }
}
module.exports = Eliza
