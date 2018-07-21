/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import SyntheticEvent, {extend} from 'events/SyntheticEvent';

/**
 * @interface Event
 * @see http://www.w3.org/TR/clipboard-apis/
 */
class SyntheticClipboardEvent extends SyntheticEvent {}
extend(SyntheticClipboardEvent, {
  clipboardData: function(event) {
    return 'clipboardData' in event
      ? event.clipboardData
      : window.clipboardData;
  },
});

export default SyntheticClipboardEvent;
