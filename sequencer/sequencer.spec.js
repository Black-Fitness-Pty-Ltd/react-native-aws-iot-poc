import React from 'react';
import moment from 'moment';
import timekeeper from 'timekeeper';
import { act } from '@testing-library/react';
import { useDispatch } from 'react-redux';
import { render } from '../../test-utils';
import { Sequencer } from '.';

jest.mock('react-redux', () => ({
  useDispatch: jest.fn().mockReturnValue(jest.fn()),
}));

const SPECIAL_DAY = moment.utc('1979-07-01T00:00:00Z');

const Part1 = () => <div data-testid="part1"></div>;
const Part2 = () => <div data-testid="part2"></div>;
const Part3 = () => <div data-testid="part3"></div>;

// This sequence contains a few errors on purpose
const sequence = {
  startsAt: moment.utc(SPECIAL_DAY).toISOString(),
  endsAt: moment.utc(SPECIAL_DAY).add(300, 's').toISOString(),
  duration: 300,
  parts: [
    {
      type: 'live',
      offset: 60,
      duration: 180,
      props: {
        foo: 'part2',
      },
    },
    {
      type: 'post',
      offset: 60 + 180,
      duration: 60,
      props: {
        foo: 'part3',
      },
    },
    {
      type: 'pre',
      offset: 0,
      duration: 60,
      props: {
        foo: 'part1',
      },
    },
  ],
};

function testPartToComponentMatcher(part) {
  switch (part.type) {
    case 'pre':
      return { component: Part1 };
    case 'live':
      return { component: Part2, preloadDuration: 30 };
    case 'post':
      return { component: Part3 };
  }
}

describe('<Sequencer />', () => {
  const advanceTime = (s) => {
    let ms = s * 1000;
    const end = Date.now() + ms;
    while (Date.now() < end) {
      const step = Math.min(1000, ms);
      jest.advanceTimersByTime(step);
      timekeeper.travel(Date.now() + step);
    }
  };

  beforeEach(() => {
    jest.useFakeTimers();
    timekeeper.freeze();
  });

  afterEach(() => {
    timekeeper.reset();
  });

  it('should render the first element when the current time is before the start', () => {
    // Arrange
    timekeeper.travel(moment.utc(SPECIAL_DAY).subtract(1, 'minute').toDate());

    // Act
    const { getByTestId } = render(
      <Sequencer sequence={sequence} partToComponentMapper={testPartToComponentMatcher} />
    );

    // Assert
    expect(getByTestId('part1')).not.toBeNil();
    expect(useDispatch).toHaveBeenCalled();
  });

  it('should render the last element when the current time is after the end', () => {
    // Arrange
    timekeeper.travel(moment.utc(SPECIAL_DAY).add(1, 'hour').toDate());

    // Act
    const { getByTestId } = render(
      <Sequencer sequence={sequence} partToComponentMapper={testPartToComponentMatcher} />
    );

    // Assert
    expect(getByTestId('part3')).not.toBeNil();
  });

  it('should render the given sequence', () => {
    // Arrange
    timekeeper.travel(moment.utc(SPECIAL_DAY).toDate());
    const { getByTestId } = render(
      <Sequencer sequence={sequence} partToComponentMapper={testPartToComponentMatcher} />
    );

    // Act / Assert
    act(() => {
      advanceTime(1);
    });
    expect(getByTestId('part1')).not.toBeNil();

    act(() => {
      advanceTime(58);
    });
    expect(getByTestId('part1')).not.toBeNil();
    expect(getByTestId('part2')).not.toBeNil();

    act(() => {
      advanceTime(2);
    });
    expect(getByTestId('part2')).not.toBeNil();

    act(() => {
      advanceTime(178);
    });
    expect(getByTestId('part2')).not.toBeNil();

    act(() => {
      advanceTime(2);
    });
    expect(getByTestId('part3')).not.toBeNil();

    act(() => {
      advanceTime(60);
    });
    expect(getByTestId('part3')).not.toBeNil();
  });
});
