import React from 'react';
import PropTypes from 'prop-types';
import { css } from 'emotion';

const sequenceContainer = css`
  width: 100%;
  height: 100%;
  position: relative;
`;

export function DefaultSequenceContainer({ children }) {
  return <div className={sequenceContainer}>{children}</div>;
}

DefaultSequenceContainer.propTypes = {
  children: PropTypes.node,
};
