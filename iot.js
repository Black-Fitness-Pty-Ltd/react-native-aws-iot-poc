import EventEmitter from 'events'
import * as R from 'ramda'
import * as Ra from 'ramda-adjunct'

// Some hacks to make it work with react native. This is probably not solve
// (better to do it in the packager somehow).
global.process = require('process')
global.Buffer = require('buffer').Buffer
const awsIot = require('aws-iot-device-sdk')

function invariant () {}

export function makePromised () {
  const promised = {}
  promised.promise = new Promise((resolve, reject) => {
    promised.resolve = resolve
    promised.reject = reject
  })
  return promised
}

const decodePacket = R.evolve({
  payload: (payload) => {
    payload = Buffer.isBuffer(payload) ? payload.toString('utf8') : payload
    try {
      return JSON.parse(payload)
    } catch (e) {
      return payload
    }
  }
})

export class IotClient extends EventEmitter {
  constructor (options) {
    super()
    this._stats = {
      bytesIn: 0,
      packetsIn: 0,
      messagesIn: 0,
      packetsOut: 0,
      messagesOut: 0,
      foreignStateChangesIn: 0,
      statusesIn: 0
    }
    this._debug = !!options.debug
    this._logger = options.logger
    this._requestQueue = new RequestQueue(options.clientId, this._logger)
    this._registrations = []
    this._connection = awsIot.thingShadow(options)

    this._connection.on('error', (error) => {
      this._logger.error('Connection error', { error })
    })

    this._connection.on('connect', async () => {
      this._logger.info('Connected')
      this._requestQueue.connection = this._connection
      this.emit('connect')
    })

    this._connection.on('reconnect', () => {
      this._logger.info('Reconnect')
    })

    this._connection.on('close', () => {
      this._logger.info('Connection closed')
      this.emit('close')
    })

    this._connection.on('status', (thingName, stat, token, shadow) => {
      this._handleStatusReceived(thingName, stat, token, shadow)
    })

    this._connection.on('offline', () => {
      this._logger.info('Disconnected')
      this._requestQueue.connection = null
      this.emit('offline')
    })

    this._connection.on('timeout', (thingName, clientToken) => {
      this._logger.warn('Request timed out', { clientToken })
      this._requestQueue.retryRequest(clientToken)
    })

    this._connection.on('foreignStateChange', (thingName, opp, shadow) => {
      this._logger.info('Remote shadow change', { thing: thingName, opp, shadow })
      this.emit('thingShadowChanged', thingName, shadow)
    })

    this._connection.on('message', (topic, buffer) => {
      this._logger.info('Message received', { topic, message: buffer.toString('utf8') })
    })

    this._connection.on('packetsend', (packet) => {
      if (this._debug) {
        this._logger.debug('Send', { payload: decodePacket(packet) })
      }
    })

    this._connection.on('packetreceive', (packet) => {
      if (this._debug) {
        this._logger.debug('Receive', { payload: decodePacket(packet) })
      }
    })
  }

  async publish (topic, message) {
    await this._requestQueue.add({
      action: 'publish',
      topic,
      message: JSON.stringify(message)
    })
  }

  disconnect () {
    this._requestQueue.reset()
    this._registrations = []
    const closeImmediately = true
    this._connection.end(closeImmediately)
  }

  async register (thingName) {
    if (!R.includes(thingName, this._registrations)) {
      this._registrations = R.append(thingName, this._registrations)
      while (R.includes(thingName, this._registrations)) {
        try {
          await this._requestQueue.add({ action: 'register', thingName })
          await this._requestQueue.add({ action: 'get', thingName })
          break
        } catch (e) {
          // await delay(1000);
        }
      }
    }
  }

  async unregister (thingName) {
    if (R.includes(thingName, this._registrations)) {
      this._registrations = R.without([thingName], this._registrations)
      await this._requestQueue.add({ action: 'unregister', thingName })
    }
  }

  /**
   * Send an update of the current device state
   * @param {String} thingName
   * @param {*} state - object representing the current state
   */
  reportShadowState (thingName, state) {
    // Clear previously reported state if state is nil
    return this._requestQueue.add({
      action: 'update',
      thingName,
      update: { reported: R.isNil(state) ? null : state }
    })
  }

