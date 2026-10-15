// Single serverless entrypoint for mentorship. Each handler independently validates its authorization.
const owner = require('../mentorship-client-suite/owner-handler.DRAFT.cjs');
const client = require('../mentorship-client-suite/client-handler.DRAFT.cjs');
module.exports = (req,res) => req.query?.scope === 'client' ? client(req,res) : owner(req,res);
