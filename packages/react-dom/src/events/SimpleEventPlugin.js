/**
 * Copyright (c) 2013-present, Facebook, Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * @flow
 */

import type {TopLevelType} from 'events/TopLevelEventTypes';
import type {
  DispatchConfig,
  ReactSyntheticEvent,
} from 'events/ReactSyntheticEventType';
import type {Fiber} from 'react-reconciler/src/ReactFiber';
import type {EventTypes, PluginModule} from 'events/PluginModuleType';

import {accumulateTwoPhaseDispatches} from 'events/EventPropagators';
import SyntheticEvent from 'events/SyntheticEvent';

import * as DOMTopLevelEventTypes from './DOMTopLevelEventTypes';
import warning from 'fbjs/lib/warning';

import SyntheticAnimationEvent from './SyntheticAnimationEvent';
import SyntheticClipboardEvent from './SyntheticClipboardEvent';
import SyntheticFocusEvent from './SyntheticFocusEvent';
import SyntheticKeyboardEvent from './SyntheticKeyboardEvent';
import SyntheticMouseEvent from './SyntheticMouseEvent';
import SyntheticDragEvent from './SyntheticDragEvent';
import SyntheticTouchEvent from './SyntheticTouchEvent';
import SyntheticTransitionEvent from './SyntheticTransitionEvent';
import SyntheticUIEvent from './SyntheticUIEvent';
import SyntheticWheelEvent from './SyntheticWheelEvent';
import getEventCharCode from './getEventCharCode';

/**
 * Turns
 * ['abort', ...]
 * into
 * eventTypes = {
 *   'abort': {
 *     phasedRegistrationNames: {
 *       bubbled: 'onAbort',
 *       captured: 'onAbortCapture',
 *     },
 *     dependencies: [TOP_ABORT],
 *   },
 *   ...
 * };
 * topLevelEventsToDispatchConfig = new Map([
 *   [TOP_ABORT, { sameConfig }],
 * ]);
 */
