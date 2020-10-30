import { StatusBar } from 'expo-status-bar'
import React, { useEffect, useState } from 'react'
import * as R from 'ramda'
import * as Ra from 'ramda-adjunct'
import { StyleSheet, Text, View, Button } from 'react-native'
import queryString from 'query-string'
import flatten from 'flat'
import { IotClient } from './iot'
import { Sequencer } from './sequencer'
import { makeFakePodShadow } from './fake-data'

const thingName = 'mm-laptop-pod'
const ca = Buffer.from('LS0tLS1CRUdJTiBDRVJUSUZJQ0FURS0tLS0tCk1JSURRVENDQWltZ0F3SUJBZ0lUQm15Zno1bS9qQW81NHZCNGlrUG1salpieWpBTkJna3Foa2lHOXcwQkFRc0YKQURBNU1Rc3dDUVlEVlFRR0V3SlZVekVQTUEwR0ExVUVDaE1HUVcxaGVtOXVNUmt3RndZRFZRUURFeEJCYldGNgpiMjRnVW05dmRDQkRRU0F4TUI0WERURTFNRFV5TmpBd01EQXdNRm9YRFRNNE1ERXhOekF3TURBd01Gb3dPVEVMCk1Ba0dBMVVFQmhNQ1ZWTXhEekFOQmdOVkJBb1RCa0Z0WVhwdmJqRVpNQmNHQTFVRUF4TVFRVzFoZW05dUlGSnYKYjNRZ1EwRWdNVENDQVNJd0RRWUpLb1pJaHZjTkFRRUJCUUFEZ2dFUEFEQ0NBUW9DZ2dFQkFMSjRnSEhLZU5YagpjYTlIZ0ZCMGZXN1kxNGgyOUpsbzkxZ2hZUGwwaEFFdnJBSXRodE9nUTNwT3NxVFFOcm9Cdm8zYlNNZ0hGelpNCjlPNklJOGMrNnpmMXRSbjRTV2l3M3RlNWRqZ2RZWjZrL29JMnBlVktWdVJGNGZuOXRCYjZkTnFjbXpVNUwvcXcKSUZBR2JIclFnTEttK2Evc1J4bVBVRGdIM0tLSE9WajR1dFdwK1Vobk1KYnVsSGhlYjRtalVjQXdobWFoUldhNgpWT3VqdzVINVNOei8wZWd3TFgwdGRIQTExNGdrOTU3RVdXNjdjNGNYOGpKR0tMaEQrcmNkcXNxMDhwOGtEaTFMCjkzRmNYbW4vNnBVQ3l6aUtybEE0Yjl2N0xXSWJ4Y2NlVk9GMzRHZklENXlISTlZL1FDQi9JSURFZ0V3K095UW0KamdTdWJKcklxZzBDQXdFQUFhTkNNRUF3RHdZRFZSMFRBUUgvQkFVd0F3RUIvekFPQmdOVkhROEJBZjhFQkFNQwpBWVl3SFFZRFZSME9CQllFRklRWXpJVTA3THdNbEpRdUNGbWN4N0lRVGdvSU1BMEdDU3FHU0liM0RRRUJDd1VBCkE0SUJBUUNZOGpkYVFaQ2hHc1YyVVNnZ05pTU9ydVlvdTZyNGxLNUlwREIvRy93a2pVdTB5S0dYOXJieGVuREkKVTVQTUNDamptQ1hQSTZUNTNpSFRmSVVKclU2YWRUckNDMnFKZUhaRVJ4aGxiSTFCamp0L21zdjB0YWRRMXdVcwpOK2dEUzYzcFlhQUNidlh5OE1XeTdWdTMzUHFVWEhlZUU2Vi9VcTJWOHZpVE85NkxYRnZLV2xKYllLOFU5MHZ2Cm8vdWZRSlZ0TVZUOFF0UEhSaDhqcmRrUFNIQ2EyWFY0Y2RGeVF6UjFibGRad2dKY0ptQXB6eU1aRm82SVE2WFUKNU1zSSt5TVJRK2hES1hKaW9hbGRYZ2pVa0s2NDJNNFV3dEJWOG9iMnhKTkRkMlpod0xub1FkZVhlR0FEYmtweQpycVhSZmJvUW5vWnNHNHE1V1RQNDY4U1F2dkc1Ci0tLS0tRU5EIENFUlRJRklDQVRFLS0tLS0K', 'base64')
const headers = {
  // Get from API
}
const customAuthClientId = 'booking-1337-client-6ffa624b-f2a6-4e5d-bb6b-322e0181312f'

export default function App () {
  const [connect, setConnect] = useState(false)
  const [desiredState, setDesiredState] = useState(null) // makeFakePodShadow() for testing
  const sequence = R.pathOr(null, ['app', 'session'], desiredState)
  return (
    <View style={styles.container}>
      <Button onPress={() => setConnect(R.not)} title={!connect ? 'Connect' : 'Disconnect'} />
      {connect ? <Iot setDesiredState={setDesiredState} /> : null}
      {sequence ? <Sequencer sequence={sequence} partToComponentMapper={partToComponentMapper} sequenceContainerComponent={SequenceContainer} partContainerComponent={PartContainer} debuggerComponent={View} /> : <Text>No sequence</Text>}
      <StatusBar style="auto" />
    </View>
  )
}

function Iot ({ setDesiredState }) {
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    const iotClient = new IotClient({
      caCert: ca,
      clientId: customAuthClientId,
      host: 'a3emo8omu11ym8-ats.iot.ap-southeast-2.amazonaws.com',
      port: 443,
      path: '/mqtt',
      baseReconnectTimeMs: 10000,
      keepalive: 30,
      protocol: 'wss-custom-auth',
      customAuthHeaders: {},
      debug: true,
      will: {
        topic: `lwt/${customAuthClientId}`,
        payload: JSON.stringify({
          state: {
            reported: {
              system: { connected: false }
            }
          }
        })
      },
      username: '?SDK=NodeJSv2&Version=1.3.0&' + queryString.stringify(headers),
      logger: { debug: console.debug, info: console.log, warn: console.warn, error: console.error }
    })

    iotClient.on('connect', async () => {
      setDesiredState({})
      setConnected(true)
      await iotClient.register(thingName)
    })

    iotClient.on('close', () => {
      setDesiredState({})
      setConnected(false)
    })

    iotClient.on('offline', () => {
      setDesiredState({})
      setConnected(false)
    })

    iotClient.on('thingShadowChanged', (thingName, shadow) => {
      setDesiredState(R.pipe(R.path(['state', 'desired']), R.evolve({ app: flatten.unflatten }))(shadow))
    })

    return () => iotClient.disconnect()
  }, [])

  return <Text>Connected: {connected ? 'true' : 'false'}</Text>
}

function ComponentDebug ({ part }) {
  return (
    <View style={{ opacity: part.preloading ? 0.2 : 0.8 }}>
      <Text>{part.type}</Text>
      <Text>{JSON.stringify(part, null, 2)}</Text>
    </View>
  )
}

function partToComponentMapper () {
  return { preloadDuration: 15, component: ComponentDebug }
}

function SequenceContainer ({ children }) {
  return <View>{children}</View>
}

function PartContainer ({ part, sequence, component, debug }) {
  return Ra.isFunction(component) ? React.createElement(component, { part, sequence }) : null
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  }
})
