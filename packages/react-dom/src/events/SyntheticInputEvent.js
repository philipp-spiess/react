/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import SyntheticEvent, {extend} from 'events/SyntheticEvent';

/**
 * @interface Event
 * @see http://www.w3.org/TR/2013/WD-DOM-Level-3-Events-20131105
 *      /#events-inputevents
 */
class SyntheticInputEvent extends SyntheticEvent {}
extend(SyntheticInputEvent, {
  data: null,
});

export default SyntheticInputEvent;