type EventTuple = [TopLevelType, string];
const interactiveEventTypeNames: Array<EventTuple> = [
  [DOMTopLevelEventTypes.TOP_BLUR, 'onBlur'],
  [DOMTopLevelEventTypes.TOP_CANCEL, 'onCancel'],
  [DOMTopLevelEventTypes.TOP_CLICK, 'onClick'],
  [DOMTopLevelEventTypes.TOP_CLOSE, 'onClose'],
  [DOMTopLevelEventTypes.TOP_CONTEXT_MENU, 'onContextMenu'],
  [DOMTopLevelEventTypes.TOP_COPY, 'onCopy'],
  [DOMTopLevelEventTypes.TOP_CUT, 'onCut'],
  [DOMTopLevelEventTypes.TOP_DOUBLE_CLICK, 'onDoubleClick'],
  [DOMTopLevelEventTypes.TOP_DRAG_END, 'onDragEnd'],
  [DOMTopLevelEventTypes.TOP_DRAG_START, 'onDragStart'],
  [DOMTopLevelEventTypes.TOP_DROP, 'onDrop'],
  [DOMTopLevelEventTypes.TOP_FOCUS, 'onFocus'],
  [DOMTopLevelEventTypes.TOP_INPUT, 'onInput'],
  [DOMTopLevelEventTypes.TOP_INVALID, 'onInvalid'],
  [DOMTopLevelEventTypes.TOP_KEY_DOWN, 'onKeyDown'],
  [DOMTopLevelEventTypes.TOP_KEY_PRESS, 'onKeyPress'],
  [DOMTopLevelEventTypes.TOP_KEY_UP, 'onKeyUp'],
  [DOMTopLevelEventTypes.TOP_MOUSE_DOWN, 'onMouseDown'],
  [DOMTopLevelEventTypes.TOP_MOUSE_UP, 'onMouseUp'],
  [DOMTopLevelEventTypes.TOP_PASTE, 'onPaste'],
  [DOMTopLevelEventTypes.TOP_PAUSE, 'onPause'],
  [DOMTopLevelEventTypes.TOP_PLAY, 'onPlay'],
  [DOMTopLevelEventTypes.TOP_RATE_CHANGE, 'onRateChange'],
  [DOMTopLevelEventTypes.TOP_RESET, 'onReset'],
  [DOMTopLevelEventTypes.TOP_SEEKED, 'onSeeked'],
  [DOMTopLevelEventTypes.TOP_SUBMIT, 'onSubmit'],
  [DOMTopLevelEventTypes.TOP_TOUCH_CANCEL, 'onTouchCancel'],
  [DOMTopLevelEventTypes.TOP_TOUCH_END, 'onTouchEnd'],
  [DOMTopLevelEventTypes.TOP_TOUCH_START, 'onTouchStart'],
  [DOMTopLevelEventTypes.TOP_VOLUME_CHANGE, 'onVolumeChange'],
];
const nonInteractiveEventTypeNames: Array<EventTuple> = [
  [DOMTopLevelEventTypes.TOP_ABORT, 'onAbort'],
  [DOMTopLevelEventTypes.TOP_ANIMATION_END, 'onAnimationEnd'],
  [DOMTopLevelEventTypes.TOP_ANIMATION_ITERATION, 'onAnimationIteration'],
  [DOMTopLevelEventTypes.TOP_ANIMATION_START, 'onAnimationStart'],
  [DOMTopLevelEventTypes.TOP_CAN_PLAY, 'onCanPlay'],
  [DOMTopLevelEventTypes.TOP_CAN_PLAY_THROUGH, 'onCanPlayThrough'],
  [DOMTopLevelEventTypes.TOP_DRAG, 'onDrag'],
  [DOMTopLevelEventTypes.TOP_DRAG_ENTER, 'onDragEnter'],
  [DOMTopLevelEventTypes.TOP_DRAG_EXIT, 'onDragExit'],
  [DOMTopLevelEventTypes.TOP_DRAG_LEAVE, 'onDragLeave'],
  [DOMTopLevelEventTypes.TOP_DRAG_OVER, 'onDragOver'],
  [DOMTopLevelEventTypes.TOP_DURATION_CHANGE, 'onDurationChange'],
  [DOMTopLevelEventTypes.TOP_EMPTIED, 'onEmptied'],
  [DOMTopLevelEventTypes.TOP_ENCRYPTED, 'onEncrypted'],
  [DOMTopLevelEventTypes.TOP_ENDED, 'onEnded'],
  [DOMTopLevelEventTypes.TOP_ERROR, 'onError'],
  [DOMTopLevelEventTypes.TOP_LOAD, 'onLoad'],
  [DOMTopLevelEventTypes.TOP_LOADED_DATA, 'onLoadedData'],
  [DOMTopLevelEventTypes.TOP_LOADED_METADATA, 'onLoadedMetadata'],
  [DOMTopLevelEventTypes.TOP_LOAD_START, 'onLoadStart'],
  [DOMTopLevelEventTypes.TOP_MOUSE_MOVE, 'onMouseMove'],
  [DOMTopLevelEventTypes.TOP_MOUSE_OUT, 'onMouseOut'],
  [DOMTopLevelEventTypes.TOP_MOUSE_OVER, 'onMouseOver'],
  [DOMTopLevelEventTypes.TOP_PLAYING, 'onPlaying'],
  [DOMTopLevelEventTypes.TOP_PROGRESS, 'onProgress'],
  [DOMTopLevelEventTypes.TOP_SCROLL, 'onScroll'],
  [DOMTopLevelEventTypes.TOP_SEEKING, 'onSeeking'],
  [DOMTopLevelEventTypes.TOP_STALLED, 'onStalled'],
  [DOMTopLevelEventTypes.TOP_SUSPEND, 'onSuspend'],
  [DOMTopLevelEventTypes.TOP_TIME_UPDATE, 'onTimeUpdate'],
  [DOMTopLevelEventTypes.TOP_TOGGLE, 'onToggle'],
  [DOMTopLevelEventTypes.TOP_TOUCH_MOVE, 'onTouchMove'],
  [DOMTopLevelEventTypes.TOP_TRANSITION_END, 'onTransitionEnd'],
  [DOMTopLevelEventTypes.TOP_WAITING, 'onWaiting'],
  [DOMTopLevelEventTypes.TOP_WHEEL, 'onWheel'],
];

