/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  SyntheticEventNormalizer,
  createSyntheticEventCreator,
} from 'events/SyntheticEvent';

const SyntheticClipboardEventNormalizer = Object.assign(
  {},
  SyntheticEventNormalizer,
  {
    clipboardData: function(event) {
      return 'clipboardData' in event
        ? event.clipboardData
        : window.clipboardData;
    },
  },
);

export const createSyntheticClipboardEvent = createSyntheticEventCreator(
  SyntheticClipboardEventNormalizer,
);