  _handleStatusReceived (thingName, state, token, shadow) {
    const failed = state === 'rejected'
    if (failed) {
      // TMP: for investigation of intermittent failures
      this._logger.error('_handleStatusReceived receive rejected response', { state })
    }
    this._requestQueue.markComplete(token, failed)
    this.emit('thingShadowChanged', thingName, shadow)
  }
}

class RequestQueue {
  constructor (clientId, logger) {
    this._clientId = clientId
    this._logger = logger
    this._connection = null
    this._outstandingRequestToken = null
    this._pendingRequests = []
    this._clientToken = 1
  }

  set connection (conn) {
    this._connection = conn
    this._trySend()
  }

  reset () {
    this._connection = null
    this._pendingRequests.length = 0
    this._outstandingRequestToken = null
  }

  add (request) {
    invariant(
      R.includes(request.action, ['get', 'update', 'register', 'unregister', 'publish']),
      'request action invalid'
    )
    invariant(
      R.either(Ra.propNotEq('action', 'update'), R.propSatisfies(Ra.isNotNil, 'update'))(request),
      'update field is required for update action'
    )
    invariant(
      R.either(Ra.propNotEq('action', 'publish'), R.propSatisfies(Ra.isNotNil, 'message'))(request),
      'message is required for publish action'
    )
    invariant(
      R.either(
        R.propEq('action', 'publish'),
        R.propSatisfies(Ra.isNonEmptyString, 'thingName')
      )(request),
      'thingName required'
    )

    request.promised = makePromised()

    // TODO: filter out duplicates?
    this._pendingRequests.push(request)
    this._trySend()

    return request.promised.promise
  }

  markComplete (token, failed) {
    invariant(this._outstandingRequestToken === token, 'Pending token mismatch')
    const request = this._pendingRequests.shift()
    const name = request.action
    if (failed) {
      this._logger.error(`${name} request failed`, { thing: request.thingName, requestId: token })
      request.promised.reject(new Error(`${name} request failed`))
    } else {
      this._logger.info(`${name} request complete`, {
        thingName: request.thingName,
        requestId: token
      })
      request.promised.resolve()
    }
    this._outstandingRequestToken = null
    this._trySend()
  }

  retryRequest (clientToken) {
    if (this._outstandingRequestToken === clientToken) {
      this._outstandingRequestToken = null
      this._trySend()
    } else {
      this._logger.warn('Request not pending', { requestId: clientToken })
    }
  }

  _getClientToken () {
    return `${this._clientId}-${this._clientToken++}`
  }

  _trySend () {
    if (this._connection) {
      setTimeout(() => this._doSend(), 0)
    }
  }

  _doSend () {
    if (!this._outstandingRequestToken && !R.isEmpty(this._pendingRequests)) {
      const request = this._pendingRequests[0]
      switch (request.action) {
        case 'get':
          this._outstandingRequestToken = this._connection.get(
            request.thingName,
            this._getClientToken()
          )
          break
        case 'update':
          this._outstandingRequestToken = this._connection.update(request.thingName, {
            state: request.update,
            clientToken: this._getClientToken()
          })
          break
        case 'register':
          {
            const token = this._getClientToken()
            this._outstandingRequestToken = token
            this._connection.register(request.thingName, { state: request.update }, (error) =>
              this.markComplete(token, !!error)
            )
          }
          break
        case 'unregister':
          // Unregister is fire and forget
          this._connection.unregister(request.thingName)
          break
        case 'publish':
          // Publish is fire and forget
          this._connection.publish(request.topic, request.message)
          break
        default:
          invariant(false, `Invalid request type: ${request.action}`)
          break
      }

      const logDetails = {
        requestId: this._outstandingRequestToken,
        ...R.pick(['thingName'], request)
      }

      // Handle fire and forget messages. Drop the request and resolve the
      // promise associated with the request.
      if (!this._outstandingRequestToken) {
        this._logger.info(`Sent ${request.action} message`, logDetails)
        this._pendingRequests.shift()
        request.promised.resolve()
      } else {
        this._logger.debug(`Sent ${request.action} request`, logDetails)
      }
    }
  }
}