const eventTypes: EventTypes = {};
const topLevelEventsToDispatchConfig: {
  [key: TopLevelType]: DispatchConfig,
} = {};

function addEventTypeNameToConfig(
  [topEvent, onEvent]: EventTuple,
  isInteractive: boolean,
) {
  const type = {
    phasedRegistrationNames: {
      bubbled: onEvent,
      captured: onEvent + 'Capture',
    },
    dependencies: [topEvent],
    isInteractive,
  };
  eventTypes[onEvent] = type;
  topLevelEventsToDispatchConfig[topEvent] = type;
}

interactiveEventTypeNames.forEach(eventTuple => {
  addEventTypeNameToConfig(eventTuple, true);
});
nonInteractiveEventTypeNames.forEach(eventTuple => {
  addEventTypeNameToConfig(eventTuple, false);
});

// Only used in DEV for exhaustiveness validation.
const knownHTMLTopLevelTypes: Array<TopLevelType> = [
  DOMTopLevelEventTypes.TOP_ABORT,
  DOMTopLevelEventTypes.TOP_CANCEL,
  DOMTopLevelEventTypes.TOP_CAN_PLAY,
  DOMTopLevelEventTypes.TOP_CAN_PLAY_THROUGH,
  DOMTopLevelEventTypes.TOP_CLOSE,
  DOMTopLevelEventTypes.TOP_DURATION_CHANGE,
  DOMTopLevelEventTypes.TOP_EMPTIED,
  DOMTopLevelEventTypes.TOP_ENCRYPTED,
  DOMTopLevelEventTypes.TOP_ENDED,
  DOMTopLevelEventTypes.TOP_ERROR,
  DOMTopLevelEventTypes.TOP_INPUT,
  DOMTopLevelEventTypes.TOP_INVALID,
  DOMTopLevelEventTypes.TOP_LOAD,
  DOMTopLevelEventTypes.TOP_LOADED_DATA,
  DOMTopLevelEventTypes.TOP_LOADED_METADATA,
  DOMTopLevelEventTypes.TOP_LOAD_START,
  DOMTopLevelEventTypes.TOP_PAUSE,
  DOMTopLevelEventTypes.TOP_PLAY,
  DOMTopLevelEventTypes.TOP_PLAYING,
  DOMTopLevelEventTypes.TOP_PROGRESS,
  DOMTopLevelEventTypes.TOP_RATE_CHANGE,
  DOMTopLevelEventTypes.TOP_RESET,
  DOMTopLevelEventTypes.TOP_SEEKED,
  DOMTopLevelEventTypes.TOP_SEEKING,
  DOMTopLevelEventTypes.TOP_STALLED,
  DOMTopLevelEventTypes.TOP_SUBMIT,
  DOMTopLevelEventTypes.TOP_SUSPEND,
  DOMTopLevelEventTypes.TOP_TIME_UPDATE,
  DOMTopLevelEventTypes.TOP_TOGGLE,
  DOMTopLevelEventTypes.TOP_VOLUME_CHANGE,
  DOMTopLevelEventTypes.TOP_WAITING,
];

