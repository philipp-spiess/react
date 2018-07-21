/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import SyntheticUIEvent from './SyntheticUIEvent';
import {extend} from 'events/SyntheticEvent';

/**
 * @interface FocusEvent
 * @see http://www.w3.org/TR/DOM-Level-3-Events/
 */
class SyntheticFocusEvent extends SyntheticUIEvent {}
extend(SyntheticFocusEvent, {
  relatedTarget: null,
});

export default SyntheticFocusEvent;
