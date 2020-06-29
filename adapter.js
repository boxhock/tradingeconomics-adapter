const { Requester, Validator } = require('@chainlink/external-adapter')
const TeClient = require('tradingeconomics-stream')
const API_CLIENT_KEY = process.env.API_CLIENT_KEY
const API_CLIENT_SECRET = process.env.API_CLIENT_SECRET
const subscribeSymbols = process.env.SYMBOLS || ""

let prices = {}

const subscribe = asset => {
    const client = new TeClient({
        url: 'ws://stream.tradingeconomics.com/',
        key: API_CLIENT_KEY,
        secret: API_CLIENT_SECRET,
        reconnect: true
    })

    client.subscribe(asset)

    client.on('message', msg => {
        console.log(`Got price for asset ${asset}:`, msg.price)
        prices[asset] = msg.price
    })
}

const startService = () => {
    const symbols = subscribeSymbols.split(',')
    for (let i = 0; i < symbols.length; i++) {
        const symbol = commonSymbols[symbols[i]]
        subscribe(symbol)
    }
}

const customParams = {
    base: ['base', 'from', 'asset']
}

const commonSymbols = {
    N225: 'NKY:IND',
    FTSE: 'UKX:IND'
}

const createRequest = (input, callback) => {
    const validator = new Validator(callback, input, customParams)
    const jobRunID = validator.validated.id
    let symbol = validator.validated.data.base.toUpperCase()
    if (symbol in commonSymbols) {
        symbol = commonSymbols[symbol]
    }

    const price = Number(prices[symbol])
    if (price > 0) {
        const response = {
            data: {
                result: price
            },
            result: price,
            status: 200
        }
        return callback(response.status, Requester.success(jobRunID, response))
    }

    // Fall back to getting the data from HTTP endpoint
    const url = `https://api.tradingeconomics.com/markets/symbol/${symbol}`

    const params = {
        c: `${API_CLIENT_KEY}:${API_CLIENT_SECRET}`
    }

    const config = {
        url,
        params
    }

    const _handleResponse = response => {
        if (!response.data || response.data.length < 1) {
            return callback(500, Requester.errored(jobRunID, 'no result for query'))
        }
        // Replace array by the first object in array
        // to avoid unexpected behavior when returning arrays.
        response.data = response.data[0]

        response.data.result = Requester.validateResultNumber(response.data, ['Last'])
        prices[symbol] = response.data.result
        callback(response.status, Requester.success(jobRunID, response))
    }

    const _handleError = error => callback(500, Requester.errored(jobRunID, error))

    Requester.request(config)
        .then(_handleResponse)
        .catch(_handleError)
}

module.exports = {
    startService: startService,
    createRequest: createRequest
}
