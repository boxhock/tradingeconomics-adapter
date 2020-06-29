const bootstrap = require('@chainlink/ea-bootstrap')
const { startService, createRequest } = require('./adapter')

const run = () => {
    startService()
    bootstrap.server.init(createRequest)()
}

run()
