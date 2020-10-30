import React from 'react';
import PropTypes from 'prop-types';
import { css } from 'emotion';

const componentDebugClass = css`
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  justify-content: center;
  align-items: center;

  h1 {
    font-size: 6vw;
  }

  pre {
    font-size: 0.8vw;
  }
`;

function ComponentDebug({ part }) {
  return (
    <div className={componentDebugClass}>
      <h1>{part.type}</h1>
      <pre>{JSON.stringify(part, null, 2)}</pre>
    </div>
  );
}

ComponentDebug.propTypes = {
  part: PropTypes.object.isRequired,
  sequence: PropTypes.object.isRequired,
};

export function defaultPartToComponentMapper() {
  return { preloadDuration: 15, component: ComponentDebug };
}
