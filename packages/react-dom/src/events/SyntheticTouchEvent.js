/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {createSyntheticEventCreator} from 'events/SyntheticEvent';
import {SyntheticUIEventNormalizer} from './SyntheticUIEvent';
import getEventModifierState from './getEventModifierState';

const SyntheticTouchEventNormalizer = Object.assign(
  {},
  SyntheticUIEventNormalizer,
  {
    getModifierState: getEventModifierState,
  },
);

export const createSyntheticTouchEvent = createSyntheticEventCreator(
  SyntheticTouchEventNormalizer,
);
