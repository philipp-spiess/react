/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import getVendorPrefixedEventName from './getVendorPrefixedEventName';

const interactiveTopLevelEventTypes = {
  topBlur: 'blur',
  topCancel: 'cancel',
  topClick: 'click',
  topClose: 'close',
  topContextMenu: 'contextmenu',
  topCopy: 'copy',
  topCut: 'cut',
  topDoubleClick: 'dblclick',
  topDragEnd: 'dragend',
  topDragStart: 'dragstart',
  topDrop: 'drop',
  topFocus: 'focus',
  topInput: 'input',
  topKeyDown: 'keydown',
  topKeyPress: 'keypress',
  topKeyUp: 'keyup',
  topMouseDown: 'mousedown',
  topMouseUp: 'mouseup',
  topPaste: 'paste',
  topTouchCancel: 'touchcancel',
  topTouchEnd: 'touchend',
  topTouchStart: 'touchstart',
};

const interactiveTopLevelMediaEventTypes = {
  topPause: 'pause',
  topPlay: 'play',
  topRateChange: 'ratechange',
  topSeeked: 'seeked',
  topVolumeChange: 'volumechange',
};

export let interactiveEventTypeNames = ['invalid', 'reset', 'submit'];

const nonInteractiveTopLevelEventTypes = {
  topAnimationEnd: getVendorPrefixedEventName('animationend'),
  topAnimationIteration: getVendorPrefixedEventName('animationiteration'),
  topAnimationStart: getVendorPrefixedEventName('animationstart'),
  topDrag: 'drag',
  topDragEnter: 'dragenter',
  topDragExit: 'dragexit',
  topDragLeave: 'dragleave',
  topDragOver: 'dragover',
  topLoad: 'load',
  topLoadStart: 'loadstart',
  topMouseMove: 'mousemove',
  topMouseOut: 'mouseout',
  topMouseOver: 'mouseover',
  topScroll: 'scroll',
  topToggle: 'toggle',
  topTouchMove: 'touchmove',
  topTransitionEnd: getVendorPrefixedEventName('transitionend'),
  topWheel: 'wheel',
};
const nonInteractiveTopLevelMediaEventTypes = {
  topAbort: 'abort',
  topCanPlay: 'canplay',
  topCanPlayThrough: 'canplaythrough',
  topDurationChange: 'durationchange',
  topEmptied: 'emptied',
  topEncrypted: 'encrypted',
  topEnded: 'ended',
  topError: 'error',
  topLoadedData: 'loadeddata',
  topLoadedMetadata: 'loadedmetadata',
  topPlaying: 'playing',
  topProgress: 'progress',
  topSeeking: 'seeking',
  topStalled: 'stalled',
  topSuspend: 'suspend',
  topTimeUpdate: 'timeupdate',
  topWaiting: 'waiting',
};
export let nonInteractiveEventTypeNames = [];

/**
 * Types of raw signals from the browser caught at the top level.
 *
 * For events like 'submit' or audio/video events which don't consistently
 * bubble (which we trap at a lower node than `document`), binding
 * at `document` would cause duplicate events so we don't include them here.
 */
export let topLevelTypes = {
  topChange: 'change',
  topCompositionEnd: 'compositionend',
  topCompositionStart: 'compositionstart',
  topCompositionUpdate: 'compositionupdate',
  topSelectionChange: 'selectionchange',
  topTextInput: 'textInput',
};

// There are so many media events, it makes sense to just
// maintain a list of them. Note these aren't technically
// "top-level" since they don't bubble. We should come up
// with a better naming convention if we come to refactoring
// the event system.
export let mediaEventTypes = {
  topLoadStart: 'loadstart',
};

export type TopLevelTypes =
  | $Enum<typeof topLevelTypes>
  | $Enum<typeof interactiveTopLevelEventTypes>
  | $Enum<typeof nonInteractiveTopLevelEventTypes>;

function mergeEventTypeList(inputList, eventTypeList, namesList) {
  Object.keys(inputList).forEach(topLevelEventName => {
    const capitalizedEvent = topLevelEventName.replace(/^top/, '');
    const uncapitalizedEvent =
      capitalizedEvent[0].toLowerCase() + capitalizedEvent.slice(1);
    namesList.push(uncapitalizedEvent);
    eventTypeList[topLevelEventName] = inputList[topLevelEventName];
  });
}

mergeEventTypeList(
  interactiveTopLevelEventTypes,
  topLevelTypes,
  interactiveEventTypeNames,
);
mergeEventTypeList(
  interactiveTopLevelMediaEventTypes,
  mediaEventTypes,
  interactiveEventTypeNames,
);
mergeEventTypeList(
  nonInteractiveTopLevelEventTypes,
  topLevelTypes,
  nonInteractiveEventTypeNames,
);
mergeEventTypeList(
  nonInteractiveTopLevelMediaEventTypes,
  mediaEventTypes,
  nonInteractiveEventTypeNames,
);
