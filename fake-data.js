import * as R from 'ramda'
import moment from 'moment'
import Case from 'case'

function makeIsoString (offset) {
  return moment.utc().add(offset, 'seconds').toISOString()
}

function makeFakeBaseSession ({ startsIn = 0, duration = 900, studio = 'prototype-studio-1' }) {
  return {
    startsAt: makeIsoString(startsIn),
    endsAt: makeIsoString(startsIn + duration),
    duration,
    classInstance: {
      classDefinition: {
        name: 'Mountain Delta',
        product: {
          name: 'Meditation',
          type: 'MEDITATION',
          media: {
            largeLogo: [
              {
                url:
                  'https://static.services.staging.floefit.com/products/meditation/large-logo/logo-lrg-meditation.svg'
              }
            ]
          }
        },
        media: {
          welcomeClassCoverPod: [
            {
              url:
                'https://static.services.staging.floefit.com/class-definitions/2/welcome-class-cover-pod/0.png'
            }
          ],
          welcomeClassCoverApp: [
            {
              url:
                'https://static.services.staging.floefit.com/class-definitions/2/welcome-class-cover-app/0.png'
            }
          ]
        }
      },
      trainer: {
        name: 'Marcel Meulemans',
        media: {
          largeProfile: []
        }
      },
      supportTrainer: null,
      studio: {
        id: studio,
        name: Case.title(studio)
      }
    }
  }
}

export function makeFakeStudioSession (details = {}) {
  const base = makeFakeBaseSession(details)
  return R.mergeDeepLeft(
    {
      classInstance: {
        bookings: [
          {
            id: 42,
            pod: {
              id: 'mm-laptop-pod'
            },
            client: {
              id: '6ffa624b-f2a6-4e5d-bb6b-322e0181312f',
              preferredName: 'Marcel Meulemans'
            },
            clientAttended: true,
            twilioRoom: 'some-room'
          }
        ]
      },
      parts: [
        {
          type: 'pre',
          offset: 0,
          duration: 1,
          props: {}
        },
        {
          type: 'hello',
          offset: 1,
          duration: 119,
          props: {}
        },
        {
          type: 'prepare',
          offset: 120,
          duration: 110,
          props: {}
        },
        {
          type: 'countdown',
          offset: 230,
          duration: 10,
          props: {}
        },
        {
          type: 'live',
          offset: 240,
          duration: 480,
          props: {
            uploadUrl:
              'https://f2hytw34eftdvl.data.mediastore.ap-southeast-2.amazonaws.com/2fe25c15f07110f62f6c5f4266daa8222015f78b9998022109a44b15b5bec503'
          }
        },
        {
          type: 'bye',
          offset: 720,
          duration: 59,
          props: {}
        },
        {
          type: 'post',
          offset: 779,
          duration: 1,
          props: {}
        }
      ],
      stream: {
        startAt: base.startsAt,
        duration: base.duration
      }
    },
    base
  )
}

export function makeFakeStudioShadow (details = {}) {
  return {
    app: {
      session: makeFakeStudioSession(details)
    }
  }
}

export function makeFakePodSession (details = {}) {
  const base = makeFakeBaseSession(details)
  return R.mergeDeepLeft(
    {
      booking: {
        id: 42,
        client: {
          id: '6ffa624b-f2a6-4e5d-bb6b-322e0181312f',
          preferredName: 'Marcel Meulemans'
        },
        clientAttended: true,
        twilioRoom: 'some-room'
      },
      parts: [
        {
          type: 'pre',
          offset: 0,
          duration: 1,
          props: {}
        },
        {
          type: 'hello',
          offset: 1,
          duration: 119,
          props: {}
        },
        {
          type: 'warmup',
          offset: 120,
          duration: 120,
          props: {
            countdown: 3,
            downloadUrls: [
              'https://static.services.staging.floefit.com/on-demand/warmup/master.m3u8',
              'https://static.services.staging.floefit.com/on-demand/warmup/manifest.mpd'
            ]
          }
        },
        {
          type: 'live',
          offset: 240,
          duration: 480,
          props: {
            countdown: 3,
            downloadUrls: [
              'https://streams.services.staging.floefit.com/2fe25c15f07110f62f6c5f4266daa8222015f78b9998022109a44b15b5bec503/manifest.mpd',
              'https://streams.services.staging.floefit.com/2fe25c15f07110f62f6c5f4266daa8222015f78b9998022109a44b15b5bec503/master.m3u8'
            ]
          }
        },
        {
          type: 'bye',
          offset: 720,
          duration: 59,
          props: {}
        },
        {
          type: 'post',
          offset: 779,
          duration: 1,
          props: {}
        }
      ]
    },
    base
  )
}

export function makeFakePodShadow (details = {}) {
  return {
    app: {
      session: makeFakePodSession(details),
      totpSecret: 'secret'
    }
  }
}