const SimpleEventPlugin: PluginModule<MouseEvent> = {
  eventTypes: eventTypes,

  isInteractiveTopLevelEventType(topLevelType: TopLevelType): boolean {
    const config = topLevelEventsToDispatchConfig[topLevelType];
    return config !== undefined && config.isInteractive === true;
  },

  extractEvents: function(
    topLevelType: TopLevelType,
    targetInst: Fiber,
    nativeEvent: MouseEvent,
    nativeEventTarget: EventTarget,
  ): null | ReactSyntheticEvent {
    const dispatchConfig = topLevelEventsToDispatchConfig[topLevelType];
    if (!dispatchConfig) {
      return null;
    }
    let EventConstructor;
    switch (topLevelType) {
      case DOMTopLevelEventTypes.TOP_KEY_PRESS:
        // Firefox creates a keypress event for function keys too. This removes
        // the unwanted keypress events. Enter is however both printable and
        // non-printable. One would expect Tab to be as well (but it isn't).
        if (getEventCharCode(nativeEvent) === 0) {
          return null;
        }
      /* falls through */
      case DOMTopLevelEventTypes.TOP_KEY_DOWN:
      case DOMTopLevelEventTypes.TOP_KEY_UP:
        EventConstructor = SyntheticKeyboardEvent;
        break;
      case DOMTopLevelEventTypes.TOP_BLUR:
      case DOMTopLevelEventTypes.TOP_FOCUS:
        EventConstructor = SyntheticFocusEvent;
        break;
      case DOMTopLevelEventTypes.TOP_CLICK:
        // Firefox creates a click event on right mouse clicks. This removes the
        // unwanted click events.
        if (nativeEvent.button === 2) {
          return null;
        }
      /* falls through */
      case DOMTopLevelEventTypes.TOP_DOUBLE_CLICK:
      case DOMTopLevelEventTypes.TOP_MOUSE_DOWN:
      case DOMTopLevelEventTypes.TOP_MOUSE_MOVE:
      case DOMTopLevelEventTypes.TOP_MOUSE_UP:
      // TODO: Disabled elements should not respond to mouse events
      /* falls through */
      case DOMTopLevelEventTypes.TOP_MOUSE_OUT:
      case DOMTopLevelEventTypes.TOP_MOUSE_OVER:
      case DOMTopLevelEventTypes.TOP_CONTEXT_MENU:
        EventConstructor = SyntheticMouseEvent;
        break;
      case DOMTopLevelEventTypes.TOP_DRAG:
      case DOMTopLevelEventTypes.TOP_DRAG_END:
      case DOMTopLevelEventTypes.TOP_DRAG_ENTER:
      case DOMTopLevelEventTypes.TOP_DRAG_EXIT:
      case DOMTopLevelEventTypes.TOP_DRAG_LEAVE:
      case DOMTopLevelEventTypes.TOP_DRAG_OVER:
      case DOMTopLevelEventTypes.TOP_DRAG_START:
      case DOMTopLevelEventTypes.TOP_DROP:
        EventConstructor = SyntheticDragEvent;
        break;
      case DOMTopLevelEventTypes.TOP_TOUCH_CANCEL:
      case DOMTopLevelEventTypes.TOP_TOUCH_END:
      case DOMTopLevelEventTypes.TOP_TOUCH_MOVE:
      case DOMTopLevelEventTypes.TOP_TOUCH_START:
        EventConstructor = SyntheticTouchEvent;
        break;
      case DOMTopLevelEventTypes.TOP_ANIMATION_END:
      case DOMTopLevelEventTypes.TOP_ANIMATION_ITERATION:
      case DOMTopLevelEventTypes.TOP_ANIMATION_START:
        EventConstructor = SyntheticAnimationEvent;
        break;
      case DOMTopLevelEventTypes.TOP_TRANSITION_END:
        EventConstructor = SyntheticTransitionEvent;
        break;
      case DOMTopLevelEventTypes.TOP_SCROLL:
        EventConstructor = SyntheticUIEvent;
        break;
      case DOMTopLevelEventTypes.TOP_WHEEL:
        EventConstructor = SyntheticWheelEvent;
        break;
      case DOMTopLevelEventTypes.TOP_COPY:
      case DOMTopLevelEventTypes.TOP_CUT:
      case DOMTopLevelEventTypes.TOP_PASTE:
        EventConstructor = SyntheticClipboardEvent;
        break;
      default:
        if (__DEV__) {
          if (knownHTMLTopLevelTypes.indexOf(topLevelType) === -1) {
            warning(
              false,
              'SimpleEventPlugin: Unhandled event type, `%s`. This warning ' +
                'is likely caused by a bug in React. Please file an issue.',
              topLevelType,
            );
          }
        }
        // HTML Events
        // @see http://www.w3.org/TR/html5/index.html#events-0
        EventConstructor = SyntheticEvent;
        break;
    }
    const event = EventConstructor.getPooled(
      dispatchConfig,
      targetInst,
      nativeEvent,
      nativeEventTarget,
    );
    accumulateTwoPhaseDispatches(event);
    return event;
  },
};

export default SimpleEventPlugin;
