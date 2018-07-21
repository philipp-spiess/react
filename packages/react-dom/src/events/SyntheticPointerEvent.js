/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import SyntheticMouseEvent from './SyntheticMouseEvent';
import {extend} from 'events/SyntheticEvent';

/**
 * @interface PointerEvent
 * @see http://www.w3.org/TR/pointerevents/
 */
class SyntheticPointerEvent extends SyntheticMouseEvent {}
extend(SyntheticPointerEvent, {
  pointerId: null,
  width: null,
  height: null,
  pressure: null,
  tiltX: null,
  tiltY: null,
  pointerType: null,
  isPrimary: null,
});

export default SyntheticPointerEvent;
