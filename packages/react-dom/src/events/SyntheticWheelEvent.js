/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {createSyntheticEventCreator} from 'events/SyntheticEvent';
import {SyntheticMouseEventNormalizer} from './SyntheticMouseEvent';

/**
 * @interface WheelEvent
 * @see http://www.w3.org/TR/DOM-Level-3-Events/
 */
const SyntheticWheelEventNormalizer = Object.assign(
  {},
  SyntheticMouseEventNormalizer,
  {
    deltaX(event) {
      return 'deltaX' in event
        ? event.deltaX
        : // Fallback to `wheelDeltaX` for Webkit and normalize (right is positive).
          'wheelDeltaX' in event
          ? -event.wheelDeltaX
          : 0;
    },
    deltaY(event) {
      return 'deltaY' in event
        ? event.deltaY
        : // Fallback to `wheelDeltaY` for Webkit and normalize (down is positive).
          'wheelDeltaY' in event
          ? -event.wheelDeltaY
          : // Fallback to `wheelDelta` for IE<9 and normalize (down is positive).
            'wheelDelta' in event
            ? -event.wheelDelta
            : 0;
    },
  },
);

export const createSyntheticWheelEvent = createSyntheticEventCreator(
  SyntheticWheelEventNormalizer,
);
