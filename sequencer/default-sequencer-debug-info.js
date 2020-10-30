import React from 'react';
import PropTypes from 'prop-types';
import { css } from 'emotion';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import { CircularCountdown } from '../circular-countdown';

const componentsClass = css`
  position: absolute;
  top: 1em;
  left: 1em;
  display: inline-block;
  width: 12em;

  .content {
    padding: 1em;
    display: flex;
    flex-direction: column;
    align-items: center;

    .timer {
      font-size: 6em;
    }

    .details {
      width: 100%;
      margin: 0.75em 0 0 0;

      h1 {
        font-size: 1.1em;
        margin: 0 0 0.25em 0;
      }

      dl {
        margin: 0;
        padding: 0;
        font-size: 0.8em;
        display: grid;
        grid-template-columns: auto auto;
        grid-auto-rows: 1fr;
        grid-auto-flow: row;

        dd {
          font-weight: 600;
          justify-self: end;
          margin: 0;
          min-width: 2em;
          text-align: right;

          & .type {
            text-transform: uppercase;
          }
        }
      }
    }
  }
`;

export function DefaultSequencerDebugInfo({ current, next }) {
  return (
    <Card raised className={componentsClass}>
      <CardContent className="content">
        <div className="timer">
          <CircularCountdown fromTime={current.startsAt} toTime={current.endsAt} />
        </div>
        <div className="details">
          <h1>Current part</h1>
          <dl>
            <dt>Type</dt>
            <dd className="type">{current.type}</dd>
            <dt>Start</dt>
            <dd>{current.startsAt.format('HH:mm:ss')}</dd>
            <dt>End</dt>
            <dd>{current.endsAt.format('HH:mm:ss')}</dd>
            <dt>Duration</dt>
            <dd>{(current.duration / 1000).toFixed(2)}s</dd>
          </dl>
        </div>
        {next ? (
          <div className="details">
            <h1>Next part</h1>
            <dl>
              <dt>Type</dt>
              <dd className="type">{next.type}</dd>
              <dt>Start</dt>
              <dd>{next.startsAt.format('HH:mm:ss')}</dd>
              <dt>End</dt>
              <dd>{next.endsAt.format('HH:mm:ss')}</dd>
              <dt>Duration</dt>
              <dd>{(next.duration / 1000).toFixed(2)}s</dd>
              <dt>Preloading</dt>
              <dd>{next.preloading ? 'yes' : 'no'}</dd>
            </dl>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

DefaultSequencerDebugInfo.propTypes = {
  current: PropTypes.object.isRequired,
  next: PropTypes.object,
};
