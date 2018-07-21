/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import SyntheticMouseEvent from './SyntheticMouseEvent';
import {extend} from 'events/SyntheticEvent';

/**
 * @interface DragEvent
 * @see http://www.w3.org/TR/DOM-Level-3-Events/
 */
class SyntheticDragEvent extends SyntheticMouseEvent {}
extend(SyntheticDragEvent, {
  dataTransfer: null,
});

export default SyntheticDragEvent;
