import React from 'react';
import PropTypes from 'prop-types';
import * as Ra from 'ramda-adjunct';
import { css } from 'emotion';

const partClassName = css`
  position: absolute;
  top: 0;
  right: 0;
  width: 100vw;
  height: 100vh;
`;

const partPreloadingClassName = css`
  position: absolute;
  top: 100vh;
  right: 0;
  width: 100vw;
  height: 100vh;
`;

const partPreloadingDebugClassName = css`
  position: absolute;
  top: 1em;
  right: 1em;
  width: 25vw;
  height: 25vh;
  border: 1px solid rgba(0, 0, 0, 0.25);

  & > * {
    transform: scale(0.25);
  }
`;

export function DefaultPartContainer({ part, sequence, component, debug }) {
  const className = part.preloading
    ? debug
      ? partPreloadingDebugClassName
      : partPreloadingClassName
    : partClassName;
  return (
    <ErrorBoundary>
      <div className={className}>
        {Ra.isFunction(component) ? React.createElement(component, { part, sequence }) : null}
      </div>
    </ErrorBoundary>
  );
}

DefaultPartContainer.propTypes = {
  part: PropTypes.object.isRequired,
  sequence: PropTypes.object.isRequired,
  component: PropTypes.elementType,
  debug: PropTypes.bool.isRequired,
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, stack: null };
  }

  static getDerivedStateFromError(error) {
    return {
      error: error.message ? error.message : 'Unknown error',
      stack: error.stack ? error.stack.split('\n').slice(1).join('\n') : '',
    };
  }

  render() {
    if (this.props.children) {
      if (!this.state.error) {
        return this.props.children;
      }
    }
    return null;
  }
}

ErrorBoundary.propTypes = {
  children: PropTypes.node,
};
