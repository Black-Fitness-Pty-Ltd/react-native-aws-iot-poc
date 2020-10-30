import React, { useEffect, useState } from 'react'
import PropTypes from 'prop-types'
import * as R from 'ramda'
import * as Ra from 'ramda-adjunct'
import mem from 'mem'
import invariant from 'invariant'
import moment from 'moment'
import * as yup from 'yup'
import hash from 'object-hash'
// import { setReportedState } from 'common/state/iot'
import { useForceRenderDeadline } from '../timer-hooks'

yup.addMethod(yup.object, 'moment', function () {
  return this.test('is-moment', '${path} is not a moment', (value) => moment.isMoment(value))
})

const PART_SCHEMA = yup.object({
  startsAt: yup.object().moment().required(),
  endsAt: yup.object().moment().required(),
  first: yup.boolean().required(),
  last: yup.boolean().required(),
  preloading: yup.boolean().required(),
  offset: yup.number().min(0).required(),
  duration: yup.number().min(1).required(),
  type: yup.string(1).required(),
  props: yup.object().required()
})

const cleanUpSequence = mem((sequence, speed = 1.0) => {
  // Sort
  const sortedParts = R.sortBy(R.prop('offset'), sequence.parts)

  // Adjust durations
  const adjustedParts = Ra.mapIndexed((part, index, parts) => {
    if (index < parts.length - 1 && part.offset + part.duration > parts[index + 1].offset) {
      console.warn(
        `Adjusting the duration of sequence part ${index} because it overlaps with the next part`
      )
      return { ...part, duration: parts[index + 1].offset - part.offset }
    } else {
      return part
    }
  }, sortedParts)

  // Fill gaps
  const gaplessParts = R.addIndex(R.reduce)(
    (acc, part, index, parts) => {
      acc.push(part)
      if (index < parts.length - 1) {
        const currentEnd = part.offset + part.duration
        const nextStart = parts[index + 1].offset
        if (currentEnd < nextStart) {
          console.warn(`Adding a null part in the gap between parts ${index} and ${index + 1}`)
          acc.push({ offset: currentEnd, duration: nextStart - currentEnd, component: null })
        }
      }
      return acc
    },
    [],
    adjustedParts
  )

  // Adjust duration and parts for speed and convert to milliseconds
  const speedUp = R.multiply(1000 / speed)
  const duration = speedUp(sequence.duration)
  const speedUpParts = R.map(R.evolve({ offset: speedUp, duration: speedUp }), gaplessParts)

  return R.mergeLeft(
    {
      duration,
      endsAt: moment.utc(sequence.startsAt).add(duration, 'seconds'),
      parts: speedUpParts
    },
    sequence
  )
})

export function Sequencer ({
  sequence,
  speed,
  debug,
  partToComponentMapper,
  sequenceContainerComponent,
  partContainerComponent,
  debuggerComponent
}) {
  sequence = cleanUpSequence(sequence, speed)

  const nowTime = moment.utc()
  const startTime = moment.utc(sequence.startsAt)
  const endTime = moment.utc(sequence.endsAt)
  const parts = sequence.parts

  // Determine parts
  const index = determinePartIndex(nowTime.diff(startTime), parts)
  const current = makePart(parts, index, startTime)
  const next = makePart(parts, index + 1, startTime)
  invariant(PART_SCHEMA.isValidSync(current), 'Bug in sequencer')
  invariant(next === null || PART_SCHEMA.isValidSync(next), 'Bug in sequencer')

  // Determine the time of the next sequencing action which is either:
  // - rendering the next part
  // - pre-loading the next part
  let deadline = current.endsAt
  if (nowTime.isAfter(endTime)) {
    // If sequence has ended, deadline it not really needed
    deadline = moment.utc(nowTime).add(60, 's')
  }
  if (next) {
    const { preloadDuration } = partToComponentMapper(next)
    if (Ra.isNumber(preloadDuration)) {
      // Adding 1 second because the deadline scheduler may fire a few ms
      // before the deadline because it guarantees close, but never after.
      const preloadStartsAt = moment.utc(next.startsAt).subtract(preloadDuration + 1, 's')
      if (nowTime.isBefore(preloadStartsAt) && preloadStartsAt.isBefore(deadline)) {
        deadline = preloadStartsAt
      } else {
        next.preloading = true
      }
    }
  }

  // Update reported state (and clear on unmount)
  useUpdateReportedStatus({ sequencePart: current.type })

  // Force re-render as soon as the current part reaches its end. The callback
  // does not do anything, but the useDeadline hook cause a state change so
  // this component is re-rendered.
  useForceRenderDeadline(deadline)

  // Build our component (not using JSX because all component types are
  // variables).
  const children = []
  if (debug) {
    children.push(React.createElement(debuggerComponent, { key: 'debug', current, next }))
  }
  children.push(
    React.createElement(partContainerComponent, {
      key: 'current',
      part: current,
      sequence,
      component: R.propOr(null, 'component', partToComponentMapper(current)),
      debug
    })
  )
  if (next && next.preloading) {
    children.push(
      React.createElement(partContainerComponent, {
        key: 'next',
        part: next,
        sequence,
        component: R.propOr(null, 'component', partToComponentMapper(next)),
        debug
      })
    )
  }

  return React.createElement(sequenceContainerComponent, {}, children)
}

Sequencer.propTypes = {
  sequence: PropTypes.object.isRequired,
  speed: PropTypes.number.isRequired,
  debug: PropTypes.bool.isRequired,
  partToComponentMapper: PropTypes.func.isRequired,
  sequenceContainerComponent: PropTypes.elementType.isRequired,
  partContainerComponent: PropTypes.elementType.isRequired,
  debuggerComponent: PropTypes.elementType.isRequired
}

Sequencer.defaultProps = {
  speed: 1.0,
  debug: false
}

const isBefore = (t, part) => t < part.offset
const isAfter = (t, part) => t >= part.offset + part.duration
const isDuring = R.curry((t, part) => t >= part.offset && t < part.offset + part.duration)

function determinePartIndex (offsetTime, parts) {
  if (isBefore(offsetTime, R.head(parts))) {
    return 0
  } else if (isAfter(offsetTime, R.last(parts))) {
    return R.length(parts) - 1
  } else {
    return R.findIndex(isDuring(offsetTime), parts)
  }
}

function makePart (parts, index, startTime) {
  const part = R.nth(index, parts)
  if (part) {
    return {
      startsAt: moment.utc(startTime).add(part.offset, 'ms'),
      endsAt: moment.utc(startTime).add(part.offset + part.duration, 'ms'),
      first: index === 0,
      last: index === R.length(parts) - 1,
      preloading: false,
      ...R.pick(['duration', 'offset', 'props', 'type'], part)
    }
  } else {
    return null
  }
}

// Set the given status object as the reported state and reset to empty when
// the component is unmounted.
function useUpdateReportedStatus (status) {
  // const [currentStatus, setCurrentStatus] = useState(null)

  // const dispatch = useDispatch()
  // useEffect(() => () => dispatch(setReportedState({ status: { sequencePart: '' } })), [dispatch])

  // const newStatus = hash(status)
  // if (currentStatus !== newStatus) {
  //   setCurrentStatus(newStatus)
  //   dispatch(setReportedState({ status }))
  // }
}
